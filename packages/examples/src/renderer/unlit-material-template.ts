import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { defineMaterialTemplate } from './webgpu-renderer';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';

type Args = {
    device: GPUDevice;
    renderTexture: GPUTexture;
    info: InterleavedInfo;
    planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>;
    vertexWgsl: string;
};

export const createUnlitMaterialTemplate = (args: Args) => {
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

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device: args.device,
        uniformGroups: [CameraUniformGroup, UnlitEntityUniformGroup],
    });

    const materialBindGroups = PipelineLayout.createBindGroups(0, {
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    const camera = CameraStruct.create();
    const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(
        MathUtils.degreesToRadians(65),
        args.renderTexture.width / args.renderTexture.height,
        0,
    );
    Mat4x4.multiplication(camera.views.view_projection_matrix, proj, view);

    const code = /* wgsl */ `
        ${args.vertexWgsl}

        ${Uniform.getWgslFromGroups([CameraUniformGroup, UnlitEntityUniformGroup])}

        @vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
            return camera.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
        }

        @fragment fn fs() -> @location(0) vec4f {
            return vec4f(entity.color, 1.0);
        }
    `.trim();

    return {
        materialTemplate: defineMaterialTemplate({
            layout: PipelineLayout.layout,
            materialBindGroups,
            module: args.device.createShaderModule({ code }),
            uniforms: {
                camera: camera.buffer,
            },
        }),
        PipelineLayout,
        UnlitEntityStruct,
    };
};
