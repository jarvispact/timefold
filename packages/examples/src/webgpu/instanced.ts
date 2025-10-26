import { DomUtils, ImageLoader } from '@timefold/engine';
import { Mat4x4, Mat4x4Type, MathUtils, Vec3 } from '@timefold/math';
import { InferWgslArrayResult, Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { quadIndices, quadInterleavedIndexed } from './common';

type InstanceData = { model_matrix: Mat4x4Type; texture_index: number };

const canvas = DomUtils.getCanvasById('canvas');

const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });

// Instance data struct for the storage buffer
const InstanceStruct = Wgsl.struct('InstanceData', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    texture_index: Wgsl.type('u32'),
});

const InstanceStructArray = Wgsl.runtimeSizedArray(InstanceStruct, 4000);

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.uniformBuffer(0, SceneStruct),
    instance_data: Uniform.storageBuffer(1, InstanceStructArray),
});

const TextureUniformGroup = Uniform.group(1, {
    color_map_sampler: Uniform.sampler(0),
    color_map_textures: Uniform.texture(1, {
        texture: { viewDimension: '2d-array' },
        visibility: GPUShaderStage.FRAGMENT,
    }),
});

// Pipeline layout
const PipelineLayout = WebgpuUtils.createPipelineLayout({
    bindGroupLayoutLabel: 'Instanced Pipeline BGL',
    pipelineLayoutLabel: 'Instanced Pipeline PL',
    uniformGroups: [SceneUniformGroup, TextureUniformGroup],
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
    @location(1) @interpolate(flat) texture_index: u32,
}

${Uniform.getWgslFromGroups(PipelineLayout.uniformGroups)}

@vertex fn vs(vert: Vertex, @builtin(instance_index) instance_id: u32) -> VsOut {
    let instance = instance_data[instance_id];

    var vsOut: VsOut;
    vsOut.position = scene.view_projection_matrix * instance.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    vsOut.texture_index = instance.texture_index;
    return vsOut;
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    return textureSample(color_map_textures, color_map_sampler, fsIn.uv, fsIn.texture_index);
}
`.trim();

console.log(shaderCode);

let then = 0;
function getDelta(now: number) {
    now *= 0.001;
    const delta = now - then;
    then = now;
    return delta;
}

const createInstanceData = (data: InstanceData[]): InferWgslArrayResult<typeof InstanceStructArray> => {
    const instance = InstanceStructArray.create();

    for (let i = 0; i < data.length; i++) {
        Mat4x4.copy(instance.views[i].model_matrix, data[i].model_matrix);
        instance.views[i].texture_index[0] = data[i].texture_index;
    }

    return instance;
};

const run = async () => {
    const [fRed, fGreen, fBlue, fYellow] = await Promise.all([
        ImageLoader.loadImage('./f-red.png'),
        ImageLoader.loadImage('./f-green.png'),
        ImageLoader.loadImage('./f-blue.png'),
        ImageLoader.loadImage('./f-yellow.png'),
    ]);

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const createColorTexture = () =>
        device.createTexture({
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            size: [canvas.width, canvas.height],
            sampleCount: 4,
        });

    let colorTexture = createColorTexture();

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.createLayout(device),
        vertex: { module: module, buffers: VertexInterleaved.layout },
        fragment: { module: module, targets: [{ format }] },
        multisample: { count: 4 },
    });

    // Render pass
    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
    };

    // Scene setup
    const { buffer: sceneData, views: sceneViews } = SceneStruct.create();
    const view = Mat4x4.createLookAt([0, 0, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0.1, 100);
    Mat4x4.multiplication(sceneViews.view_projection_matrix, proj, view);

    DomUtils.onResize({
        canvas,
        fn: (width, height) => {
            colorTexture.destroy();
            colorTexture = createColorTexture();
            renderPassDescriptor.colorAttachments[0] = WebgpuUtils.createColorAttachmentFromView(
                colorTexture.createView(),
            );

            const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), width / height, 0);
            Mat4x4.multiplication(sceneViews.view_projection_matrix, proj, view);
        },
    });

    // Instance data setup
    const instances: InstanceData[] = [
        { model_matrix: Mat4x4.fromTranslation(Mat4x4.create(), [-2, -2, 0]), texture_index: 0 },
        { model_matrix: Mat4x4.fromTranslation(Mat4x4.create(), [2, -2, 0]), texture_index: 1 },
        { model_matrix: Mat4x4.fromTranslation(Mat4x4.create(), [2, 2, 0]), texture_index: 2 },
        { model_matrix: Mat4x4.fromTranslation(Mat4x4.create(), [-2, 2, 0]), texture_index: 3 },
    ];

    const { buffer: instanceBuffer, views: instanceViews } = createInstanceData(instances);

    // Create bind groups
    const SceneBindGroup = PipelineLayout.createBindGroups({
        device,
        group: 0,
        bindings: {
            scene: WebgpuUtils.createUniformBufferDescriptor({ label: 'Scene Uniform Buffer' }),
            instance_data: WebgpuUtils.createStorageBufferDescriptor({
                label: 'Instance Data Buffer',
            }),
        },
    });

    const TextureBindGroup = PipelineLayout.createBindGroups({
        device,
        group: 1,
        bindings: {
            color_map_sampler: WebgpuUtils.createSampler({ device, label: 'Color Map Sampler' }),
            color_map_textures: WebgpuUtils.createImageBitmapTextureArray({
                device,
                images: [fRed, fGreen, fBlue, fYellow],
                label: 'Color Map Texture Array',
            }),
        },
    });

    // Geometry
    const P = VertexInterleaved.createBuffer(device, quadInterleavedIndexed);
    const I = WebgpuUtils.createIndexBuffer({
        device,
        format: 'uint16',
        data: quadIndices,
        label: 'Quad Index Buffer',
    });

    // Upload initial instance data
    device.queue.writeBuffer(SceneBindGroup.buffers.instance_data, 0, instanceBuffer);

    const render = (time: number) => {
        const delta = getDelta(time);

        renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        // Upload updated data
        device.queue.writeBuffer(SceneBindGroup.buffers.scene, 0, sceneData);
        device.queue.writeBuffer(SceneBindGroup.buffers.instance_data, 0, instanceBuffer);

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, SceneBindGroup.bindGroup);
        pass.setBindGroup(1, TextureBindGroup.bindGroup);

        pass.setVertexBuffer(P.slot, P.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        for (const entity of instanceViews) {
            Mat4x4.rotateY(entity.model_matrix, MathUtils.degreesToRadians(90) * delta);
        }

        // Draw all instances in one call
        pass.drawIndexed(I.count, instances.length);

        pass.end();
        device.queue.submit([encoder.finish()]);
        window.requestAnimationFrame(render);
    };

    window.requestAnimationFrame(render);
};

void run();
