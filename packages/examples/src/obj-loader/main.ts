import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Vec3, Mat4x4, MathUtils } from '@timefold/math';
import { ObjLoader } from '@timefold/obj';

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

const shaderCode = /* wgsl */ `
struct Vertex {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
}
 
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
    const { objects, info } = await ObjLoader.createLoader().load('./suzanne.obj');
    const suzanne = objects[0].primitives[0];

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const { layout, createBindGroups } = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const sceneBindgroup = createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });
    const entityBindgroup = createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });

    const result = WebgpuUtils.createVertexBuffers(device, 'interleaved', {
        data: suzanne.vertices,
        stride: info.stride,
        attributes: {
            position: { format: 'float32x3', offset: info.positionOffset },
            normal: { format: 'float32x3', offset: info.normalOffset },
        },
    });

    const indexResult = WebgpuUtils.createIndexBuffer(device, {
        format: 'uint16',
        data: new Uint16Array(suzanne.indices),
    });

    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPassDescriptor: WebgpuUtils.RenderPassDescriptor = {
        label: 'canvas renderPass',
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
        depthStencilAttachment: {
            view: depthTexture.createView(),

            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };

    const pipeline = device.createRenderPipeline({
        label: 'pipeline',
        layout,
        primitive: { cullMode: 'back' },
        vertex: { module: module, buffers: result.layout },
        fragment: { module: module, targets: [{ format }] },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
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
        pass.setVertexBuffer(result.slot, result.buffer);
        pass.setIndexBuffer(indexResult.indexBuffer, indexResult.format);

        pass.setBindGroup(0, sceneBindgroup.bindGroup);
        device.queue.writeBuffer(sceneBindgroup.buffers.scene, 0, scene.buffer);

        Mat4x4.identity(entity.views.model_matrix);
        Mat4x4.translate(entity.views.model_matrix, [0, Math.sin(time * 0.01) * 0.05, 0]);
        Mat4x4.rotateY(entity.views.model_matrix, time * 0.001);
        Mat4x4.modelToNormal(entity.views.normal_matrix, entity.views.model_matrix);

        pass.setBindGroup(1, entityBindgroup.bindGroup);
        device.queue.writeBuffer(entityBindgroup.buffers.entity, 0, entity.buffer);
        pass.drawIndexed(indexResult.indexCount);

        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
};

void run();
