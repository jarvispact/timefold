/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { RenderPassDescriptor, Uniform, WebgpuUtils, defineRenderPass, RenderPipelineContext } from '@timefold/webgpu';
import { InterleavedLayout, NonInterleavedAttributes, PrimitiveComponent } from '../../components';
import { CameraStruct, TransformStruct } from '../../structs';
import { getVertexAndIndexFromPrimitive, Index, Vertex } from './internal-utils';

type Entity = {
    id: string | number;
    primitive: PrimitiveComponent;
    transformData: ArrayBufferLike;
};

type FrameBindgroupResult = {
    group: number;
    bindGroup: GPUBindGroup;
    buffers: {
        camera: GPUBuffer;
    };
};

type TransformBindgroup = {
    group: number;
    bindgroup: GPUBindGroup;
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

type Renderable = {
    id: Entity['id'];
    sortId: number;
    pipeline: { pipeline: GPURenderPipeline; frameBindgroup: FrameBindgroupResult };
    primitive: { vertex: Vertex; index?: Index };
    transform: TransformBindgroup;
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

        const renderables: Renderable[] = [];

        const pipelineMap = new Map<string, { pipeline: GPURenderPipeline; frameBindgroup: FrameBindgroupResult }>();
        let pipelineCounter = -1;

        const primitiveMap = new Map<PrimitiveComponent, { vertex: Vertex; index?: Index }>();
        let primitiveCounter = -1;

        let camera: ArrayBufferLike = new ArrayBuffer();

        return {
            setCamera: (cameraData: ArrayBufferLike) => {
                camera = cameraData;
            },
            addEntity: (entity: Entity) => {
                const primtiveKey = serializePrimitiveState(entity.primitive.data.primitive);

                const layoutKey =
                    entity.primitive.type === '@tf/InterleavedPrimitive'
                        ? serializeLayout(entity.primitive.data.layout)
                        : serializeAttribs(entity.primitive.data.attributes);

                const pipelineMapKey = `${entity.primitive.type}-${primtiveKey}-${layoutKey}`;

                if (!pipelineMap.has(pipelineMapKey)) {
                    const uniformsWgsl = Uniform.getWgslFromGroups(PipelineLayout.uniformGroups);

                    const primitiveLayout =
                        entity.primitive.type === '@tf/InterleavedPrimitive'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', entity.primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', entity.primitive.data.attributes);

                    const module = device.createShaderModule({
                        code: getShaderCode(uniformsWgsl, primitiveLayout.wgsl),
                    });

                    const pipeline = device.createRenderPipeline({
                        layout: PipelineLayout.layout,
                        vertex: { module, buffers: primitiveLayout.layout },
                        primitive: entity.primitive.data.primitive,
                        depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
                        multisample: { count: msaa },
                    });

                    const frameBindgroup = PipelineLayout.createBindGroups(0, {
                        camera: WebgpuUtils.createBufferDescriptor(),
                    });

                    pipelineMap.set(pipelineMapKey, { pipeline, frameBindgroup });
                    pipelineCounter++;
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

                const pipeline = pipelineMap.get(pipelineMapKey)!;
                const primitive = primitiveMap.get(entity.primitive)!;

                const pipelineId = pipelineCounter;
                const primitiveId = primitiveCounter;
                const sortId = (pipelineId << 8) | primitiveId;

                const transformBindgroup = PipelineLayout.createBindGroups(1, {
                    transform: WebgpuUtils.createBufferDescriptor(),
                });

                renderables.push({
                    id: entity.id,
                    sortId,
                    pipeline,
                    transform: {
                        group: transformBindgroup.group,
                        bindgroup: transformBindgroup.bindGroup,
                        buffer: transformBindgroup.buffers.transform,
                        data: entity.transformData,
                    },
                    primitive,
                });

                renderables.sort((a, b) => a.sortId - b.sortId);
            },
            render: () => {
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

                        device.queue.writeBuffer(renderable.pipeline.frameBindgroup.buffers.camera, 0, camera);
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
                    pass.setBindGroup(renderable.transform.group, renderable.transform.bindgroup);
                    device.queue.writeBuffer(renderable.transform.buffer, 0, renderable.transform.data);

                    if (renderable.primitive.index) {
                        pass.drawIndexed(renderable.primitive.index.count);
                    } else {
                        pass.draw(renderable.primitive.vertex.count);
                    }
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            },
            context: { depthTexture },
        };
    },
});
