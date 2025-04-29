import { CameraUniformGroup, UnlitEntityStruct } from '@timefold/engine';
import { Uniform, WebgpuUtils } from '@timefold/webgpu';
import { defineMaterialTemplate } from './webgpu-renderer';

type Args = {
    device: GPUDevice;
    sceneUniforms: { camera: ArrayBufferLike };
    vertexWgsl: string;
};

export const createUnlitMaterialTemplate = (args: Args) => {
    const UnlitEntityUniformGroup = Uniform.group(1, { entity: Uniform.buffer(0, UnlitEntityStruct) });

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device: args.device,
        uniformGroups: [CameraUniformGroup, UnlitEntityUniformGroup],
    });

    const sceneBindGroups = PipelineLayout.createBindGroups(0, {
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    const code = /* wgsl */ `
        ${args.vertexWgsl}

        ${Uniform.getWgslFromGroups([CameraUniformGroup, UnlitEntityUniformGroup])}

        @vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
            return camera.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
        }

        @fragment fn fs() -> @location(0) vec4f {
            return vec4f(entity.material.color, 1.0);
        }
    `.trim();

    return defineMaterialTemplate({
        layout: PipelineLayout.layout,
        sceneBindGroups,
        sceneUniforms: args.sceneUniforms,
        module: args.device.createShaderModule({ code }),
        createEntityBindGroups: () =>
            PipelineLayout.createBindGroups(1, {
                entity: WebgpuUtils.createBufferDescriptor(),
            }),
    });
};
