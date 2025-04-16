import { RenderPassDescriptor, WebgpuUtils } from '@timefold/webgpu';

type Indices = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };

type InterleavedPrimitive = {
    type: 'interleaved';
    vertices: { slot: number; buffer: GPUBuffer; count: number };
    indices?: Indices;
};

type NonInterleavedPrimitive = {
    type: 'non-interleaved';
    position: { slot: number; buffer: GPUBuffer; count: number };
    indices?: Indices;
    attributes: { slot: number; buffer: GPUBuffer }[];
};

type Uniform = { buffer: GPUBuffer; data: ArrayBufferLike };

type UniformGroup = {
    bindgroupIndex: number;
    bindgroup: GPUBindGroup;
    uniforms: Uniform[];
};

type RenderTree = {
    pipelines: {
        pipeline: GPURenderPipeline;
        sceneLayout: GPUBindGroupLayout;
        entityLayout: GPUBindGroupLayout;
        uniformGroup: UniformGroup;
        primitives: {
            primitive: InterleavedPrimitive | NonInterleavedPrimitive;
            entities: UniformGroup[];
        }[];
        primitiveIdToIdx: Record<string, number | undefined>;
    }[];
    pipelineIdToIdx: Record<string, number | undefined>;
};

type CreateRendererArgs = {
    canvas: HTMLCanvasElement;
    materials: Record<
        string,
        (device: GPUDevice) => {
            module: GPUShaderModule;
            layout: GPUPipelineLayout;
            sceneLayout: GPUBindGroupLayout;
            entityLayout: GPUBindGroupLayout;
            bufferLayout: GPUVertexBufferLayout[];
            sceneUniforms: ArrayBufferLike;
        }
    >;
};

export const createRenderer = async ({ canvas, materials }: CreateRendererArgs) => {
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

    const renderTree: RenderTree = {
        pipelines: [],
        pipelineIdToIdx: {},
    };

    const materialKeys = Object.keys(materials);

    for (let mki = 0; mki < materialKeys.length; mki++) {
        const materialKey = materialKeys[mki];
        const material = materials[materialKey](device);

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

        const buffer = device.createBuffer({
            size: material.sceneUniforms.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindgroup = device.createBindGroup({
            layout: material.sceneLayout,
            entries: [{ binding: 0, resource: { buffer } }],
        });

        renderTree.pipelines.push({
            pipeline,
            sceneLayout: material.sceneLayout,
            entityLayout: material.entityLayout,
            primitives: [],
            primitiveIdToIdx: {},
            uniformGroup: { bindgroupIndex: 0, bindgroup, uniforms: [{ buffer, data: material.sceneUniforms }] },
        });

        renderTree.pipelineIdToIdx[materialKey] = renderTree.pipelines.length - 1;
    }

    const registerPrimitive = (materialId: string, primitiveId: string, geometry: Float32Array) => {
        const pipelineIdx = renderTree.pipelineIdToIdx[materialId];
        if (pipelineIdx === undefined) return;

        const pipeline = renderTree.pipelines[pipelineIdx];

        if (pipeline.primitiveIdToIdx[primitiveId] !== undefined) return;

        const geometryBuffer = device.createBuffer({
            size: geometry.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(geometryBuffer, 0, geometry);

        pipeline.primitives.push({
            primitive: {
                type: 'interleaved',
                vertices: { slot: 0, buffer: geometryBuffer, count: geometry.length / 3 },
            },
            entities: [],
        });

        pipeline.primitiveIdToIdx[primitiveId] = pipeline.primitives.length - 1;
    };

    const addEntity = (materialId: string, primitiveId: string, uniforms: ArrayBufferLike) => {
        const pipelineIdx = renderTree.pipelineIdToIdx[materialId];
        if (pipelineIdx === undefined) return;

        const pipeline = renderTree.pipelines[pipelineIdx];

        const primitiveIdx = pipeline.primitiveIdToIdx[primitiveId];
        if (primitiveIdx === undefined) return;

        const uniformBuffer = device.createBuffer({
            size: uniforms.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindgroup = device.createBindGroup({
            layout: pipeline.entityLayout,
            entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
        });

        pipeline.primitives[primitiveIdx].entities.push({
            bindgroupIndex: 1,
            bindgroup,
            uniforms: [{ buffer: uniformBuffer, data: uniforms }],
        });
    };

    const renderPassDescriptor: RenderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    const render = () => {
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
                const primitive = pipeline.primitives[gi];

                if (primitive.primitive.type === 'interleaved') {
                    pass.setVertexBuffer(primitive.primitive.vertices.slot, primitive.primitive.vertices.buffer);

                    if (primitive.primitive.indices) {
                        pass.setIndexBuffer(primitive.primitive.indices.buffer, primitive.primitive.indices.format);
                    }
                } else {
                    pass.setVertexBuffer(primitive.primitive.position.slot, primitive.primitive.position.buffer);

                    if (primitive.primitive.indices) {
                        pass.setIndexBuffer(primitive.primitive.indices.buffer, primitive.primitive.indices.format);
                    }

                    for (let ai = 0; ai < primitive.primitive.attributes.length; ai++) {
                        const attrib = primitive.primitive.attributes[ai];
                        pass.setVertexBuffer(attrib.slot, attrib.buffer);
                    }
                }

                for (let ei = 0; ei < primitive.entities.length; ei++) {
                    const entity = primitive.entities[ei];

                    pass.setBindGroup(entity.bindgroupIndex, entity.bindgroup);
                    for (let eui = 0; eui < entity.uniforms.length; eui++) {
                        const uniform = entity.uniforms[eui];
                        device.queue.writeBuffer(uniform.buffer, 0, uniform.data);
                    }

                    if (primitive.primitive.indices) {
                        pass.drawIndexed(primitive.primitive.indices.count);
                    } else if (primitive.primitive.type === 'interleaved') {
                        pass.draw(primitive.primitive.vertices.count);
                    } else {
                        pass.draw(primitive.primitive.position.count);
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
