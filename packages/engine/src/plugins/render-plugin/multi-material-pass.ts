/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { defineRenderPass, RenderPassDescriptor, RenderPipelineContext, Uniform, WebgpuUtils } from '@timefold/webgpu';
import { DepthPass } from './depth-pass';
import {
    CameraStruct,
    DirLightStructArray,
    PhongMaterialStruct,
    TransformStruct,
    UnlitMaterialStruct,
} from '../../structs';
import { InterleavedLayout, MaterialComponent, NonInterleavedAttributes, PrimitiveComponent } from '../../components';
import { getVertexAndIndexFromPrimitive, Index, Vertex } from './internal-utils';
import { getPhongShaderCode } from './shaders/phong';
import { getUnlitShaderCode } from './shaders/unlit';

type Entity = {
    id: string | number;
    material: MaterialComponent;
    materialData: ArrayBufferLike;
    primitive: PrimitiveComponent;
    transformData: ArrayBufferLike;
};

type EntityBinding = {
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

type EntityBindGroup = {
    group: number;
    bindgroup: GPUBindGroup;
    bindings: {
        material: EntityBinding;
        transform: EntityBinding;
    };
};

type FrameBindgroupResult = {
    group: number;
    bindGroup: GPUBindGroup;
    buffers: {
        dir_lights: GPUBuffer;
        camera: GPUBuffer;
    };
};

type Renderable = {
    id: Entity['id'];
    sortId: number;
    pipeline: { pipeline: GPURenderPipeline; frameBindgroup: FrameBindgroupResult };
    entity: EntityBindGroup;
    primitive: { vertex: Vertex; index?: Index };
};

const serializePrimitiveState = (primitive: GPUPrimitiveState) => {
    return [
        primitive.cullMode ?? 'back',
        primitive.frontFace ?? 'ccw',
        primitive.topology ?? 'triangle-list',
        primitive.stripIndexFormat,
        primitive.unclippedDepth,
    ].join(':');
};

const serializeLayout = (layout: InterleavedLayout) => {
    return Object.keys(layout)
        .map((key) => {
            const value = layout[key];
            return `${key}:${value.format}:${value.stride}`;
        })
        .join('|');
};

const serializeAttribs = (attribs: NonInterleavedAttributes) => {
    return Object.keys(attribs)
        .map((key) => {
            const value = attribs[key];
            return `${key}:${value.format}`;
        })
        .join('|');
};

export const MultiMaterialPass = defineRenderPass({
    name: 'MultiMaterialPass',
    build: (ctx: RenderPipelineContext<[typeof DepthPass]>) => {
        const { device, canvas, context, format, msaa } = ctx.args;
        const { depthTexture } = ctx.DepthPass;

        const colorTexture =
            msaa > 1
                ? device.createTexture({
                      format,
                      usage: GPUTextureUsage.RENDER_ATTACHMENT,
                      size: [canvas.width, canvas.height],
                      sampleCount: msaa,
                  })
                : context.getCurrentTexture();

        const renderPassDescriptor: RenderPassDescriptor = {
            colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
            depthStencilAttachment: WebgpuUtils.createDepthAttachmentFromView(depthTexture.createView(), {
                depthLoadOp: 'load', // Important!!!
                depthStoreOp: 'discard', // TODO: check if this is correct!!!
            }),
        };

        const FrameGroup = Uniform.group(0, {
            dir_lights: Uniform.buffer(0, DirLightStructArray),
            camera: Uniform.buffer(1, CameraStruct),
        });

        const UnlitEntityGroup = Uniform.group(1, {
            material: Uniform.buffer(0, UnlitMaterialStruct),
            transform: Uniform.buffer(1, TransformStruct),
        });

        const PhongEntityGroup = Uniform.group(1, {
            material: Uniform.buffer(0, PhongMaterialStruct),
            transform: Uniform.buffer(1, TransformStruct),
        });

        const PipelineLayoutsByMaterialType = {
            '@tf/UnlitMaterial': WebgpuUtils.createPipelineLayout({
                device: device,
                uniformGroups: [FrameGroup, UnlitEntityGroup],
            }),
            '@tf/PhongMaterial': WebgpuUtils.createPipelineLayout({
                device: device,
                uniformGroups: [FrameGroup, PhongEntityGroup],
            }),
        };

        const frameData = {
            dirLights: new ArrayBuffer(0),
            camera: new ArrayBuffer(0),
        };

        const renderables: Renderable[] = [];

        const pipelineMap = new Map<string, { pipeline: GPURenderPipeline; frameBindgroup: FrameBindgroupResult }>();
        let pipelineCounter = -1;

        const entityMap = new Map<MaterialComponent, EntityBindGroup>();
        let entityCounter = -1;

        const primitiveMap = new Map<PrimitiveComponent, { vertex: Vertex; index?: Index }>();
        let primitiveCounter = -1;

        return {
            setDirLights: (lights: ArrayBufferLike) => {
                frameData.dirLights = lights;
            },
            setCamera: (camera: ArrayBufferLike) => {
                frameData.camera = camera;
            },
            addEntity: (entity: Entity) => {
                const primtiveKey = serializePrimitiveState(entity.primitive.data.primitive);

                const layoutKey =
                    entity.primitive.type === '@tf/InterleavedPrimitive'
                        ? serializeLayout(entity.primitive.data.layout)
                        : serializeAttribs(entity.primitive.data.attributes);

                const pipelineMapKey = `${entity.material.type}-${entity.primitive.type}-${primtiveKey}-${layoutKey}`;

                const PipelineLayout = PipelineLayoutsByMaterialType[entity.material.type];

                if (!pipelineMap.has(pipelineMapKey)) {
                    const uniformsWgsl = Uniform.getWgslFromGroups(PipelineLayout.uniformGroups);

                    const primitiveLayout =
                        entity.primitive.type === '@tf/InterleavedPrimitive'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', entity.primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', entity.primitive.data.attributes);

                    const module = device.createShaderModule({
                        code:
                            entity.material.type === '@tf/UnlitMaterial'
                                ? getUnlitShaderCode(uniformsWgsl, primitiveLayout.wgsl)
                                : getPhongShaderCode(uniformsWgsl, primitiveLayout.wgsl),
                    });

                    const pipeline = device.createRenderPipeline({
                        layout: PipelineLayout.layout,
                        vertex: { module, buffers: primitiveLayout.layout },
                        primitive: entity.primitive.data.primitive,
                        fragment: { module, targets: [{ format }] },
                        depthStencil: { depthWriteEnabled: false, depthCompare: 'less-equal', format: 'depth24plus' },
                        multisample: { count: msaa },
                    });

                    const frameBindgroup = PipelineLayout.createBindGroups(0, {
                        dir_lights: WebgpuUtils.createBufferDescriptor(),
                        camera: WebgpuUtils.createBufferDescriptor(),
                    });

                    pipelineMap.set(pipelineMapKey, { pipeline, frameBindgroup });
                    pipelineCounter++;
                }

                const pipeline = pipelineMap.get(pipelineMapKey)!;

                if (!entityMap.has(entity.material)) {
                    const entityBindgroup = PipelineLayout.createBindGroups(1, {
                        material: WebgpuUtils.createBufferDescriptor(),
                        transform: WebgpuUtils.createBufferDescriptor(),
                    });

                    entityMap.set(entity.material, {
                        group: entityBindgroup.group,
                        bindgroup: entityBindgroup.bindGroup,
                        bindings: {
                            material: { buffer: entityBindgroup.buffers.material, data: entity.materialData },
                            transform: { buffer: entityBindgroup.buffers.transform, data: entity.transformData },
                        },
                    });

                    entityCounter++;
                }

                if (!primitiveMap.has(entity.primitive)) {
                    const primitiveLayout =
                        entity.primitive.type === '@tf/InterleavedPrimitive'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', entity.primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', entity.primitive.data.attributes);

                    const result = getVertexAndIndexFromPrimitive(device, primitiveLayout, entity.primitive);
                    if (result) {
                        primitiveMap.set(entity.primitive, result);
                        primitiveCounter++;
                    }
                }

                const entityEntry = entityMap.get(entity.material)!;
                const primitive = primitiveMap.get(entity.primitive)!;

                const pipelineId = pipelineCounter;
                const materialId = entityCounter;
                const primitiveId = primitiveCounter;
                const sortId = (pipelineId << 16) | (materialId << 8) | primitiveId;

                renderables.push({
                    id: entity.id,
                    sortId,
                    pipeline,
                    entity: entityEntry,
                    primitive,
                });

                renderables.sort((a, b) => a.sortId - b.sortId);
            },
            render: () => {
                if (msaa > 1) {
                    renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
                } else {
                    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
                }

                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);

                for (let i = 0; i < renderables.length; i++) {
                    const prevRenderable = renderables[i - 1] as Renderable | undefined;
                    const renderable = renderables[i];

                    if (!prevRenderable || renderable.pipeline !== prevRenderable.pipeline) {
                        pass.setPipeline(renderable.pipeline.pipeline);

                        pass.setBindGroup(
                            renderable.pipeline.frameBindgroup.group,
                            renderable.pipeline.frameBindgroup.bindGroup,
                        );

                        device.queue.writeBuffer(
                            renderable.pipeline.frameBindgroup.buffers.dir_lights,
                            0,
                            frameData.dirLights,
                        );
                        device.queue.writeBuffer(
                            renderable.pipeline.frameBindgroup.buffers.camera,
                            0,
                            frameData.camera,
                        );
                    }

                    if (!prevRenderable || renderable.entity !== prevRenderable.entity) {
                        pass.setBindGroup(renderable.entity.group, renderable.entity.bindgroup);
                        device.queue.writeBuffer(
                            renderable.entity.bindings.material.buffer,
                            0,
                            renderable.entity.bindings.material.data,
                        );
                    }

                    if (!prevRenderable || renderable.primitive !== prevRenderable.primitive) {
                        for (const vertex of renderable.primitive.vertex.buffers) {
                            pass.setVertexBuffer(vertex.slot, vertex.buffer);
                        }

                        if (renderable.primitive.index) {
                            pass.setIndexBuffer(renderable.primitive.index.buffer, renderable.primitive.index.format);
                        }
                    }

                    // TODO: Can we skip updates based on prevRenderable?
                    device.queue.writeBuffer(
                        renderable.entity.bindings.transform.buffer,
                        0,
                        renderable.entity.bindings.transform.data,
                    );

                    if (renderable.primitive.index) {
                        pass.drawIndexed(renderable.primitive.index.count);
                    } else {
                        pass.draw(renderable.primitive.vertex.count);
                    }
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            },
        };
    },
});
