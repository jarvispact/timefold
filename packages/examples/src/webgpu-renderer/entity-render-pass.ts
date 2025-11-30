import {
    definePipelinePass,
    GenericWgslStructDefinition,
    PipelineContext,
    Uniform,
    WebgpuUtils,
    Wgsl,
    WgslStruct,
} from '@timefold/webgpu';
import { Mat4x4, Mat4x4Type } from '@timefold/math';
import { quadIndices, quadInterleavedIndexed } from './quad-geometry';

const CameraStruct = Wgsl.struct('Camera', {
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const FrameUniformGroup = Uniform.group(0, {
    camera: Uniform.uniformBuffer(0, CameraStruct),
});

export const TransformStruct = Wgsl.struct('Transform', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
});

const VertexInterleaved = WebgpuUtils.createVertexBufferLayout({
    label: 'Simple Quad Layout',
    mode: 'interleaved',
    definition: {
        position: { format: 'float32x3', stride: 0 },
        uv: { format: 'float32x2', stride: 3 },
    },
});

type InternalEntity = {
    group: number;
    bindGroup: GPUBindGroup;
    materialBuffer: GPUBuffer;
    materialData: ArrayBuffer;
    transformBuffer: GPUBuffer;
    transformData: ArrayBuffer;
};

type RenderEntity = {
    id: number;
    material: { id: number; data: ArrayBuffer };
    transform: ArrayBuffer;
};

export const EntityRenderPass = definePipelinePass({
    name: 'EntityRenderPass',
    build({ args }: PipelineContext) {
        const { canvas, device, format, context, msaa } = args;
        const isMultiSampled = msaa > 1;

        const { buffer: cameraData, views: cameraViews } = CameraStruct.create();

        const P = VertexInterleaved.createBuffer(device, quadInterleavedIndexed);
        const I = WebgpuUtils.createIndexBuffer({
            device,
            format: 'uint16',
            data: quadIndices,
            label: 'Simple Quad Index Buffer',
        });

        const pipelines: {
            pipeline: GPURenderPipeline;
            frame: { group: number; bindGroup: GPUBindGroup; buffers: { camera: GPUBuffer } };
            entities: InternalEntity[];
            entityIdToIdx: Map<number, number>;
            createEntityBindgroup: () => {
                group: number;
                bindGroup: GPUBindGroup;
                buffers: { material: GPUBuffer; transform: GPUBuffer };
            };
        }[] = [];

        const entityToPipelineId = new Map<number, number>();

        function defineMaterial(args: {
            struct: WgslStruct<string, GenericWgslStructDefinition>;
            getShaderCode: (args: { vertexWgsl: string; uniformsWgsl: string }) => string;
        }) {
            const UnlitEntityUniformGroup = Uniform.group(1, {
                material: Uniform.uniformBuffer(0, args.struct),
                transform: Uniform.uniformBuffer(1, TransformStruct),
            });

            const PipelineLayout = WebgpuUtils.createPipelineLayout({
                bindGroupLayoutLabel: 'Generic Pipeline BGL',
                pipelineLayoutLabel: 'Generic Pipeline PL',
                uniformGroups: [FrameUniformGroup, UnlitEntityUniformGroup],
            });

            const uniformsWgsl = Uniform.getWgslFromGroups(PipelineLayout.uniformGroups);

            const module = device.createShaderModule({
                code: args.getShaderCode({ vertexWgsl: VertexInterleaved.wgsl, uniformsWgsl }),
            });

            const pipeline = device.createRenderPipeline({
                layout: PipelineLayout.createLayout(device),
                primitive: { topology: 'triangle-list', cullMode: 'back' },
                vertex: { module: module, buffers: VertexInterleaved.layout },
                fragment: { module: module, targets: [{ format }] },
                multisample: isMultiSampled ? { count: msaa } : undefined,
            });

            const Frame = PipelineLayout.createBindGroups({
                device,
                group: 0,
                bindings: {
                    camera: WebgpuUtils.createUniformBufferDescriptor({ label: 'Camera Uniform Buffer' }),
                },
            });

            const createEntityBindgroup = () =>
                PipelineLayout.createBindGroups({
                    device,
                    group: 1,
                    bindings: {
                        material: WebgpuUtils.createUniformBufferDescriptor({ label: `Material Uniform Buffer` }),
                        transform: WebgpuUtils.createUniformBufferDescriptor({ label: `Transform Uniform Buffer` }),
                    },
                });

            pipelines.push({
                pipeline,
                frame: Frame,
                entities: [],
                entityIdToIdx: new Map(),
                createEntityBindgroup,
            });
            return pipelines.length - 1;
        }

        function defineGeometry() {}

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
            for (const pipeline of pipelines) {
                device.queue.writeBuffer(pipeline.frame.buffers.camera, 0, cameraData);
            }
        }

        function addEntity(entity: RenderEntity) {
            const pipeline = pipelines[entity.material.id];

            const e = pipeline.createEntityBindgroup();

            pipeline.entities.push({
                group: e.group,
                bindGroup: e.bindGroup,
                materialBuffer: e.buffers.material,
                materialData: entity.material.data,
                transformBuffer: e.buffers.transform,
                transformData: entity.transform,
            });

            pipeline.entityIdToIdx.set(entity.id, pipeline.entities.length - 1);
            entityToPipelineId.set(entity.id, entity.material.id);
        }

        function removeEntity(id: RenderEntity['id']) {
            const pipelineId = entityToPipelineId.get(id);
            if (pipelineId === undefined) return;

            const pipeline = pipelines[pipelineId];

            const idx = pipeline.entityIdToIdx.get(id);
            if (idx === undefined) return;

            const last = pipeline.entities.length - 1;
            pipeline.entities[idx] = pipeline.entities[last];
            pipeline.entities.pop();
            // TODO: This is not correct
            pipeline.entityIdToIdx.delete(id);
            entityToPipelineId.delete(id);
        }

        function update(encoder: GPUCommandEncoder) {
            if (isMultiSampled) {
                renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
            } else {
                renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
            }

            const pass = encoder.beginRenderPass(renderPassDescriptor);

            for (const pipeline of pipelines) {
                pass.setBindGroup(pipeline.frame.group, pipeline.frame.bindGroup);
                pass.setPipeline(pipeline.pipeline);
                pass.setVertexBuffer(P.slot, P.buffer);
                pass.setIndexBuffer(I.buffer, I.format);

                for (const entity of pipeline.entities) {
                    pass.setBindGroup(entity.group, entity.bindGroup);
                    device.queue.writeBuffer(entity.materialBuffer, 0, entity.materialData);
                    device.queue.writeBuffer(entity.transformBuffer, 0, entity.transformData);
                    pass.drawIndexed(I.count);
                }
            }

            pass.end();
        }

        return {
            defineMaterial,
            defineGeometry,
            resize,
            setCamera,
            addEntity,
            removeEntity,
            update,
        };
    },
});
