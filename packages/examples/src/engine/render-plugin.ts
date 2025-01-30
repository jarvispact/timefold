import { createPlugin, createSystem } from '@timefold/ecs';
import { Structs } from '@timefold/engine';
import { Uniform, WebgpuUtils } from '@timefold/webgpu';
import { cubeVertices, stride } from './cube';
import { world, World } from './world';

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.buffer(0, Structs.Scene),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.buffer(0, Structs.PhongEntity),
});

const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', offset: 0 },
    uv: { format: 'float32x2', offset: 5 },
    normal: { format: 'float32x3', offset: 3 },
});

const shaderCode = /* wgsl */ `
${Vertex.wgsl}
 
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) world_pos: vec3f,
};

${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

@vertex fn vs(
  vert: Vertex
) -> VSOutput {
    var vsOut: VSOutput;
    let world_pos = entity.transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.position = scene.camera.view_projection_matrix * world_pos;
    vsOut.uv = vert.uv;
    vsOut.normal = (entity.transform.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    vsOut.world_pos = world_pos.xyz;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let N = normalize(vsOut.normal);

    var diffuse_color = entity.material.diffuse_color;

    let ambientFactor = 0.1;
    let ambient = diffuse_color * ambientFactor;

    var lighting = vec3f(0.0, 0.0, 0.0);

    for (var i = 0; i < ${Structs.MAX_DIR_LIGHTS}; i++) {
        let L = normalize(scene.dirLights[i].direction);

        let diff = max(dot(N, L), 0.0);
        let diffuse = diff * scene.dirLights[i].color * scene.dirLights[i].intensity * diffuse_color;
    
        let view_dir = normalize(scene.camera.position - vsOut.world_pos);
        let halfway_dir = normalize(L + view_dir);
        let spec = pow(max(dot(N, halfway_dir), 0.0), 512.0);
        let specular = spec * scene.dirLights[i].color * scene.dirLights[i].intensity * entity.material.specular_color;

        lighting += (diffuse + specular);
    }

    return vec4f(ambient + lighting, entity.material.opacity);
}
`.trim();

export const createRenderPlugin = async (canvas: HTMLCanvasElement) => {
    const { context, device, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const { layout, createBindGroups } = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const scene = createBindGroups(0, {
        scene: WebgpuUtils.createBufferDescriptor(),
    });

    const vertexBuffer = device.createBuffer({
        label: 'vertex buffer vertices',
        size: cubeVertices.buffer.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const vertexCount = cubeVertices.length / stride;
    device.queue.writeBuffer(vertexBuffer, 0, cubeVertices.buffer);

    const renderPassDescriptor: WebgpuUtils.RenderPassDescriptor = {
        label: 'canvas renderPass',
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    const pipeline = device.createRenderPipeline({
        label: 'pipeline',
        layout,
        primitive: { cullMode: 'back' },
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
    });

    const query = world.createQuery(
        {
            tuple: [
                { has: '@tf/Data' },
                { has: '@tf/Transform', include: false },
                { has: '@tf/PhongMaterial', include: false },
            ],
        },
        {
            map: ([data]) => {
                const { bindGroup, buffers } = createBindGroups(1, {
                    entity: WebgpuUtils.createBufferDescriptor(),
                });

                return {
                    bindGroup,
                    buffer: buffers.entity,
                    data: data.data,
                };
            },
        },
    );

    const sceneCreateResult = world.getResource('scene').data;

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, vertexBuffer);

        pass.setBindGroup(0, scene.bindGroup);
        device.queue.writeBuffer(scene.buffers.scene, 0, sceneCreateResult.buffer);

        for (const item of query) {
            pass.setBindGroup(1, item.bindGroup);
            device.queue.writeBuffer(item.buffer, 0, item.data);
            pass.draw(vertexCount);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    const RenderSystem = createSystem({ stage: 'render', fn: render });

    return createPlugin<World>({
        fn: (world) => {
            world.registerSystems(RenderSystem);
        },
    });
};
