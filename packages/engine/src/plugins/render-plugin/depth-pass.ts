import {
    RenderPassDescriptor,
    Uniform,
    WebgpuUtils,
    defineRenderPass,
    RenderPipelineContext,
    GenericCreateVertexBufferLayoutResult,
} from '@timefold/webgpu';
import { PrimitiveComponent } from '../../components';
import { CameraStruct, TransformStruct } from '../../structs';
import { getVertexAndIndexFromPrimitive } from './internal-utils';

type VertexBuffer = { slot: number; buffer: GPUBuffer };
type Vertex = { buffers: VertexBuffer[]; count: number };
type Index = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };

type TransformBindgroup = {
    group: number;
    bindgroup: GPUBindGroup;
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

type DepthPrePassEntity = {
    vertex: Vertex;
    index?: Index;
    transforms: TransformBindgroup[];
};

const getShaderCode = (uniformsWgsl: string, vertexWgsl: string) => {
    const code = /* wgsl */ `
${vertexWgsl}

${uniformsWgsl}

@vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
    return camera.view_projection_matrix * transform.model_matrix * vec4f(vert.position, 1.0);
}
    `.trim();

    return code;
};

export const DepthPass = defineRenderPass({
    name: 'DepthPass',
    build: (ctx: RenderPipelineContext) => {
        const { device, canvas, msaa } = ctx.args;

        const depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            sampleCount: msaa,
        });

        const renderPassDescriptor: RenderPassDescriptor = {
            colorAttachments: [],
            depthStencilAttachment: WebgpuUtils.createDepthAttachmentFromView(depthTexture.createView()),
        };

        const CameraGroup = Uniform.group(0, {
            camera: Uniform.buffer(0, CameraStruct),
        });

        const EntityGroup = Uniform.group(1, {
            transform: Uniform.buffer(0, TransformStruct),
        });

        const PipelineLayout = WebgpuUtils.createPipelineLayout({
            device: device,
            uniformGroups: [CameraGroup, EntityGroup],
        });

        const pipelineMap = new Map<
            PrimitiveComponent,
            {
                pipeline: GPURenderPipeline;
                primitiveLayout: GenericCreateVertexBufferLayoutResult;
                primitiveMap: Map<PrimitiveComponent, DepthPrePassEntity>;
            }
        >();

        const frameBindgroup = PipelineLayout.createBindGroups(0, {
            camera: WebgpuUtils.createBufferDescriptor(),
        });

        let camera: ArrayBufferLike = new ArrayBuffer();

        return {
            setCamera: (cameraData: ArrayBufferLike) => {
                camera = cameraData;
            },
            addEntity: (primitive: PrimitiveComponent, transform: ArrayBufferLike) => {
                if (!pipelineMap.has(primitive)) {
                    const uniformsWgsl = Uniform.getWgslFromGroups(PipelineLayout.uniformGroups);

                    const primitiveLayout =
                        primitive.type === '@tf/InterleavedPrimitive'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', primitive.data.attributes);

                    const module = device.createShaderModule({
                        code: getShaderCode(uniformsWgsl, primitiveLayout.wgsl),
                    });

                    const pipeline = device.createRenderPipeline({
                        layout: PipelineLayout.layout,
                        vertex: { module, buffers: primitiveLayout.layout },
                        primitive: primitive.data.primitive,
                        depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
                        multisample: { count: msaa },
                    });

                    pipelineMap.set(primitive, { pipeline, primitiveLayout, primitiveMap: new Map() });
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const pipeline = pipelineMap.get(primitive)!;

                if (!pipeline.primitiveMap.has(primitive)) {
                    const result = getVertexAndIndexFromPrimitive(device, pipeline.primitiveLayout, primitive);
                    if (!result) {
                        console.error('Invalid');
                        return;
                    }

                    pipeline.primitiveMap.set(primitive, { ...result, transforms: [] });
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const mapEntry = pipeline.primitiveMap.get(primitive)!;

                const entityBindgroup = PipelineLayout.createBindGroups(1, {
                    transform: WebgpuUtils.createBufferDescriptor(),
                });

                mapEntry.transforms.push({
                    group: entityBindgroup.group,
                    bindgroup: entityBindgroup.bindGroup,
                    buffer: entityBindgroup.buffers.transform,
                    data: transform,
                });
            },
            render: () => {
                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);

                for (const pipeline of pipelineMap.values()) {
                    pass.setPipeline(pipeline.pipeline);

                    pass.setBindGroup(frameBindgroup.group, frameBindgroup.bindGroup);
                    device.queue.writeBuffer(frameBindgroup.buffers.camera, 0, camera);

                    for (const primitive of pipeline.primitiveMap.values()) {
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

                pass.end();
                device.queue.submit([encoder.finish()]);
            },
            context: { depthTexture },
        };
    },
});
