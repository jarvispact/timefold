import { Uniform, WebgpuUtils } from '@timefold/webgpu';
import { defineMaterialTemplate } from './webgpu-renderer';
import { CameraStruct, UnlitEntityStruct } from '@timefold/engine';

type Args = {
    device: GPUDevice;
    uniforms: { camera: ArrayBufferLike };
    vertexWgsl: string;
};

export const defineUnlitMaterialTemplate = (args: Args) => {
    const CameraGroup = Uniform.group(0, {
        camera: Uniform.buffer(0, CameraStruct),
    });

    const EntityGroup = Uniform.group(1, {
        entity: Uniform.buffer(0, UnlitEntityStruct),
    });

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device: args.device,
        uniformGroups: [CameraGroup, EntityGroup],
    });

    const cameraGroup = PipelineLayout.createBindGroups(0, {
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    const code = /* wgsl */ `
${args.vertexWgsl}

${Uniform.getWgslFromGroups([CameraGroup, EntityGroup])}

@vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
    return camera.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
    return vec4f(entity.material.color, 1.0);
}
    `.trim();

    return defineMaterialTemplate({
        layout: PipelineLayout.layout,
        bindGroups: { cameraGroup },
        uniforms: { cameraGroup: { camera: args.uniforms.camera } },
        module: args.device.createShaderModule({ code }),
        createEntityBindGroups: () =>
            PipelineLayout.createBindGroups(1, {
                entity: WebgpuUtils.createBufferDescriptor(),
            }),
    });
};
