import { RenderPassDescriptor, Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Vec3, Mat4x4, MathUtils } from '@timefold/math';
import { cubeVertices } from './cube';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const Scene = Wgsl.struct('Scene', {
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
    sun_direction: Wgsl.type('vec3<f32>'),
    sun_color: Wgsl.type('vec3<f32>'),
});

const Entity = Wgsl.struct('Entity', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.buffer(0, Scene, {
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
    }),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.buffer(0, Entity, {
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
    }),
});

const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', stride: 0 },
    normal: { format: 'float32x3', stride: 3 },
    uv: { format: 'float32x2', stride: 5 },
});

const shaderCode = /* wgsl */ `
${Vertex.wgsl}
 
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
};

${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

@vertex fn vs(
  vert: Vertex
) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
    vsOut.normal = (entity.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let N = normalize(vsOut.normal);
    let L = normalize(scene.sun_direction);
    let ambient = entity.color * 0.1;
    let diff = max(dot(N, L), 0.0);
    let diffuse = max(dot(N, L), 0.0) * scene.sun_color * entity.color;
    return vec4f(ambient + diffuse, 1.0);
}
`.trim();

const run = async () => {
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const Pipeline = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const sceneBindgroup = Pipeline.createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });
    const entityBindgroup = Pipeline.createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });
    const { buffer, count, slot } = Vertex.createBuffer(device, cubeVertices);

    const renderPassDescriptor: RenderPassDescriptor = {
        label: 'canvas renderPass',
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    const pipeline = device.createRenderPipeline({
        layout: Pipeline.layout,
        primitive: { cullMode: 'back' },
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
    });

    const scene = Scene.create();
    const entity = Entity.create();

    const view = Mat4x4.createLookAt(Vec3.create(2, 2, 5), Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0.1);
    Mat4x4.multiplication(scene.views.view_projection_matrix, proj, view);

    Vec3.normalization(scene.views.sun_direction, Vec3.create(2, 3, 4));
    Vec3.set(scene.views.sun_color, 1, 1, 1);

    Mat4x4.fromTranslation(entity.views.model_matrix, Vec3.zero());
    Mat4x4.modelToNormal(entity.views.normal_matrix, entity.views.normal_matrix);
    Vec3.set(entity.views.color, 0.965, 0.447, 0.502);

    const render = (time: number) => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(slot, buffer);

        pass.setBindGroup(sceneBindgroup.group, sceneBindgroup.bindGroup);
        device.queue.writeBuffer(sceneBindgroup.buffers.scene, 0, scene.buffer);

        Mat4x4.identity(entity.views.model_matrix);
        Mat4x4.translate(entity.views.model_matrix, [0, Math.sin(time * 0.01) * 0.05, 0]);
        Mat4x4.rotateY(entity.views.model_matrix, time * 0.001);
        Mat4x4.modelToNormal(entity.views.normal_matrix, entity.views.model_matrix);

        pass.setBindGroup(entityBindgroup.group, entityBindgroup.bindGroup);
        device.queue.writeBuffer(entityBindgroup.buffers.entity, 0, entity.buffer);
        pass.draw(count);

        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
};

void run();
