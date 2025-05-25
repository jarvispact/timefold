import {
    RenderPassDescriptor,
    WebgpuUtils,
    Uniform,
    defineRenderPass,
    RenderPipelineContext,
    GenericCreateVertexBufferLayoutResult,
} from '@timefold/webgpu';
import { DepthPass } from './depth-pass';
import {
    GenericTypedArray,
    NonInterleavedAttributes,
    PrimitiveComponent,
    UnlitMaterialComponent,
} from '../../components';
import { CameraStruct, TransformStruct, UnlitMaterialStruct } from '../../structs';

type VertexBuffer = { slot: number; buffer: GPUBuffer };
type Vertex = { buffers: VertexBuffer[]; count: number };
type Index = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };

type MaterialBindGroup = {
    group: number;
    bindgroup: GPUBindGroup;
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

type TransformBindGroup = {
    group: number;
    bindgroup: GPUBindGroup;
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

type ColorPassPrimitive = {
    vertex: Vertex;
    index?: Index;
    transforms: TransformBindGroup[];
};

type ColorPassEntity = {
    material: MaterialBindGroup;
    primitives: Map<PrimitiveComponent, ColorPassPrimitive>;
};

const getShaderCode = (uniformsWgsl: string, vertexWgsl: string) => {
    const code = /* wgsl */ `
${vertexWgsl}

${uniformsWgsl}

@vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
    return camera.view_projection_matrix * transform.model_matrix * vec4f(vert.position, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
    return vec4f(material.color, 1.0);
}
    `.trim();

    return code;
};

const getData = (attribs: NonInterleavedAttributes) => {
    const data = {} as { position: Float32Array } & Record<string, GenericTypedArray>;

    for (const key of Object.keys(attribs)) {
        data[key] = attribs[key].data;
    }

    return data;
};

export const ColorPass = defineRenderPass({
    name: 'ColorPass',
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

        const CameraGroup = Uniform.group(0, {
            camera: Uniform.buffer(0, CameraStruct),
        });

        const MaterialGroup = Uniform.group(1, {
            material: Uniform.buffer(0, UnlitMaterialStruct),
        });

        const TransformGroup = Uniform.group(2, {
            transform: Uniform.buffer(0, TransformStruct),
        });

        const PipelineLayout = WebgpuUtils.createPipelineLayout({
            device: device,
            uniformGroups: [CameraGroup, MaterialGroup, TransformGroup],
        });

        const pipelineMap = new Map<
            PrimitiveComponent,
            {
                pipeline: GPURenderPipeline;
                primitiveLayout: GenericCreateVertexBufferLayoutResult;
                materialMap: Map<UnlitMaterialComponent, ColorPassEntity>;
            }
        >();

        const frameGroup = PipelineLayout.createBindGroups(0, {
            camera: WebgpuUtils.createBufferDescriptor(),
        });

        let camera: ArrayBufferLike = new ArrayBuffer(0);

        return {
            setCamera: (cameraData: ArrayBufferLike) => {
                camera = cameraData;
            },
            addEntity: (
                material: UnlitMaterialComponent,
                materialData: ArrayBufferLike,
                primitive: PrimitiveComponent,
                transform: ArrayBufferLike,
            ) => {
                if (!pipelineMap.has(primitive)) {
                    const uniformsWgsl = Uniform.getWgslFromGroups(PipelineLayout.uniformGroups);

                    const primitiveLayout =
                        primitive.data.mode === 'interleaved'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', primitive.data.attributes);

                    const module = device.createShaderModule({
                        code: getShaderCode(uniformsWgsl, primitiveLayout.wgsl),
                    });

                    const pipeline = device.createRenderPipeline({
                        layout: PipelineLayout.layout,
                        vertex: { module, buffers: primitiveLayout.layout },
                        primitive: primitive.data.primitive,
                        fragment: { module, targets: [{ format }] },
                        depthStencil: { depthWriteEnabled: false, depthCompare: 'less-equal', format: 'depth24plus' },
                        multisample: { count: msaa },
                    });

                    pipelineMap.set(primitive, { pipeline, primitiveLayout, materialMap: new Map() });
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const pipeline = pipelineMap.get(primitive)!;

                if (!pipeline.materialMap.has(material)) {
                    const materialBindgroup = PipelineLayout.createBindGroups(1, {
                        material: WebgpuUtils.createBufferDescriptor(),
                    });

                    pipeline.materialMap.set(material, {
                        material: {
                            group: materialBindgroup.group,
                            bindgroup: materialBindgroup.bindGroup,
                            buffer: materialBindgroup.buffers.material,
                            data: materialData,
                        },
                        primitives: new Map(),
                    });
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const materialEntry = pipeline.materialMap.get(material)!;

                if (!materialEntry.primitives.has(primitive)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const pipeline = pipelineMap.get(primitive)!;

                    const vertex =
                        pipeline.primitiveLayout.mode === 'interleaved'
                            ? primitive.data.mode === 'interleaved'
                                ? pipeline.primitiveLayout.createBuffer(device, primitive.data.vertices)
                                : undefined
                            : primitive.data.mode === 'non-interleaved'
                              ? pipeline.primitiveLayout.createBuffers(device, getData(primitive.data.attributes))
                              : undefined;

                    if (vertex === undefined) {
                        console.error(`Invalid`);
                        return;
                    }

                    const index = primitive.data.indices
                        ? WebgpuUtils.createIndexBuffer(device, {
                              format: primitive.data.indices instanceof Uint16Array ? 'uint16' : 'uint32',
                              data: primitive.data.indices,
                          })
                        : undefined;

                    materialEntry.primitives.set(primitive, {
                        vertex: {
                            buffers:
                                vertex.mode === 'interleaved'
                                    ? [{ buffer: vertex.buffer, slot: vertex.slot }]
                                    : Object.values(vertex.attribs),
                            count: vertex.mode === 'interleaved' ? vertex.count : vertex.attribs.position.count,
                        },
                        index,
                        transforms: [],
                    });
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const primitiveEntry = materialEntry.primitives.get(primitive)!;

                const transformBindgroup = PipelineLayout.createBindGroups(2, {
                    transform: WebgpuUtils.createBufferDescriptor(),
                });

                primitiveEntry.transforms.push({
                    group: transformBindgroup.group,
                    bindgroup: transformBindgroup.bindGroup,
                    buffer: transformBindgroup.buffers.transform,
                    data: transform,
                });
            },
            render: () => {
                if (msaa > 1) {
                    renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
                } else {
                    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
                }

                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);

                for (const pipeline of pipelineMap.values()) {
                    pass.setPipeline(pipeline.pipeline);

                    pass.setBindGroup(frameGroup.group, frameGroup.bindGroup);
                    device.queue.writeBuffer(frameGroup.buffers.camera, 0, camera);

                    for (const material of pipeline.materialMap.values()) {
                        pass.setBindGroup(material.material.group, material.material.bindgroup);
                        device.queue.writeBuffer(material.material.buffer, 0, material.material.data);

                        for (const primitive of material.primitives.values()) {
                            for (const vertex of primitive.vertex.buffers) {
                                pass.setVertexBuffer(vertex.slot, vertex.buffer);
                            }

                            if (primitive.index) {
                                pass.setIndexBuffer(primitive.index.buffer, primitive.index.format);
                            }

                            for (const transform of primitive.transforms) {
                                pass.setBindGroup(transform.group, transform.bindgroup);
                                device.queue.writeBuffer(transform.buffer, 0, transform.data);

                                if (primitive.index) {
                                    pass.drawIndexed(primitive.index.count);
                                } else {
                                    pass.draw(primitive.vertex.count);
                                }
                            }
                        }
                    }
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            },
        };
    },
});
