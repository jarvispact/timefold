import { Uniform, WebgpuUtils, defineMaterialTemplate } from '@timefold/webgpu';
import { CameraStruct, UnlitEntityStruct } from '@timefold/engine';

type Args = {
    device: GPUDevice;
    uniforms: { camera: ArrayBufferLike };
    vertexWgsl: string;
};

export const defineUnlitMaterialTemplate = ({ device, uniforms, vertexWgsl }: Args) => {
    const CameraGroup = Uniform.group(0, {
        camera: Uniform.buffer(0, CameraStruct),
    });

    const EntityGroup = Uniform.group(1, {
        entity: Uniform.buffer(0, UnlitEntityStruct),
        color_sampler: Uniform.sampler(1),
        color_map: Uniform.texture(2),
    });

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device: device,
        uniformGroups: [CameraGroup, EntityGroup],
    });

    const cameraGroup = PipelineLayout.createBindGroups(0, {
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    const code = /* wgsl */ `
${vertexWgsl}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

${Uniform.getWgslFromGroups([CameraGroup, EntityGroup])}

@vertex fn vs(vert: Vertex) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = camera.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let texture_sample = textureSample(color_map, color_sampler, vsOut.uv);

    var alpha: f32 = entity.material.opacity;
    if (entity.material.use_colormap_alpha >= 1) {
        alpha = texture_sample.a;
    }

    return vec4f(entity.material.color * texture_sample.rgb, alpha);
}
    `.trim();

    return {
        PipelineLayout,
        MaterialTemplate: defineMaterialTemplate({
            layout: PipelineLayout.layout,
            bindGroups: { cameraGroup },
            uniforms: { cameraGroup: { camera: uniforms.camera } },
            module: device.createShaderModule({ code }),
            blend: WebgpuUtils.getBlendState('transparent'),
        }),
    };
};
