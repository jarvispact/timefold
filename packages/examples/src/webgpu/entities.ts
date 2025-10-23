import { DomUtils, ImageLoader } from '@timefold/engine';
import { Mat4x4, Mat4x4Type, MathUtils, Vec3, Vec3Type } from '@timefold/math';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { quadIndices, quadInterleavedIndexed } from './common';

type Entity = {
    data: ArrayBuffer;
    modelMatrix: Mat4x4Type;
    color: Vec3Type;
    buffer: GPUBuffer;
    bindgroup: GPUBindGroup;
};

const canvas = DomUtils.getCanvasById('canvas');

const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });
const EntityStruct = Wgsl.struct('Entity', { model_matrix: Wgsl.type('mat4x4<f32>'), color: Wgsl.type('vec3<f32>') });

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.uniformBuffer(0, SceneStruct),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.uniformBuffer(0, EntityStruct),
    color_map_sampler: Uniform.sampler(1),
    color_map_texture: Uniform.texture(2),
});

// pipeline layout

const PipelineLayout = WebgpuUtils.createPipelineLayout({
    bindGroupLayoutLabel: 'Entity Pipeline BGL',
    pipelineLayoutLabel: 'Entity Pipeline PL',
    uniformGroups: [SceneUniformGroup, EntityUniformGroup],
});

const VertexInterleaved = WebgpuUtils.createVertexBufferLayout({
    label: 'Simple Quad Layout',
    mode: 'interleaved',
    definition: {
        position: { format: 'float32x3', stride: 0 },
        uv: { format: 'float32x2', stride: 3 },
    },
});

const shaderCode = /* wgsl */ `
${VertexInterleaved.wgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

${Uniform.getWgslFromGroups(PipelineLayout.uniformGroups)}

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

let then = 0;
function getDelta(now: number) {
    now *= 0.001;
    const delta = now - then;
    then = now;
    return delta;
}

const run = async () => {
    const [fRed, fGreen, fBlue, fYellow] = await Promise.all([
        ImageLoader.loadImage('./f-red.png'),
        ImageLoader.loadImage('./f-green.png'),
        ImageLoader.loadImage('./f-blue.png'),
        ImageLoader.loadImage('./f-yellow.png'),
    ]);

    // adapter, device, context, module
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const colorTexture = device.createTexture({
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: [canvas.width, canvas.height],
        sampleCount: 4,
    });

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.createLayout(device),
        vertex: { module: module, buffers: VertexInterleaved.layout },
        fragment: { module: module, targets: [{ format }] },
        multisample: { count: 4 },
    });

    // render pass

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
    };

    // scene

    const { buffer: sceneData, views } = SceneStruct.create();
    const view = Mat4x4.createLookAt([0, 0, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
    Mat4x4.multiplication(views.view_projection_matrix, proj, view);
    const Scene = PipelineLayout.createBindGroups({
        device,
        group: 0,
        bindings: {
            scene: WebgpuUtils.createUniformBufferDescriptor({ label: 'Scene Uniform Buffer' }),
        },
    });

    // geometry

    const P = VertexInterleaved.createBuffer(device, quadInterleavedIndexed);
    const I = WebgpuUtils.createIndexBuffer({
        device,
        format: 'uint16',
        data: quadIndices,
        label: 'Simple Quad Index Buffer',
    });

    // entity data

    const entities: Entity[] = [];
    const E1 = PipelineLayout.createBindGroups({
        device,
        group: 1,
        bindings: {
            entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 1 Uniform Buffer' }),
            color_map_sampler: WebgpuUtils.createSampler({ device, label: 'Entity 1 Sampler' }),
            color_map_texture: WebgpuUtils.createImageBitmapTexture({ device, image: fRed, label: 'Entity 1 Texture' }),
        },
    });

    const E2 = PipelineLayout.createBindGroups({
        device,
        group: 1,
        bindings: {
            entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 2 Uniform Buffer' }),
            color_map_sampler: WebgpuUtils.createSampler({ device, label: 'Entity 2 Sampler' }),
            color_map_texture: WebgpuUtils.createImageBitmapTexture({
                device,
                image: fGreen,
                label: 'Entity 2 Texture',
            }),
        },
    });

    const E3 = PipelineLayout.createBindGroups({
        device,
        group: 1,
        bindings: {
            entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 3 Uniform Buffer' }),
            color_map_sampler: WebgpuUtils.createSampler({ device, label: 'Entity 3 Sampler' }),
            color_map_texture: WebgpuUtils.createImageBitmapTexture({
                device,
                image: fBlue,
                label: 'Entity 3 Texture',
            }),
        },
    });

    const E4 = PipelineLayout.createBindGroups({
        device,
        group: 1,
        bindings: {
            entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 4 Uniform Buffer' }),
            color_map_sampler: WebgpuUtils.createSampler({ device, label: 'Entity 4 Sampler' }),
            color_map_texture: WebgpuUtils.createImageBitmapTexture({
                device,
                image: fYellow,
                label: 'Entity 4 Texture',
            }),
        },
    });

    entities.push(
        createEntity(E1.bindGroup, E1.buffers.entity, [-2, -2, 0], [1, 0, 0]),
        createEntity(E2.bindGroup, E2.buffers.entity, [2, -2, 0], [0, 1, 0]),
        createEntity(E3.bindGroup, E3.buffers.entity, [2, 2, 0], [0, 1, 0]),
        createEntity(E4.bindGroup, E4.buffers.entity, [-2, 2, 0], [0, 1, 0]),
    );

    const render = (time: number) => {
        const delta = getDelta(time);
        renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(0, Scene.bindGroup);
        device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(P.slot, P.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        for (const entity of entities) {
            Mat4x4.rotateY(entity.modelMatrix, MathUtils.degreesToRadians(90) * delta);
            pass.setBindGroup(1, entity.bindgroup);
            device.queue.writeBuffer(entity.buffer, 0, entity.data);
            pass.drawIndexed(I.count);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
        window.requestAnimationFrame(render);
    };

    window.requestAnimationFrame(render);
};

void run();
