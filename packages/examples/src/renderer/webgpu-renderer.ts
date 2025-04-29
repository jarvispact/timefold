import { GenericVertexBufferResult, RenderPassDescriptor } from '@timefold/webgpu';
import { CreateRenderPipelineArgs } from './render-pipeline';

// ========================================
// MaterialTemplates and PrimitiveTemplates

type MaterialTemplateBindGroup = {
    group: number;
    bindGroup: GPUBindGroup;
    buffers: Record<string, GPUBuffer>;
};

type MaterialTemplate<
    BindGroups extends Record<string, MaterialTemplateBindGroup>,
    EntityBuffers extends Record<string, GPUBuffer>,
> = {
    layout: GPUPipelineLayout;
    bindGroups: BindGroups;
    uniforms: {
        [GroupKey in keyof BindGroups]: {
            [BindingKey in keyof BindGroups[GroupKey]['buffers']]: ArrayBufferLike;
        };
    };
    module: GPUShaderModule;
    createEntityBindGroups: () => {
        group: number;
        bindGroup: GPUBindGroup;
        buffers: EntityBuffers;
    };
};

type PrimitiveTemplate = {
    topology: GPUPrimitiveTopology;
    cullMode: GPUCullMode;
    layout: GPUVertexBufferLayout[];
};

type GenericMaterialTemplates = Record<
    string,
    MaterialTemplate<Record<string, MaterialTemplateBindGroup>, Record<string, GPUBuffer>>
>;
type GenericPrimitiveTemplates = Record<string, PrimitiveTemplate>;

export const defineMaterialTemplate = <
    BindGroups extends Record<string, MaterialTemplateBindGroup>,
    EntityBuffers extends Record<string, GPUBuffer>,
>(
    args: MaterialTemplate<BindGroups, EntityBuffers>,
) => args;

type DefinePrimitiveTemplateArgs = {
    topology?: GPUPrimitiveTopology;
    cullMode?: GPUCullMode;
    layout: GPUVertexBufferLayout[];
};

export const definePrimitiveTemplate = (args: DefinePrimitiveTemplateArgs): PrimitiveTemplate => {
    return {
        topology: args.topology ?? 'triangle-list',
        cullMode: args.cullMode ?? 'back',
        layout: args.layout,
    };
};

// ========
// Renderer

export type CreateRendererArgs<
    MaterialTemplates extends GenericMaterialTemplates,
    PrimitiveTemplates extends GenericPrimitiveTemplates,
> = {
    [K in keyof CreateRenderPipelineArgs]: CreateRenderPipelineArgs[K];
} & {
    renderPassDescriptor: RenderPassDescriptor;
    materialTemplates: MaterialTemplates;
    primitiveTemplates: PrimitiveTemplates;
};

type VertexBuffer = { slot: number; buffer: GPUBuffer };
type Index = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };

type Mesh<MaterialTemplates extends GenericMaterialTemplates, PrimitiveTemplates extends GenericPrimitiveTemplates> = {
    material: {
        [Template in keyof MaterialTemplates]: {
            template: Template;
            uniforms: {
                [UniformKey in keyof ReturnType<
                    MaterialTemplates[Template]['createEntityBindGroups']
                >['buffers']]: ArrayBufferLike;
            };
        };
    }[keyof MaterialTemplates];
    primitive: {
        template: keyof PrimitiveTemplates;
        vertex: GenericVertexBufferResult;
        index?: Index;
    };
};

type Entity<
    MaterialTemplates extends GenericMaterialTemplates,
    PrimitiveTemplates extends GenericPrimitiveTemplates,
> = {
    id: string | number;
    mesh: Mesh<MaterialTemplates, PrimitiveTemplates> | Mesh<MaterialTemplates, PrimitiveTemplates>[];
};

type RenderEntity = {
    entity: {
        group: number;
        bindGroup: GPUBindGroup;
        uniforms: { buffer: GPUBuffer; data: ArrayBufferLike }[];
    };
    mesh: {
        vertex: { buffers: VertexBuffer[]; count: number };
        index?: Index;
    };
};

type RenderPipelineBindGroup = {
    group: number;
    bindGroup: GPUBindGroup;
    uniforms: { buffer: GPUBuffer; data: ArrayBufferLike }[];
};

type RenderTree = {
    pipelines: {
        pipeline: GPURenderPipeline;
        bindGroups: RenderPipelineBindGroup[];
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
                    targets: [{ format: args.format }],
                },
            });

            renderTree.pipelines.push({
                pipeline,
                bindGroups: Object.keys(materialTemplate.bindGroups).map((groupKey) => {
                    const bindGroup = materialTemplate.bindGroups[groupKey];
                    return {
                        group: bindGroup.group,
                        bindGroup: bindGroup.bindGroup,
                        uniforms: Object.keys(bindGroup.buffers).map((bindingKey) => ({
                            buffer: bindGroup.buffers[bindingKey],
                            data: materialTemplate.uniforms[groupKey][bindingKey],
                        })),
                    };
                }),
                entities: [],
            });
            const pipelineId = `${materialTemplateKey}-${primitiveTemplateKey}`;
            renderTree.pipelineIdToIdx[pipelineId] = renderTree.pipelines.length - 1;
        }
    }

    const addEntity = (entity: Entity<MaterialTemplates, PrimitiveTemplates>) => {
        const meshArray = Array.isArray(entity.mesh) ? entity.mesh : [entity.mesh];

        for (const meshPart of meshArray) {
            const materialTemplate = args.materialTemplates[meshPart.material.template];

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

            const entityBindGroups = materialTemplate.createEntityBindGroups();

            renderTree.pipelines[pipelineIdx].entities.push({
                entity: {
                    group: entityBindGroups.group,
                    bindGroup: entityBindGroups.bindGroup,
                    uniforms: Object.keys(entityBindGroups.buffers).map((bufferKey) => ({
                        buffer: entityBindGroups.buffers[bufferKey],
                        data: meshPart.material.uniforms[bufferKey],
                    })),
                },
                mesh: { vertex: { buffers, count }, index: meshPart.primitive.index },
            });
        }
    };

    const render = () => {
        const encoder = args.device.createCommandEncoder();
        const pass = encoder.beginRenderPass(args.renderPassDescriptor);

        for (const pipeline of renderTree.pipelines) {
            pass.setPipeline(pipeline.pipeline);

            for (const bindGroup of pipeline.bindGroups) {
                pass.setBindGroup(bindGroup.group, bindGroup.bindGroup);
                for (const uniform of bindGroup.uniforms) {
                    args.device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
                }
            }

            for (const entity of pipeline.entities) {
                pass.setBindGroup(entity.entity.group, entity.entity.bindGroup);
                for (const uniform of entity.entity.uniforms) {
                    args.device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
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

    return { addEntity, render };
};
