import { Mat4x4, MathUtils, Vec3, Vec3Type } from '@timefold/math';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Entity } from './entity';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

/* eslint-disable prettier/prettier */
const triangle = new Float32Array([
     1.0, -1.0, 0.0, 1.0, 0.0,
     0.0,  1.0, 0.0, 0.5, 1.0,
    -1.0, -1.0, 0.0, 0.0, 0.0,
]);
/* eslint-enable prettier/prettier */

const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });
const EntityStruct = Wgsl.struct('Entity', { model_matrix: Wgsl.type('mat4x4<f32>'), color: Wgsl.type('vec3<f32>') });

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.buffer(0, SceneStruct),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.buffer(0, EntityStruct),
    color_map_sampler: Uniform.sampler(1, {
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
    }),
    color_map_texture: Uniform.texture(2, {
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
    }),
});

const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', stride: 0 },
    uv: { format: 'float32x2', stride: 3 },
});

const shaderCode = /* wgsl */ `
${Vertex.wgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

@vertex fn vs(vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    return vsOut;
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    return textureSample(color_map_texture, color_map_sampler, fsIn.uv);
}
`.trim();

const createEntity = (bindgroup: GPUBindGroup, buffer: GPUBuffer, position: Vec3Type, color: Vec3Type): Entity => {
    const { buffer: data, views } = EntityStruct.create();
    Mat4x4.fromTranslation(views.model_matrix, position);
    Vec3.copy(views.color, color);

    return {
        data,
        modelMatrix: views.model_matrix,
        color: views.color,
        buffer,
        bindgroup,
    };
};

const run = async () => {
    // adapter, device, context, module
    const uvGrid = await fetch('./uv-grid.jpg')
        .then((res) => res.blob())
        .then((blob) => createImageBitmap(blob));

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    // pipeline layout

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.layout,
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
    });

    // render pass

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    // scene

    const { buffer: sceneData, views } = SceneStruct.create();
    const view = Mat4x4.createLookAt([2, 2, 5], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
    Mat4x4.multiplication(views.view_projection_matrix, proj, view);
    const Scene = PipelineLayout.createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });

    // geometry

    const P = Vertex.createBuffer(device, triangle);

    // entity data

    const entities: Entity[] = [];
    const E1 = PipelineLayout.createBindGroups(1, {
        entity: WebgpuUtils.createBufferDescriptor(),
        color_map_sampler: WebgpuUtils.createSampler(device),
        color_map_texture: WebgpuUtils.createImageBitmapTexture(device, uvGrid),
    });

    const E2 = PipelineLayout.createBindGroups(1, {
        entity: WebgpuUtils.createBufferDescriptor(),
        color_map_sampler: WebgpuUtils.createSampler(device),
        color_map_texture: WebgpuUtils.createImageBitmapTexture(device, uvGrid),
    });

    entities.push(
        createEntity(E1.bindGroup, E1.buffers.entity, [-2, 0, 0], [1, 0, 0]),
        createEntity(E2.bindGroup, E2.buffers.entity, [2, 0, 0], [0, 1, 0]),
    );

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(P.slot, P.buffer);

        pass.setBindGroup(0, Scene.bindGroup);
        device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

        for (const entity of entities) {
            pass.setBindGroup(1, entity.bindgroup);
            device.queue.writeBuffer(entity.buffer, 0, entity.data);
            pass.draw(P.count);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    render();
};

void run();
