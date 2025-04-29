import { CameraStruct, DirLightStructArray, PhongEntityStruct } from '@timefold/engine';
import { Uniform, WebgpuUtils } from '@timefold/webgpu';
import { defineMaterialTemplate } from './webgpu-renderer';

type Args = {
    device: GPUDevice;
    uniforms: { lights: ArrayBufferLike; camera: ArrayBufferLike };
    vertexWgsl: string;
};

export const definePhongMaterialTemplate = (args: Args) => {
    const LightsGroup = Uniform.group(0, {
        dir_lights: Uniform.buffer(0, DirLightStructArray),
    });

    const CameraGroup = Uniform.group(1, {
        camera: Uniform.buffer(0, CameraStruct),
    });

    const EntityGroup = Uniform.group(2, {
        entity: Uniform.buffer(0, PhongEntityStruct),
    });

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device: args.device,
        uniformGroups: [LightsGroup, CameraGroup, EntityGroup],
    });

    const phongShaderCode = /* wgsl */ `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
};

${args.vertexWgsl}

${Uniform.getWgslFromGroups([LightsGroup, CameraGroup, EntityGroup])}

@vertex fn vs(vert: Vertex) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = camera.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    vsOut.normal = (entity.transform.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let N = normalize(vsOut.normal);
    let L = normalize(dir_lights[0].direction);
    let ambient = entity.material.diffuse_color * 0.1;
    let diff = max(dot(N, L), 0.0);
    let diffuse = diff * dir_lights[0].color * entity.material.diffuse_color;
    return vec4f(ambient + diffuse, 1.0);
}
    `.trim();

    const module = args.device.createShaderModule({ code: phongShaderCode });

    const lightsGroup = PipelineLayout.createBindGroups(0, {
        dir_lights: WebgpuUtils.createBufferDescriptor(),
    });

    const cameraGroup = PipelineLayout.createBindGroups(1, {
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    return defineMaterialTemplate({
        layout: PipelineLayout.layout,
        bindGroups: { lightsGroup, cameraGroup },
        uniforms: {
            lightsGroup: { dir_lights: args.uniforms.lights },
            cameraGroup: { camera: args.uniforms.camera },
        },
        module,
        createEntityBindGroups: () =>
            PipelineLayout.createBindGroups(2, {
                entity: WebgpuUtils.createBufferDescriptor(),
            }),
    });
};
