import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { RenderPipelineContext } from './renderer5';

const LightStruct = Wgsl.struct('Light', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const CameraStruct = Wgsl.struct('Camera', {
    translation: Wgsl.type('vec3<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const PhongEntityStruct = Wgsl.struct('PhongEntityStruct', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
    diffuse_color: Wgsl.type('vec3<f32>'),
    specular_color: Wgsl.type('vec3<f32>'),
});

const LightUniformGroup = Uniform.group(0, { light: Uniform.buffer(0, LightStruct) });
const CameraUniformGroup = Uniform.group(1, { camera: Uniform.buffer(0, CameraStruct) });
const PhongEntityUniformGroup = Uniform.group(2, { entity: Uniform.buffer(0, PhongEntityStruct) });

type AdditionalContext = {
    info: InterleavedInfo;
    planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>;
    renderTexture: GPUTexture;
};

const getFormatForIndices = (indices: Uint16Array | Uint32Array) => {
    if (indices instanceof Uint16Array) return 'uint16';
    return 'uint32';
};

export const createPhongRenderer = (ctx: RenderPipelineContext<[], AdditionalContext>) => {
    const { device, format, info, planePrimitive, renderTexture } = ctx.args;

    const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
        position: { format: 'float32x3', offset: info.positionOffset },
        uv: { format: 'float32x2', offset: info.uvOffset },
        normal: { format: 'float32x3', offset: info.normalOffset },
    });

    const PhongPipelineLayout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [LightUniformGroup, CameraUniformGroup, PhongEntityUniformGroup],
    });

    const phongShaderCode = /* wgsl */ `
        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
            @location(1) normal: vec3f,
        };
    
        ${Vertex.wgsl}
    
        ${Uniform.getWgslFromGroups([LightUniformGroup, CameraUniformGroup, PhongEntityUniformGroup])}
    
        @vertex fn vs(vert: Vertex) -> VSOutput {
            var vsOut: VSOutput;
            vsOut.position = camera.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
            vsOut.uv = vert.uv;
            vsOut.normal = (entity.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
            return vsOut;
        }
    
        @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
            let N = normalize(vsOut.normal);
            let L = normalize(light.direction);
            let ambient = entity.diffuse_color * 0.1;
            let diff = max(dot(N, L), 0.0);
            let diffuse = diff * light.color * entity.diffuse_color;
            return vec4f(ambient + diffuse, 1.0);
        }
    `.trim();

    const phongModule = device.createShaderModule({ code: phongShaderCode });

    const phongPipeline = device.createRenderPipeline({
        layout: PhongPipelineLayout.layout,
        vertex: {
            module: phongModule,
            buffers: Vertex.layout,
        },
        fragment: {
            module: phongModule,
            targets: [{ format }],
        },
    });

    const V = Vertex.createBuffer(device, planePrimitive.vertices);
    const I = WebgpuUtils.createIndexBuffer(device, {
        data: planePrimitive.indices,
        format: getFormatForIndices(planePrimitive.indices),
    });

    const Light = PhongPipelineLayout.createBindGroups(0, {
        light: WebgpuUtils.createBufferDescriptor(),
    });

    const light = LightStruct.create();
    Vec3.copy(light.views.direction, Vec3.normalize([2, 3, 5]));
    Vec3.copy(light.views.color, [1, 1, 1]);

    const Camera = PhongPipelineLayout.createBindGroups(1, {
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

    const PhongEntity = PhongPipelineLayout.createBindGroups(2, {
        entity: WebgpuUtils.createBufferDescriptor(),
    });

    const phongEntity = PhongEntityStruct.create();
    Mat4x4.fromTranslation(phongEntity.views.model_matrix, [2, 0, 0]);
    Mat4x4.modelToNormal(phongEntity.views.normal_matrix, phongEntity.views.model_matrix);
    Vec3.copy(phongEntity.views.diffuse_color, [1, 0, 0]);

    const render = (pass: GPURenderPassEncoder) => {
        pass.setPipeline(phongPipeline);

        pass.setBindGroup(Light.group, Light.bindGroup);
        device.queue.writeBuffer(Light.buffers.light, 0, light.buffer);

        pass.setBindGroup(Camera.group, Camera.bindGroup);
        device.queue.writeBuffer(Camera.buffers.camera, 0, camera.buffer);

        pass.setVertexBuffer(0, V.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        pass.setBindGroup(PhongEntity.group, PhongEntity.bindGroup);
        device.queue.writeBuffer(PhongEntity.buffers.entity, 0, phongEntity.buffer);
        pass.drawIndexed(I.count);
    };

    return { render };
};
