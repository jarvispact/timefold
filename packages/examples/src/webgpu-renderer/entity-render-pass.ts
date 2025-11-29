import { definePipelinePass, PipelineContext, Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Mat4x4, Mat4x4Type, Vec3, Vec3Type } from '@timefold/math';
import { quadIndices, quadInterleavedIndexed } from './quad-geometry';

const CameraStruct = Wgsl.struct('Camera', {
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const FrameUniformGroup = Uniform.group(0, {
    camera: Uniform.uniformBuffer(0, CameraStruct),
});

const EntityStruct = Wgsl.struct('Entity', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.uniformBuffer(0, EntityStruct),
});

const PipelineLayout = WebgpuUtils.createPipelineLayout({
    bindGroupLayoutLabel: 'Generic Pipeline BGL',
    pipelineLayoutLabel: 'Generic Pipeline PL',
    uniformGroups: [FrameUniformGroup, EntityUniformGroup],
});

const VertexInterleaved = WebgpuUtils.createVertexBufferLayout({
    label: 'Simple Quad Layout',
    mode: 'interleaved',
    definition: {
        position: { format: 'float32x3', stride: 0 },
        uv: { format: 'float32x2', stride: 3 },
    },
});

const shaderCode = /* wgsl */ `
${VertexInterleaved.wgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

${Uniform.getWgslFromGroups(PipelineLayout.uniformGroups)}

@vertex fn vs(vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = camera.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    return vsOut;
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    // return textureSample(color_map_texture, color_map_sampler, fsIn.uv);
    return vec4f(entity.color, 1.0);
}
`.trim();

type RenderEntity = {
    id: number;
    modelMatrix: Mat4x4Type;
    color: Vec3Type;
};

export const EntityRenderPass = definePipelinePass({
    name: 'EntityRenderPass',
    build({ args }: PipelineContext) {
        const { canvas, device, format, context, msaa } = args;
        const isMultiSampled = msaa > 1;

        const module = device.createShaderModule({ code: shaderCode });

        const pipeline = device.createRenderPipeline({
            layout: PipelineLayout.createLayout(device),
            vertex: { module: module, buffers: VertexInterleaved.layout },
            fragment: { module: module, targets: [{ format }] },
            multisample: isMultiSampled ? { count: msaa } : undefined,
        });

        const Scene = PipelineLayout.createBindGroups({
            device,
            group: 0,
            bindings: {
                camera: WebgpuUtils.createUniformBufferDescriptor({ label: 'Camera Uniform Buffer' }),
            },
        });

        const { buffer: cameraData, views: cameraViews } = CameraStruct.create();

        const P = VertexInterleaved.createBuffer(device, quadInterleavedIndexed);
        const I = WebgpuUtils.createIndexBuffer({
            device,
            format: 'uint16',
            data: quadIndices,
            label: 'Simple Quad Index Buffer',
        });

        function createColorTexture(width: number, height: number) {
            return device.createTexture({
                format,
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
                size: [width, height],
                sampleCount: msaa,
            });
        }

        let colorTexture = isMultiSampled
            ? createColorTexture(canvas.width, canvas.height)
            : context.getCurrentTexture();

        const renderPassDescriptor = {
            colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
        };

        function resize(width: number, height: number) {
            if (isMultiSampled) {
                colorTexture.destroy();
                colorTexture = createColorTexture(width, height);
                renderPassDescriptor.colorAttachments[0] = WebgpuUtils.createColorAttachmentFromView(
                    colorTexture.createView(),
                );
            }
        }

        function setCamera(args: { viewProjectionMatrix: Mat4x4Type }) {
            Mat4x4.copy(cameraViews.view_projection_matrix, args.viewProjectionMatrix);
            device.queue.writeBuffer(Scene.buffers.camera, 0, cameraData);
        }

        const entities: { bindgroup: GPUBindGroup; buffer: GPUBuffer; data: ArrayBuffer }[] = [];
        const entityIdToIdx = new Map<RenderEntity['id'], number>();

        function addEntity(entity: RenderEntity) {
            const e = PipelineLayout.createBindGroups({
                device,
                group: 1,
                bindings: {
                    entity: WebgpuUtils.createUniformBufferDescriptor({ label: `Entity ${entity.id} Uniform Buffer` }),
                },
            });

            const { buffer: data, views } = EntityStruct.create();
            Mat4x4.copy(views.model_matrix, entity.modelMatrix);
            Vec3.copy(views.color, entity.color);

            entities.push({ bindgroup: e.bindGroup, buffer: e.buffers.entity, data });
            entityIdToIdx.set(entity.id, entities.length - 1);
        }

        function removeEntity(id: RenderEntity['id']) {
            const idx = entityIdToIdx.get(id);
            if (idx === undefined) return;

            const last = entities.length - 1;
            entities[idx] = entities[last];
            entities.pop();
            // TODO: This is not correct
            entityIdToIdx.delete(id);
        }

        function update(encoder: GPUCommandEncoder) {
            if (isMultiSampled) {
                renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
            } else {
                renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
            }

            const pass = encoder.beginRenderPass(renderPassDescriptor);

            pass.setBindGroup(0, Scene.bindGroup);
            // device.queue.writeBuffer(Scene.buffers.camera, 0, cameraData);

            pass.setPipeline(pipeline);
            pass.setVertexBuffer(P.slot, P.buffer);
            pass.setIndexBuffer(I.buffer, I.format);

            for (const entity of entities) {
                pass.setBindGroup(1, entity.bindgroup);
                device.queue.writeBuffer(entity.buffer, 0, entity.data);
                pass.drawIndexed(I.count);
            }

            pass.end();
        }

        return {
            resize,
            setCamera,
            addEntity,
            removeEntity,
            update,
        };
    },
});
