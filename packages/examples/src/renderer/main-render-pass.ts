import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { defineRenderPass, RenderPipelineContext } from './render-pipeline';

const LightStruct = Wgsl.struct('Light', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const CameraStruct = Wgsl.struct('Camera', {
    translation: Wgsl.type('vec3<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const UnlitEntityStruct = Wgsl.struct('UnlitEntityStruct', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const PhongEntityStruct = Wgsl.struct('PhongEntityStruct', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
    diffuse_color: Wgsl.type('vec3<f32>'),
    specular_color: Wgsl.type('vec3<f32>'),
});

// LEARNING: Every material should define its own pipeline layout
// Handling different lighting models and entity properties is a mess
// Maybe with a different API its easier to share layouts?

// TODO: Use a record instead of array indices for Uniform.group
// Then we can define a full set of uniforms at once.
// group and binding numbers could be generated internally

const LightUniformGroup = Uniform.group(0, { light: Uniform.buffer(0, LightStruct) });
const CameraUniformGroup = Uniform.group(1, { camera: Uniform.buffer(0, CameraStruct) });

const UnlitEntityUniformGroup = Uniform.group(2, { entity: Uniform.buffer(0, UnlitEntityStruct) });
const PhongEntityUniformGroup = Uniform.group(2, { entity: Uniform.buffer(0, PhongEntityStruct) });

const getFormatForIndices = (indices: Uint16Array | Uint32Array) => {
    if (indices instanceof Uint16Array) return 'uint16';
    return 'uint32';
};

export const MainRenderPass = defineRenderPass({
    name: 'MainRenderPass',
    fn: (
        ctx: RenderPipelineContext<
            [],
            { info: InterleavedInfo; planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array> }
        >,
    ) => {
        const { device, canvas, format, info, planePrimitive } = ctx.args;

        // =======================================
        // Unlit

        const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
            position: { format: 'float32x3', offset: info.positionOffset },
            uv: { format: 'float32x2', offset: info.uvOffset },
            normal: { format: 'float32x3', offset: info.normalOffset },
        });

        const UnlitPipelineLayout = WebgpuUtils.createPipelineLayout({
            device,
            uniformGroups: [LightUniformGroup, CameraUniformGroup, UnlitEntityUniformGroup],
        });

        const unlitShaderCode = /* wgsl */ `
            ${Vertex.wgsl}
        
            ${Uniform.getWgslFromGroups([LightUniformGroup, CameraUniformGroup, UnlitEntityUniformGroup])}
        
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

        // =======================================
        // Phong

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

        const renderTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'bgra8unorm',
            dimension: '2d',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });

        const renderTextureView = renderTexture.createView();

        const renderPassDescriptor = {
            colorAttachments: [
                WebgpuUtils.createColorAttachmentFromView(renderTextureView, {
                    clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                }),
            ],
        };

        const V = Vertex.createBuffer(device, planePrimitive.vertices);
        const I = WebgpuUtils.createIndexBuffer(device, {
            data: planePrimitive.indices,
            format: getFormatForIndices(planePrimitive.indices),
        });

        const Light = UnlitPipelineLayout.createBindGroups(0, {
            light: WebgpuUtils.createBufferDescriptor(),
        });

        const light = LightStruct.create();
        Vec3.copy(light.views.direction, Vec3.normalize([2, 3, 5]));
        Vec3.copy(light.views.color, [1, 1, 1]);

        const Camera = UnlitPipelineLayout.createBindGroups(1, {
            camera: WebgpuUtils.createBufferDescriptor(),
        });

        const camera = CameraStruct.create();
        const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
        const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
        Mat4x4.multiplication(camera.views.view_projection_matrix, proj, view);

        const UnlitEntity = UnlitPipelineLayout.createBindGroups(2, {
            entity: WebgpuUtils.createBufferDescriptor(),
        });

        const unlitEntity = UnlitEntityStruct.create();
        Mat4x4.fromTranslation(unlitEntity.views.model_matrix, [-2, 0, 0]);
        Vec3.copy(unlitEntity.views.color, [1, 0, 0]);

        const PhongEntity = PhongPipelineLayout.createBindGroups(2, {
            entity: WebgpuUtils.createBufferDescriptor(),
        });

        const phongEntity = PhongEntityStruct.create();
        Mat4x4.fromTranslation(phongEntity.views.model_matrix, [2, 0, 0]);
        Mat4x4.modelToNormal(phongEntity.views.normal_matrix, phongEntity.views.model_matrix);
        Vec3.copy(phongEntity.views.diffuse_color, [1, 0, 0]);

        const render = () => {
            renderPassDescriptor.colorAttachments[0].view = renderTexture.createView();
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass(renderPassDescriptor);

            pass.setBindGroup(Light.group, Light.bindGroup);
            device.queue.writeBuffer(Light.buffers.light, 0, light.buffer);

            // Unlit
            pass.setPipeline(unlitPipeline);

            pass.setBindGroup(Camera.group, Camera.bindGroup);
            device.queue.writeBuffer(Camera.buffers.camera, 0, camera.buffer);

            pass.setVertexBuffer(0, V.buffer);
            pass.setIndexBuffer(I.buffer, I.format);

            pass.setBindGroup(UnlitEntity.group, UnlitEntity.bindGroup);
            device.queue.writeBuffer(UnlitEntity.buffers.entity, 0, unlitEntity.buffer);
            pass.drawIndexed(I.count);

            // Phong
            pass.setPipeline(phongPipeline);

            pass.setBindGroup(Camera.group, Camera.bindGroup);
            device.queue.writeBuffer(Camera.buffers.camera, 0, camera.buffer);

            pass.setVertexBuffer(0, V.buffer);
            pass.setIndexBuffer(I.buffer, I.format);

            pass.setBindGroup(PhongEntity.group, PhongEntity.bindGroup);
            device.queue.writeBuffer(PhongEntity.buffers.entity, 0, phongEntity.buffer);
            pass.drawIndexed(I.count);

            pass.end();
            device.queue.submit([encoder.finish()]);
        };

        return {
            render,
            context: { renderTexture },
        };
    },
});
