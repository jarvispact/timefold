import { PhongEntityUniformGroup, SceneStruct, SceneUniformGroup } from '@timefold/engine';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import { Uniform, WebgpuUtils } from '@timefold/webgpu';
import { defineMaterialTemplate } from './webgpu-renderer';

type Args = {
    device: GPUDevice;
    renderTexture: GPUTexture;
    info: InterleavedInfo;
    planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>;
    vertexWgsl: string;
};

export const createPhongMaterialTemplate = (args: Args) => {
    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device: args.device,
        uniformGroups: [SceneUniformGroup, PhongEntityUniformGroup],
    });

    const phongShaderCode = /* wgsl */ `
        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
            @location(1) normal: vec3f,
        };
    
        ${args.vertexWgsl}
    
        ${Uniform.getWgslFromGroups([SceneUniformGroup, PhongEntityUniformGroup])}
    
        @vertex fn vs(vert: Vertex) -> VSOutput {
            var vsOut: VSOutput;
            vsOut.position = scene.camera.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
            vsOut.uv = vert.uv;
            vsOut.normal = (entity.transform.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
            return vsOut;
        }
    
        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            let N = normalize(vsOut.normal);
            let L = normalize(scene.dir_lights[0].direction);
            let ambient = entity.material.diffuse_color * 0.1;
            let diff = max(dot(N, L), 0.0);
            let diffuse = diff * scene.dir_lights[0].color * entity.material.diffuse_color;
            return vec4f(ambient + diffuse, 1.0);
        }
    `.trim();

    const module = args.device.createShaderModule({ code: phongShaderCode });

    const frameBindGroups = PipelineLayout.createBindGroups(0, {
        scene: WebgpuUtils.createBufferDescriptor(),
    });

    const scene = SceneStruct.create();

    Vec3.copy(scene.views.dir_lights[0].direction, Vec3.normalize([2, 3, 5]));
    Vec3.copy(scene.views.dir_lights[0].color, [1, 1, 1]);

    const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(
        MathUtils.degreesToRadians(65),
        args.renderTexture.width / args.renderTexture.height,
        0,
    );
    Mat4x4.multiplication(scene.views.camera.view_projection_matrix, proj, view);

    return defineMaterialTemplate({
        layout: PipelineLayout.layout,
        frameBindGroups,
        frameUniforms: {
            scene: scene.buffer,
        },
        module,
        createEntityBindGroups: () =>
            PipelineLayout.createBindGroups(1, {
                entity: WebgpuUtils.createBufferDescriptor(),
            }),
    });
};
