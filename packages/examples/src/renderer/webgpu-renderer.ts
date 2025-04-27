import { GenericVertexBufferResult, RenderPassDescriptor } from '@timefold/webgpu';
import { CreateRenderPipelineArgs } from './render-pipeline';

type Assume<T, V> = T extends V ? T : never;
type AssumeString<T> = Assume<T, string>;

// ========================================
// MaterialTemplates and PrimitiveTemplates

type MaterialTemplate<Buffers extends Record<string, GPUBuffer>> = {
    layout: GPUPipelineLayout;
    materialBindGroups: {
        group: number;
        bindGroup: GPUBindGroup;
        buffers: Buffers;
    };
    module: GPUShaderModule;
    uniforms: { [K in keyof Buffers]: ArrayBufferLike };
};

type PrimitiveTemplate = {
    topology: GPUPrimitiveTopology;
    cullMode: GPUCullMode;
    layout: GPUVertexBufferLayout[];
};

type GenericMaterialTemplates = Record<string, MaterialTemplate<Record<string, GPUBuffer>>>;
type GenericPrimitiveTemplates = Record<string, PrimitiveTemplate>;

export const defineMaterialTemplate = <Buffers extends Record<string, GPUBuffer>>(args: MaterialTemplate<Buffers>) =>
    args;

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

type Mesh<MaterialTemplate, PrimitiveTemplate> = {
    material: { template: MaterialTemplate; transparent?: boolean };
    primitive: {
        template: PrimitiveTemplate;
        vertex: GenericVertexBufferResult;
        index?: Index;
    };
};

type Entity<
    Buffers extends Record<string, GPUBuffer>,
    MaterialTemplate extends string,
    PrimitiveTemplate extends string,
> = {
    id: string | number;
    entityBindGroups: {
        group: number;
        bindGroup: GPUBindGroup;
        buffers: Buffers;
    };
    uniforms: { [K in keyof Buffers]: ArrayBufferLike };
    mesh: Mesh<MaterialTemplate, PrimitiveTemplate> | Mesh<MaterialTemplate, PrimitiveTemplate>[];
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

type RenderTree = {
    pipelines: {
        pipeline: GPURenderPipeline;
        materialTemplate: {
            group: number;
            bindGroup: GPUBindGroup;
            uniforms: { buffer: GPUBuffer; data: ArrayBufferLike }[];
        };
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
                materialTemplate: {
                    group: materialTemplate.materialBindGroups.group,
                    bindGroup: materialTemplate.materialBindGroups.bindGroup,
                    uniforms: Object.keys(materialTemplate.materialBindGroups.buffers).map((bufferKey) => ({
                        buffer: materialTemplate.materialBindGroups.buffers[bufferKey],
                        data: materialTemplate.uniforms[bufferKey],
                    })),
                },
                entities: [],
            });
            const pipelineId = `${materialTemplateKey}-${primitiveTemplateKey}`;
            renderTree.pipelineIdToIdx[pipelineId] = renderTree.pipelines.length - 1;
        }
    }

    const addEntity = <Buffers extends Record<string, GPUBuffer>>(
        entity: Entity<Buffers, AssumeString<keyof MaterialTemplates>, AssumeString<keyof PrimitiveTemplates>>,
    ) => {
        const meshArray = Array.isArray(entity.mesh) ? entity.mesh : [entity.mesh];

        for (const meshPart of meshArray) {
            const pipelineId = `${meshPart.material.template}-${meshPart.primitive.template}`;
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
                entity: {
                    group: entity.entityBindGroups.group,
                    bindGroup: entity.entityBindGroups.bindGroup,
                    uniforms: Object.keys(entity.entityBindGroups.buffers).map((bufferKey) => ({
                        buffer: entity.entityBindGroups.buffers[bufferKey],
                        data: entity.uniforms[bufferKey],
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

            pass.setBindGroup(pipeline.materialTemplate.group, pipeline.materialTemplate.bindGroup);
            for (const uniform of pipeline.materialTemplate.uniforms) {
                args.device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
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
