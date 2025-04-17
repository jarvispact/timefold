import { RenderPassDescriptor, WebgpuUtils } from '@timefold/webgpu';

type Assume<T, V> = T extends V ? T : never;
type AssumeString<T> = Assume<T, string>;

type Indices = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };

type Attribute = { slot: number; buffer: GPUBuffer };
type PositionAttribute = Attribute & { count: number };

type PipelineInterleavedPrimitive = {
    type: 'interleaved';
    vertices: PositionAttribute;
    indices?: Indices;
};

type PipelineNonInterleavedPrimitive = {
    type: 'non-interleaved';
    position: PositionAttribute;
    indices?: Indices;
    attributes: Attribute[];
};

type PipelinePrimitive = PipelineInterleavedPrimitive | PipelineNonInterleavedPrimitive;

type InterleavedPrimitive = {
    type: 'interleaved';
    vertices: Float32Array;
    indices?: Uint16Array | Uint32Array;
};

type NonInterleavedPrimitive = {
    type: 'non-interleaved';
    position: Float32Array;
    indices?: Uint16Array | Uint32Array;
    attributes: Record<string, Float32Array>;
};

type Primitive = InterleavedPrimitive | NonInterleavedPrimitive;

type Uniform = { buffer: GPUBuffer; data: ArrayBufferLike };

type UniformGroup = {
    bindgroupIndex: number;
    bindgroup: GPUBindGroup;
    uniforms: Uniform[];
};

type RenderTree = {
    pipelines: {
        pipeline: GPURenderPipeline;
        createEntityBindGroupAndBuffer: () => { bindgroup: GPUBindGroup; buffer: GPUBuffer };
        uniformGroup: UniformGroup;
        primitives: {
            primitive: PipelinePrimitive;
            entities: UniformGroup[];
        }[];
        primitiveIdToIdx: Record<string, number | undefined>;
    }[];
    pipelineIdToIdx: Record<string, number | undefined>;
};

type Material = {
    module: GPUShaderModule;
    layout: GPUPipelineLayout;
    sceneBuffer: GPUBuffer;
    sceneBindgroup: GPUBindGroup;
    bufferLayout: GPUVertexBufferLayout[];
    sceneUniforms: ArrayBufferLike;
    createEntityBindGroupAndBuffer: () => { bindgroup: GPUBindGroup; buffer: GPUBuffer };
};

type MaterialFactory = (args: { device: GPUDevice }) => Material;

type CreateRendererArgs<
    Materials extends Record<string, MaterialFactory>,
    Primitives extends Record<string, Primitive>,
> = {
    canvas: HTMLCanvasElement;
    materials: Materials;
    primitives: Primitives;
};

const getIndexFormatForIndices = (indices: Uint16Array | Uint32Array) => {
    if (indices instanceof Uint16Array) return 'uint16';
    return 'uint32';
};

export const createRenderer = async <
    Materials extends Record<string, MaterialFactory>,
    Primitives extends Record<string, Primitive>,
>({
    canvas,
    materials,
    // primitives,
}: CreateRendererArgs<Materials, Primitives>) => {
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

    const renderTree: RenderTree = {
        pipelines: [],
        pipelineIdToIdx: {},
    };

    const materialKeys = Object.keys(materials);

    for (let mki = 0; mki < materialKeys.length; mki++) {
        const materialKey = materialKeys[mki];
        const material = materials[materialKey]({ device });

        const pipeline = device.createRenderPipeline({
            layout: material.layout,
            vertex: {
                module: material.module,
                buffers: material.bufferLayout,
            },
            fragment: {
                module: material.module,
                targets: [{ format }],
            },
        });

        renderTree.pipelines.push({
            pipeline,
            primitives: [],
            primitiveIdToIdx: {},
            uniformGroup: {
                bindgroupIndex: 0,
                bindgroup: material.sceneBindgroup,
                uniforms: [{ buffer: material.sceneBuffer, data: material.sceneUniforms }],
            },
            createEntityBindGroupAndBuffer: material.createEntityBindGroupAndBuffer,
        });

        renderTree.pipelineIdToIdx[materialKey] = renderTree.pipelines.length - 1;
    }

    const registerPrimitive = (
        materialId: AssumeString<keyof Materials>,
        primitiveId: string,
        primitive: Primitive,
    ) => {
        const pipelineIdx = renderTree.pipelineIdToIdx[materialId];
        if (pipelineIdx === undefined) return;

        const pipeline = renderTree.pipelines[pipelineIdx];

        if (pipeline.primitiveIdToIdx[primitiveId] !== undefined) return;

        let pipelinePrimitive: PipelinePrimitive | undefined = undefined;

        if (primitive.type === 'interleaved') {
            const buffer = device.createBuffer({
                size: primitive.vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });

            device.queue.writeBuffer(buffer, 0, primitive.vertices);

            const indices = primitive.indices
                ? WebgpuUtils.createIndexBuffer(device, {
                      data: primitive.indices,
                      format: getIndexFormatForIndices(primitive.indices),
                  })
                : undefined;

            pipelinePrimitive = {
                type: 'interleaved',
                vertices: { slot: 0, buffer, count: primitive.vertices.length / 3 },
                indices: indices,
            };
        }

        if (primitive.type === 'non-interleaved') {
            const buffer = device.createBuffer({
                size: primitive.position.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });

            device.queue.writeBuffer(buffer, 0, primitive.position);

            const indices = primitive.indices
                ? WebgpuUtils.createIndexBuffer(device, {
                      data: primitive.indices,
                      format: getIndexFormatForIndices(primitive.indices),
                  })
                : undefined;

            pipelinePrimitive = {
                type: 'non-interleaved',
                position: { slot: 0, buffer, count: primitive.position.length / 3 },
                indices,
                attributes: [],
            };
        }

        if (!pipelinePrimitive) return;

        pipeline.primitives.push({
            primitive: pipelinePrimitive,
            entities: [],
        });

        pipeline.primitiveIdToIdx[primitiveId] = pipeline.primitives.length - 1;
    };

    const addEntity = (materialId: AssumeString<keyof Materials>, primitiveId: string, uniforms: ArrayBufferLike) => {
        const pipelineIdx = renderTree.pipelineIdToIdx[materialId];
        if (pipelineIdx === undefined) return;

        const pipeline = renderTree.pipelines[pipelineIdx];

        const primitiveIdx = pipeline.primitiveIdToIdx[primitiveId];
        if (primitiveIdx === undefined) return;

        const { bindgroup, buffer } = pipeline.createEntityBindGroupAndBuffer();

        pipeline.primitives[primitiveIdx].entities.push({
            bindgroupIndex: 1,
            bindgroup,
            uniforms: [{ buffer, data: uniforms }],
        });
    };

    const renderPassDescriptor: RenderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    const render = () => {
        console.log(renderTree);

        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        // loop over all pipelines
        for (let pi = 0; pi < renderTree.pipelines.length; pi++) {
            const pipeline = renderTree.pipelines[pi];
            pass.setPipeline(pipeline.pipeline);

            pass.setBindGroup(pipeline.uniformGroup.bindgroupIndex, pipeline.uniformGroup.bindgroup);
            for (let si = 0; si < pipeline.uniformGroup.uniforms.length; si++) {
                const uniform = pipeline.uniformGroup.uniforms[si];
                device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
            }

            // loop over all primitives
            for (let gi = 0; gi < pipeline.primitives.length; gi++) {
                const p = pipeline.primitives[gi];

                if (p.primitive.type === 'interleaved') {
                    pass.setVertexBuffer(p.primitive.vertices.slot, p.primitive.vertices.buffer);

                    if (p.primitive.indices) {
                        pass.setIndexBuffer(p.primitive.indices.buffer, p.primitive.indices.format);
                    }
                } else {
                    pass.setVertexBuffer(p.primitive.position.slot, p.primitive.position.buffer);

                    if (p.primitive.indices) {
                        pass.setIndexBuffer(p.primitive.indices.buffer, p.primitive.indices.format);
                    }

                    for (let ai = 0; ai < p.primitive.attributes.length; ai++) {
                        const attrib = p.primitive.attributes[ai];
                        pass.setVertexBuffer(attrib.slot, attrib.buffer);
                    }
                }

                for (let ei = 0; ei < p.entities.length; ei++) {
                    const entity = p.entities[ei];

                    pass.setBindGroup(entity.bindgroupIndex, entity.bindgroup);
                    for (let eui = 0; eui < entity.uniforms.length; eui++) {
                        const uniform = entity.uniforms[eui];
                        device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
                    }

                    if (p.primitive.indices) {
                        pass.drawIndexed(p.primitive.indices.count);
                    } else if (p.primitive.type === 'interleaved') {
                        pass.draw(p.primitive.vertices.count);
                    } else {
                        pass.draw(p.primitive.position.count);
                    }
                }
            }
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    return {
        registerPrimitive,
        addEntity,
        render,
    };
};
