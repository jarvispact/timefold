import { CreateVertexBufferMode, GenericVertexBufferResult, RenderPassDescriptor } from './types';
import { WebgpuUtils } from './webgpu';

// ========================================
// MaterialTemplates and PrimitiveTemplates

type BindGroup = {
    group: number;
    bindGroup: GPUBindGroup;
    buffers: Record<string, GPUBuffer>;
};

export type MaterialTemplate<SceneBindGroups extends Record<string, BindGroup>> = {
    layout: GPUPipelineLayout;
    bindGroups: SceneBindGroups;
    uniforms: {
        [GroupKey in keyof SceneBindGroups]: {
            [BindingKey in keyof SceneBindGroups[GroupKey]['buffers']]: ArrayBufferLike;
        };
    };
    module: GPUShaderModule;
    blend?: GPUBlendState | undefined;
    depthStencil?: GPUDepthStencilState;
};

export type PrimitiveTemplate = {
    mode: CreateVertexBufferMode;
    topology: GPUPrimitiveTopology;
    cullMode: GPUCullMode;
    layout: GPUVertexBufferLayout[];
};

type GenericMaterialTemplates = Record<string, MaterialTemplate<Record<string, BindGroup>>>;
type GenericPrimitiveTemplates = Record<string, PrimitiveTemplate>;

export const defineMaterialTemplate = <BindGroups extends Record<string, BindGroup>>(
    args: MaterialTemplate<BindGroups>,
) => args;

type DefinePrimitiveTemplateArgs = {
    topology?: GPUPrimitiveTopology;
    cullMode?: GPUCullMode;
    mode: CreateVertexBufferMode;
    layout: GPUVertexBufferLayout[];
};

export const definePrimitiveTemplate = (args: DefinePrimitiveTemplateArgs): PrimitiveTemplate => {
    return {
        topology: args.topology ?? 'triangle-list',
        cullMode: args.cullMode ?? 'back',
        mode: args.mode,
        layout: args.layout,
    };
};

// ========
// Renderer

export type CreateRendererArgs<
    MaterialTemplates extends GenericMaterialTemplates,
    PrimitiveTemplates extends GenericPrimitiveTemplates,
> = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
    renderPassDescriptor: RenderPassDescriptor;
    materialTemplates: MaterialTemplates;
    primitiveTemplates: PrimitiveTemplates;
};

type VertexBuffer = { slot: number; buffer: GPUBuffer };
type Index = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };

type Mesh<MaterialTemplates extends GenericMaterialTemplates, PrimitiveTemplates extends GenericPrimitiveTemplates> = {
    material: {
        template: keyof MaterialTemplates;
    };
    primitive: {
        template: keyof PrimitiveTemplates;
        vertex: GenericVertexBufferResult;
        index?: Index;
    };
};

type Entity<
    MaterialTemplates extends GenericMaterialTemplates,
    PrimitiveTemplates extends GenericPrimitiveTemplates,
    BindGroups extends Record<string, BindGroup>,
> = {
    id: string | number;
    bindGroups: BindGroups;
    uniforms: {
        [GroupKey in keyof BindGroups]: {
            [BindingKey in keyof BindGroups[GroupKey]['buffers']]: ArrayBufferLike;
        };
    };
    mesh: Mesh<MaterialTemplates, PrimitiveTemplates> | Mesh<MaterialTemplates, PrimitiveTemplates>[];
};

type RenderPipelineBindGroup = {
    group: number;
    bindGroup: GPUBindGroup;
    uniforms: { buffer: GPUBuffer; data: ArrayBufferLike }[];
};

type RenderEntity = {
    bindGroups: RenderPipelineBindGroup[];
    mesh: {
        vertex: { buffers: VertexBuffer[]; count: number };
        index?: Index;
    };
};

type BindGroupKeyToIndex = Record<
    string,
    { groupIndex: number | undefined; uniformKeyToIdx: Record<string, number | undefined> }
>;

type RenderTree = {
    pipelines: {
        pipeline: GPURenderPipeline;
        bindGroups: RenderPipelineBindGroup[];
        bindGroupKeyToIdx: BindGroupKeyToIndex;
        entities: RenderEntity[];
    }[];
    pipelineIdToIdx: Record<string, number | undefined>;
};

export const createRenderer = <
    const MaterialTemplates extends GenericMaterialTemplates,
    const PrimitiveTemplates extends GenericPrimitiveTemplates,
>(
    args: CreateRendererArgs<MaterialTemplates, PrimitiveTemplates>,
) => {
    const renderTree: RenderTree = { pipelines: [], pipelineIdToIdx: {} };

    const materialTemplateKeys = Object.keys(args.materialTemplates);
    const primitiveTemplateKeys = Object.keys(args.primitiveTemplates);

    for (const materialTemplateKey of materialTemplateKeys) {
        const materialTemplate = args.materialTemplates[materialTemplateKey];

        for (const primitiveTemplateKey of primitiveTemplateKeys) {
            const primitiveTemplate = args.primitiveTemplates[primitiveTemplateKey];

            const pipeline = args.device.createRenderPipeline({
                layout: materialTemplate.layout,
                primitive: {
                    cullMode: primitiveTemplate.cullMode,
                    topology: primitiveTemplate.topology,
                },
                vertex: {
                    module: materialTemplate.module,
                    buffers: primitiveTemplate.layout,
                },
                fragment: {
                    module: materialTemplate.module,
                    targets: [
                        {
                            format: args.format,
                            blend: materialTemplate.blend ?? WebgpuUtils.getBlendState('opaque'),
                        },
                    ],
                },
                depthStencil: materialTemplate.depthStencil,
            });

            const bindGroupKeyToIdx: BindGroupKeyToIndex = {};

            renderTree.pipelines.push({
                pipeline,
                bindGroups: Object.keys(materialTemplate.bindGroups).map((groupKey, groupIndex) => {
                    const bindGroup = materialTemplate.bindGroups[groupKey];
                    bindGroupKeyToIdx[groupKey] = { groupIndex, uniformKeyToIdx: {} };
                    return {
                        group: bindGroup.group,
                        bindGroup: bindGroup.bindGroup,
                        uniforms: Object.keys(bindGroup.buffers).map((bindingKey, bindingIndex) => {
                            bindGroupKeyToIdx[groupKey].uniformKeyToIdx[bindingKey] = bindingIndex;
                            return {
                                buffer: bindGroup.buffers[bindingKey],
                                data: materialTemplate.uniforms[groupKey][bindingKey],
                            };
                        }),
                    };
                }),
                bindGroupKeyToIdx,
                entities: [],
            });
            const pipelineId = `${materialTemplateKey}-${primitiveTemplateKey}`;
            renderTree.pipelineIdToIdx[pipelineId] = renderTree.pipelines.length - 1;
        }
    }

    const setUniform = <
        MaterialTemplate extends keyof MaterialTemplates,
        BindGroupKey extends keyof MaterialTemplates[MaterialTemplate]['bindGroups'],
    >(
        materialTemplate: MaterialTemplate,
        bindGroup: BindGroupKey,
        uniform: keyof MaterialTemplates[MaterialTemplate]['bindGroups'][BindGroupKey]['buffers'],
        data: ArrayBufferLike,
    ) => {
        const pipelineIds = Object.keys(renderTree.pipelineIdToIdx).filter((key) =>
            key.startsWith(`${materialTemplate.toString()}-`),
        );

        for (const pipelineId of pipelineIds) {
            const pipelineIdx = renderTree.pipelineIdToIdx[pipelineId];
            if (pipelineIdx === undefined) continue;

            const pipeline = renderTree.pipelines[pipelineIdx];
            const bindGroupIdx = pipeline.bindGroupKeyToIdx[bindGroup as string];
            if (bindGroupIdx.groupIndex === undefined) continue;

            const uniformIdx = bindGroupIdx.uniformKeyToIdx[uniform as string];
            if (uniformIdx === undefined) continue;

            pipeline.bindGroups[bindGroupIdx.groupIndex].uniforms[uniformIdx].data = data;
        }
    };

    const addEntity = <BindGroups extends Record<string, BindGroup>>(
        entity: Entity<MaterialTemplates, PrimitiveTemplates, BindGroups>,
    ) => {
        const meshArray = Array.isArray(entity.mesh) ? entity.mesh : [entity.mesh];

        for (const meshPart of meshArray) {
            const primitiveTemplate = args.primitiveTemplates[meshPart.primitive.template];

            if (primitiveTemplate.mode !== meshPart.primitive.vertex.mode) {
                throw new Error(
                    `The primitive template: "${meshPart.primitive.template.toString()}" defines mode: "${primitiveTemplate.mode}" but the vertex of this mesh defines mode: "${meshPart.primitive.vertex.mode}".`,
                );
            }

            const pipelineId = `${meshPart.material.template.toString()}-${meshPart.primitive.template.toString()}`;
            const pipelineIdx = renderTree.pipelineIdToIdx[pipelineId];
            if (pipelineIdx === undefined) return;

            const buffers: VertexBuffer[] = [];
            let count = 0;

            if (meshPart.primitive.vertex.mode === 'interleaved') {
                buffers.push({ slot: meshPart.primitive.vertex.slot, buffer: meshPart.primitive.vertex.buffer });
                count = meshPart.primitive.vertex.count;
            } else {
                const attribKeys = Object.keys(meshPart.primitive.vertex.attribs);
                for (const attribKey of attribKeys) {
                    const attrib = meshPart.primitive.vertex.attribs[attribKey];

                    if (attribKey === 'position') {
                        count = meshPart.primitive.vertex.attribs.position.count;
                    }

                    buffers.push({ slot: attrib.slot, buffer: attrib.buffer });
                }
            }

            renderTree.pipelines[pipelineIdx].entities.push({
                bindGroups: Object.keys(entity.bindGroups).map((groupKey) => {
                    const bindGroup = entity.bindGroups[groupKey];
                    return {
                        group: bindGroup.group,
                        bindGroup: bindGroup.bindGroup,
                        uniforms: Object.keys(bindGroup.buffers).map((bindingKey) => {
                            return {
                                buffer: bindGroup.buffers[bindingKey],
                                data: entity.uniforms[groupKey][bindingKey],
                            };
                        }),
                    };
                }),
                mesh: { vertex: { buffers, count }, index: meshPart.primitive.index },
            });
        }
    };

    const render = () => {
        const encoder = args.device.createCommandEncoder();
        args.renderPassDescriptor.colorAttachments[0].view = args.context.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass(args.renderPassDescriptor);

        for (const pipeline of renderTree.pipelines) {
            pass.setPipeline(pipeline.pipeline);

            // TODO: There is no real benefit of having multiple bindgroups if they are always set together.
            // In case of the scene it might be easier to split lights from cameras, but thats a setup problem.
            for (const sceneBindGroup of pipeline.bindGroups) {
                pass.setBindGroup(sceneBindGroup.group, sceneBindGroup.bindGroup);
                for (const uniform of sceneBindGroup.uniforms) {
                    args.device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
                }
            }

            // TODO: There is no real benefit of having multiple bindgroups if they are always set together.
            // Would make more sense if we group certain entities by material or transform for example
            for (const entity of pipeline.entities) {
                for (const entityBindGroup of entity.bindGroups) {
                    pass.setBindGroup(entityBindGroup.group, entityBindGroup.bindGroup);
                    for (const uniform of entityBindGroup.uniforms) {
                        args.device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
                    }
                }

                for (const vertex of entity.mesh.vertex.buffers) {
                    pass.setVertexBuffer(vertex.slot, vertex.buffer);
                }

                if (entity.mesh.index) {
                    pass.setIndexBuffer(entity.mesh.index.buffer, entity.mesh.index.format);
                    pass.drawIndexed(entity.mesh.index.count);
                } else {
                    pass.draw(entity.mesh.vertex.count);
                }
            }
        }

        pass.end();
        args.device.queue.submit([encoder.finish()]);
    };

    return { setUniform, addEntity, render };
};
