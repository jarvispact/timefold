/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EntityId } from '@timefold/ecs';
import { defineRenderPass, RenderPassDescriptor, RenderPipelineContext, Uniform, WebgpuUtils } from '@timefold/webgpu';
import { MaterialComponent, PrimitiveComponent } from '../../components';
import {
    CameraStruct,
    DirLightStructArray,
    PhongMaterialStruct,
    TransformStruct,
    UnlitMaterialStruct,
} from '../../structs';
import { DepthPass } from './depth-pass';
import {
    Bindgroup,
    BindgroupResult,
    getVertexAndIndexFromPrimitive,
    RenderablePrimitive,
    serializePrimitiveLayout,
} from './internal-utils';
import { getPhongShaderCode } from './shaders/phong';
import { getUnlitShaderCode } from './shaders/unlit';

type Entity = {
    id: EntityId;
    material: MaterialComponent;
    materialData: ArrayBufferLike;
    primitive: PrimitiveComponent;
    transformData: ArrayBufferLike;
};

type FrameBindgroupResult = BindgroupResult<{
    dir_lights: GPUBuffer;
    camera: GPUBuffer;
}>;

type RenderPipeline = { pipeline: GPURenderPipeline; frameBindgroup: FrameBindgroupResult };
type RenderPipelineMapEntry = RenderPipeline & { count: number };
type RenderPipelineMap = Map<string, RenderPipelineMapEntry>;

type MaterialMapEntry = { material: Bindgroup; count: number };
type MaterialMap = Map<MaterialComponent, MaterialMapEntry>;

type PrimitiveMapEntry = RenderablePrimitive & { count: number };
type PrimitiveMap = Map<PrimitiveComponent, PrimitiveMapEntry>;

type Renderable = {
    id: Entity['id'];
    sortId: number;
    pipelineId: number;
    materialId: number;
    primitiveId: number;
    pipeline: RenderPipeline;
    material: Bindgroup;
    primitive: RenderablePrimitive;
    transform: Bindgroup;
};

const hasDepthPrePass = (ctx: RenderPipelineContext): ctx is RenderPipelineContext<[typeof DepthPass]> =>
    'DepthPass' in ctx &&
    typeof ctx.DepthPass === 'object' &&
    !!ctx.DepthPass &&
    'depthTexture' in ctx.DepthPass &&
    ctx.DepthPass.depthTexture instanceof GPUTexture;

export const MultiMaterialPass = defineRenderPass({
    name: 'MultiMaterialPass',
    build: (ctx: RenderPipelineContext) => {
        const { device, canvas, context, format, msaa } = ctx.args;

        const usesDepthPrePass = hasDepthPrePass(ctx);

        const depthTexture = usesDepthPrePass
            ? ctx.DepthPass.depthTexture
            : device.createTexture({
                  size: [canvas.width, canvas.height],
                  format: 'depth24plus',
                  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                  sampleCount: msaa,
              });

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
                depthLoadOp: usesDepthPrePass ? 'load' : 'clear', // Important!!!
                depthStoreOp: usesDepthPrePass ? 'discard' : 'store', // TODO: check if this is correct!!!
            }),
        };

        const FrameGroup = Uniform.group(0, {
            dir_lights: Uniform.buffer(0, DirLightStructArray),
            camera: Uniform.buffer(1, CameraStruct),
        });

        const UnlitMaterialGroup = Uniform.group(1, {
            material: Uniform.buffer(0, UnlitMaterialStruct),
        });

        const PhongMaterialGroup = Uniform.group(1, {
            material: Uniform.buffer(0, PhongMaterialStruct),
        });

        const TransformGroup = Uniform.group(2, {
            transform: Uniform.buffer(0, TransformStruct),
        });

        const PipelineLayoutsByMaterialType = {
            '@tf/UnlitMaterial': WebgpuUtils.createPipelineLayout({
                device: device,
                uniformGroups: [FrameGroup, UnlitMaterialGroup, TransformGroup],
            }),
            '@tf/PhongMaterial': WebgpuUtils.createPipelineLayout({
                device: device,
                uniformGroups: [FrameGroup, PhongMaterialGroup, TransformGroup],
            }),
        };

        const frameData = {
            dirLights: new ArrayBuffer(0),
            camera: new ArrayBuffer(0),
        };

        const renderables: Renderable[] = [];

        const pipelineMap: RenderPipelineMap = new Map();
        let pipelineCounter = -1;

        const materialMap: MaterialMap = new Map();
        let materialCounter = -1;

        const primitiveMap: PrimitiveMap = new Map();
        let primitiveCounter = -1;

        // TODO: add unit tests that ensure that the minimum amount of pipeline switches happen

        return {
            setDirLights: (lights: ArrayBufferLike) => {
                frameData.dirLights = lights;
            },
            setCamera: (camera: ArrayBufferLike) => {
                frameData.camera = camera;
            },
            addEntity: (entity: Entity) => {
                const pipelineMapKey = `${entity.material.type}-${serializePrimitiveLayout(entity.primitive)}`;
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
                        depthStencil: {
                            depthWriteEnabled: usesDepthPrePass ? false : true,
                            depthCompare: 'less-equal',
                            format: 'depth24plus',
                        },
                        multisample: { count: msaa },
                    });

                    const frameBindgroup = PipelineLayout.createBindGroups(0, {
                        dir_lights: WebgpuUtils.createBufferDescriptor(),
                        camera: WebgpuUtils.createBufferDescriptor(),
                    });

                    pipelineCounter++;
                    pipelineMap.set(pipelineMapKey, { pipeline, frameBindgroup, count: pipelineCounter });
                }

                if (!materialMap.has(entity.material)) {
                    const materialBindgroup = PipelineLayout.createBindGroups(1, {
                        material: WebgpuUtils.createBufferDescriptor(),
                    });

                    materialCounter++;
                    materialMap.set(entity.material, {
                        material: {
                            group: materialBindgroup.group,
                            bindgroup: materialBindgroup.bindGroup,
                            binding: { buffer: materialBindgroup.buffers.material, data: entity.materialData },
                        },
                        count: materialCounter,
                    });
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
                const materialEntry = materialMap.get(entity.material)!;
                const primitiveEntry = primitiveMap.get(entity.primitive)!;

                const pipelineId = pipelineEntry.count;
                const materialId = materialEntry.count;
                const primitiveId = primitiveEntry.count;
                const sortId = (pipelineId << 16) | (materialId << 8) | primitiveId;

                const transformBindgroup = PipelineLayout.createBindGroups(2, {
                    transform: WebgpuUtils.createBufferDescriptor(),
                });

                renderables.push({
                    id: entity.id,
                    sortId,
                    pipelineId,
                    materialId,
                    primitiveId,
                    pipeline: pipelineEntry,
                    material: materialEntry.material,
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

                    if (!prevRenderable || renderable.pipelineId !== prevRenderable.pipelineId) {
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

                    if (!prevRenderable || renderable.materialId !== prevRenderable.materialId) {
                        pass.setBindGroup(renderable.material.group, renderable.material.bindgroup);
                        device.queue.writeBuffer(
                            renderable.material.binding.buffer,
                            0,
                            renderable.material.binding.data,
                        );
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
        };
    },
});
