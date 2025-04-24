import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { RenderPipelineContext } from './render-pipeline';

const CameraStruct = Wgsl.struct('Camera', {
    translation: Wgsl.type('vec3<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const UnlitEntityStruct = Wgsl.struct('UnlitEntityStruct', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const CameraUniformGroup = Uniform.group(0, { camera: Uniform.buffer(0, CameraStruct) });

const UnlitEntityUniformGroup = Uniform.group(1, { entity: Uniform.buffer(0, UnlitEntityStruct) });

type AdditionalContext = {
    info: InterleavedInfo;
    planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>;
    renderTexture: GPUTexture;
};

const getFormatForIndices = (indices: Uint16Array | Uint32Array) => {
    if (indices instanceof Uint16Array) return 'uint16';
    return 'uint32';
};

export const createUnlitRenderer = (ctx: RenderPipelineContext<[], AdditionalContext>) => {
    const { device, format, info, planePrimitive, renderTexture } = ctx.args;

    const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
        position: { format: 'float32x3', offset: info.positionOffset },
        uv: { format: 'float32x2', offset: info.uvOffset },
        normal: { format: 'float32x3', offset: info.normalOffset },
    });

    const UnlitPipelineLayout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [CameraUniformGroup, UnlitEntityUniformGroup],
    });

    const unlitShaderCode = /* wgsl */ `
        ${Vertex.wgsl}

        ${Uniform.getWgslFromGroups([CameraUniformGroup, UnlitEntityUniformGroup])}

        @vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
            return camera.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
        }

        @fragment fn fs() -> @location(0) vec4f {
            return vec4f(entity.color, 1.0);
        }
    `.trim();

    const unlitModule = device.createShaderModule({ code: unlitShaderCode });

    const unlitPipeline = device.createRenderPipeline({
        layout: UnlitPipelineLayout.layout,
        vertex: {
            module: unlitModule,
            buffers: Vertex.layout,
        },
        fragment: {
            module: unlitModule,
            targets: [{ format }],
        },
    });

    const V = Vertex.createBuffer(device, planePrimitive.vertices);
    const I = WebgpuUtils.createIndexBuffer(device, {
        data: planePrimitive.indices,
        format: getFormatForIndices(planePrimitive.indices),
    });

    const Camera = UnlitPipelineLayout.createBindGroups(0, {
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    const camera = CameraStruct.create();
    const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(
        MathUtils.degreesToRadians(65),
        renderTexture.width / renderTexture.height,
        0,
    );
    Mat4x4.multiplication(camera.views.view_projection_matrix, proj, view);

    const UnlitEntity = UnlitPipelineLayout.createBindGroups(1, {
        entity: WebgpuUtils.createBufferDescriptor(),
    });

    const unlitEntity = UnlitEntityStruct.create();
    Mat4x4.fromTranslation(unlitEntity.views.model_matrix, [-2, 0, 0]);
    Vec3.copy(unlitEntity.views.color, [1, 0, 0]);

    const render = (pass: GPURenderPassEncoder) => {
        pass.setPipeline(unlitPipeline);

        pass.setBindGroup(Camera.group, Camera.bindGroup);
        device.queue.writeBuffer(Camera.buffers.camera, 0, camera.buffer);

        pass.setVertexBuffer(0, V.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        pass.setBindGroup(UnlitEntity.group, UnlitEntity.bindGroup);
        device.queue.writeBuffer(UnlitEntity.buffers.entity, 0, unlitEntity.buffer);
        pass.drawIndexed(I.count);
    };

    return { render };
};
