import { PhongEntityStruct } from '@timefold/engine';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { defineMaterialTemplate } from './webgpu-renderer';

type Args = {
    device: GPUDevice;
    renderTexture: GPUTexture;
    info: InterleavedInfo;
    planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>;
    vertexWgsl: string;
};

export const createPhongMaterialTemplate = (args: Args) => {
    const LightStruct = Wgsl.struct('Light', {
        direction: Wgsl.type('vec3<f32>'),
        color: Wgsl.type('vec3<f32>'),
    });

    const CameraStruct = Wgsl.struct('Camera', {
        translation: Wgsl.type('vec3<f32>'),
        view_projection_matrix: Wgsl.type('mat4x4<f32>'),
    });

    const FrameUniformGroup = Uniform.group(0, {
        light: Uniform.buffer(0, LightStruct),
        camera: Uniform.buffer(1, CameraStruct),
    });

    const PhongEntityUniformGroup = Uniform.group(1, {
        entity: Uniform.buffer(0, PhongEntityStruct),
    });

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device: args.device,
        uniformGroups: [FrameUniformGroup, PhongEntityUniformGroup],
    });

    const phongShaderCode = /* wgsl */ `
        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
            @location(1) normal: vec3f,
        };
    
        ${args.vertexWgsl}
    
        ${Uniform.getWgslFromGroups([FrameUniformGroup, PhongEntityUniformGroup])}
    
        @vertex fn vs(vert: Vertex) -> VSOutput {
            var vsOut: VSOutput;
            vsOut.position = camera.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
            vsOut.uv = vert.uv;
            vsOut.normal = (entity.transform.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
            return vsOut;
        }
    
        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            let N = normalize(vsOut.normal);
            let L = normalize(light.direction);
            let ambient = entity.material.diffuse_color * 0.1;
            let diff = max(dot(N, L), 0.0);
            let diffuse = diff * light.color * entity.material.diffuse_color;
            return vec4f(ambient + diffuse, 1.0);
        }
    `.trim();

    const module = args.device.createShaderModule({ code: phongShaderCode });

    const Light = PipelineLayout.createBindGroups(0, {
        light: WebgpuUtils.createBufferDescriptor(),
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    const light = LightStruct.create();
    Vec3.copy(light.views.direction, Vec3.normalize([2, 3, 5]));
    Vec3.copy(light.views.color, [1, 1, 1]);

    const camera = CameraStruct.create();
    const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(
        MathUtils.degreesToRadians(65),
        args.renderTexture.width / args.renderTexture.height,
        0,
    );
    Mat4x4.multiplication(camera.views.view_projection_matrix, proj, view);

    return defineMaterialTemplate({
        layout: PipelineLayout.layout,
        frameBindGroups: Light,
        frameUniforms: {
            light: light.buffer,
            camera: camera.buffer,
        },
        module,
        createEntityBindGroups: () =>
            PipelineLayout.createBindGroups(1, {
                entity: WebgpuUtils.createBufferDescriptor(),
            }),
    });
};
