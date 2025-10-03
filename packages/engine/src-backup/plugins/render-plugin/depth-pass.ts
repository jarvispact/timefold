/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EntityId } from '@timefold/ecs';
import { defineRenderPass, RenderPassDescriptor, RenderPipelineContext, Uniform, WebgpuUtils } from '@timefold/webgpu';
import { PrimitiveComponent } from '../../components';
import { CameraStruct, TransformStruct } from '../../structs';
import {
    Bindgroup,
    BindgroupResult,
    getVertexAndIndexFromPrimitive,
    RenderablePrimitive,
    serializePrimitiveLayout,
} from './internal-utils';

type Entity = {
    id: EntityId;
    primitive: PrimitiveComponent;
    transformData: ArrayBufferLike;
};

type FrameBindgroupResult = BindgroupResult<{
    camera: GPUBuffer;
}>;

type RenderPipeline = { pipeline: GPURenderPipeline; frameBindgroup: FrameBindgroupResult };
type RenderPipelineMapEntry = RenderPipeline & { count: number };
type RenderPipelineMap = Map<string, RenderPipelineMapEntry>;

type PrimitiveMapEntry = RenderablePrimitive & { count: number };
type PrimitiveMap = Map<PrimitiveComponent, PrimitiveMapEntry>;

type Renderable = {
    id: Entity['id'];
    sortId: number;
    pipelineId: number;
    primitiveId: number;
    pipeline: RenderPipeline;
    primitive: RenderablePrimitive;
    transform: Bindgroup;
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

const DepthPassName = 'DepthPass' as const;

export const NoOpDepthPass = {
    name: DepthPassName,
    build: () => {
        return {
            setCamera: () => {},
            addEntity: () => {},
            render: () => {},
            context: {},
        };
    },
};

export const DepthPass = defineRenderPass({
    name: DepthPassName,
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

        const pipelineMap: RenderPipelineMap = new Map();
        let pipelineCounter = -1;

        const primitiveMap: PrimitiveMap = new Map();
        let primitiveCounter = -1;

        let camera: ArrayBufferLike = new ArrayBuffer();

        return {
            setCamera: (cameraData: ArrayBufferLike) => {
                camera = cameraData;
            },
            addEntity: (entity: Entity) => {
                const pipelineMapKey = serializePrimitiveLayout(entity.primitive);

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

                    pipelineCounter++;
                    pipelineMap.set(pipelineMapKey, { pipeline, frameBindgroup, count: pipelineCounter });
                }

                if (!primitiveMap.has(entity.primitive)) {
                    const primitiveLayout =
                        entity.primitive.type === '@tf/InterleavedPrimitive'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', entity.primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', entity.primitive.data.attributes);

                    const result = getVertexAndIndexFromPrimitive(device, primitiveLayout, entity.primitive);
                    if (result) {
                        primitiveCounter++;
                        primitiveMap.set(entity.primitive, {
                            vertex: result.vertex,
                            index: result.index,
                            count: primitiveCounter,
                        });
                    }
                }

                const pipelineEntry = pipelineMap.get(pipelineMapKey)!;
                const primitiveEntry = primitiveMap.get(entity.primitive)!;

                const pipelineId = pipelineEntry.count;
                const primitiveId = primitiveEntry.count;
                const sortId = (pipelineId << 8) | primitiveId;

                const transformBindgroup = PipelineLayout.createBindGroups(1, {
                    transform: WebgpuUtils.createBufferDescriptor(),
                });

                renderables.push({
                    id: entity.id,
                    sortId,
                    pipelineId,
                    primitiveId,
                    pipeline: pipelineEntry,
                    primitive: primitiveEntry,
                    transform: {
                        group: transformBindgroup.group,
                        bindgroup: transformBindgroup.bindGroup,
                        binding: {
                            buffer: transformBindgroup.buffers.transform,
                            data: entity.transformData,
                        },
                    },
                });

                renderables.sort((a, b) => a.sortId - b.sortId);
            },
            render: () => {
                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);

                for (let i = 0; i < renderables.length; i++) {
                    const prevRenderable = renderables[i - 1] as Renderable | undefined;
                    const renderable = renderables[i];

                    if (!prevRenderable || renderable.pipelineId !== prevRenderable.pipelineId) {
                        pass.setPipeline(renderable.pipeline.pipeline);

                        pass.setBindGroup(
                            renderable.pipeline.frameBindgroup.group,
                            renderable.pipeline.frameBindgroup.bindGroup,
                        );

                        device.queue.writeBuffer(renderable.pipeline.frameBindgroup.buffers.camera, 0, camera);
                    }

                    if (!prevRenderable || renderable.primitiveId !== prevRenderable.primitiveId) {
                        for (const vertex of renderable.primitive.vertex.buffers) {
                            pass.setVertexBuffer(vertex.slot, vertex.buffer);
                        }

                        if (renderable.primitive.index) {
                            pass.setIndexBuffer(renderable.primitive.index.buffer, renderable.primitive.index.format);
                        }
                    }

                    pass.setBindGroup(renderable.transform.group, renderable.transform.bindgroup);
                    device.queue.writeBuffer(renderable.transform.binding.buffer, 0, renderable.transform.binding.data);

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
