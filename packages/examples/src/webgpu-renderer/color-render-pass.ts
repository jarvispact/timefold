/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { definePipelinePass, PipelineContext, WebgpuUtils } from '@timefold/webgpu';

// Duplicate of @timefold/ecs to avoid dependency
type Component<ComponentType extends number = number, Data = undefined> = Data extends undefined
    ? { type: ComponentType }
    : { type: ComponentType; data: Data };

type BindGroup = {
    group: number;
    bindGroup: GPUBindGroup;
    entries: { buffer: GPUBuffer; data: ArrayBufferLike }[];
};

type InterleavedVertex = {
    slot: number;
    buffer: GPUBuffer;
    count: number;
};

type NonInterleavedVertex = {
    slot: number;
    buffer: GPUBuffer;
};

type Index = {
    buffer: GPUBuffer;
    format: 'uint16' | 'uint32';
    count: number;
};

type InterleavedPrimitive = {
    type: 'interleaved';
    vertex: InterleavedVertex;
    index?: Index;
};

type NonInterleavedPrimitive = {
    type: 'non-interleaved';
    positionsCount: number;
    buffers: NonInterleavedVertex[];
    index?: Index;
};

type OnNewMaterialTypeArgs<M extends Component> = {
    device: GPUDevice;
    material: M;
};

type OnNewMaterialTypeResult = {
    layout: GPUPipelineLayout;
    frameBindgroup: BindGroup;
    getShaderCode: (args: { vertexWgsl: string }) => string;
};

type OnNewGeometryTypeArgs<G extends Component> = {
    device: GPUDevice;
    geometry: G;
};

type OnNewGeometryTypeResult = {
    primitive: GPUPrimitiveState;
    layout: GPUVertexBufferLayout[];
    vertexWgsl: string;
};

type OnNewMaterialInstanceArgs<M extends Component> = {
    device: GPUDevice;
    material: M;
    data: ArrayBufferLike;
};

type OnNewMaterialInstanceResult = {
    bindGroup: BindGroup;
};

type OnNewGeometryInstanceArgs<G extends Component> = {
    device: GPUDevice;
    geometry: G;
};

type OnNewGeometryInstanceResult = {
    primitive: InterleavedPrimitive | NonInterleavedPrimitive;
};

type OnNewTransformArgs<M extends Component> = {
    device: GPUDevice;
    material: M;
    data: ArrayBufferLike;
};

type OnNewTransformResult = {
    bindGroup: BindGroup;
};

type ColorRenderPassArgs<M extends Component, G extends Component> = {
    onNewMaterialType: (args: OnNewMaterialTypeArgs<M>) => OnNewMaterialTypeResult;
    onNewGeometryType: (args: OnNewGeometryTypeArgs<G>) => OnNewGeometryTypeResult;
    onNewMaterialInstance: (args: OnNewMaterialInstanceArgs<M>) => OnNewMaterialInstanceResult;
    onNewGeometryInstance: (args: OnNewGeometryInstanceArgs<G>) => OnNewGeometryInstanceResult;
    onNewTransform: (args: OnNewTransformArgs<M>) => OnNewTransformResult;
};

type PipelineCacheMapEntry = {
    pipeline: GPURenderPipeline;
    materialResult: OnNewMaterialTypeResult;
    geometryResult: OnNewGeometryTypeResult;
};

type RenderEntity<M extends Component, G extends Component> = {
    id: number;
    material: M;
    geometry: G;
    materialData: ArrayBufferLike;
    transformData: ArrayBufferLike;
};

type RenderListItem = {
    sort: number;
    entityId: number;
    pipeline: GPURenderPipeline;
    frame: BindGroup;
    primitive: InterleavedPrimitive | NonInterleavedPrimitive;
    material: BindGroup;
    transform: BindGroup;
};

export function createColorRenderPass<M extends Component, G extends Component>({
    onNewMaterialType,
    onNewGeometryType,
    onNewMaterialInstance,
    onNewGeometryInstance,
    onNewTransform,
}: ColorRenderPassArgs<M, G>) {
    return definePipelinePass({
        name: 'ColorRenderPass',
        build({ args }: PipelineContext) {
            const { canvas, device, context, format, msaa } = args;
            const isMultiSampled = msaa > 1;

            const pipelineMap = new Map<string, PipelineCacheMapEntry>();
            const materialTypeCache = new Map<number, OnNewMaterialTypeResult>();
            const geometryTypeCache = new Map<number, OnNewGeometryTypeResult>();
            const materialInstanceCache = new WeakMap<M, OnNewMaterialInstanceResult>();
            const geometryInstanceCache = new WeakMap<G, OnNewGeometryInstanceResult>();
            const renderList: (RenderListItem | undefined)[] = [];
            let renderListNeedsSort = false;

            function getPipelineKey(material: M, geometry: G): string {
                return `${material.type}-${geometry.type}`;
            }

            function getOrCreatePipeline(material: M, geometry: G) {
                const pipelineKey = getPipelineKey(material, geometry);

                if (pipelineMap.has(pipelineKey)) {
                    return pipelineMap.get(pipelineKey)!;
                }

                let materialResult = materialTypeCache.get(material.type);
                if (!materialResult) {
                    materialResult = onNewMaterialType({ device, material });
                    materialTypeCache.set(material.type, materialResult);
                }

                let geometryResult = geometryTypeCache.get(geometry.type);
                if (!geometryResult) {
                    geometryResult = onNewGeometryType({ device, geometry });
                    geometryTypeCache.set(geometry.type, geometryResult);
                }

                const module = device.createShaderModule({
                    code: materialResult.getShaderCode({ vertexWgsl: geometryResult.vertexWgsl }),
                });

                const pipeline = device.createRenderPipeline({
                    label: `ColorRenderPassPipeline | Material ${material.type} | Geometry ${geometry.type}`,
                    layout: materialResult.layout,
                    primitive: geometryResult.primitive,
                    vertex: { module: module, buffers: geometryResult.layout },
                    fragment: { module, targets: [{ format }] },
                    multisample: isMultiSampled ? { count: msaa } : undefined,
                });

                const entry = { pipeline, materialResult, geometryResult };
                pipelineMap.set(pipelineKey, entry);
                return entry;
            }

            function getOrCreateMaterialInstance(material: M, data: ArrayBufferLike): OnNewMaterialInstanceResult {
                const cached = materialInstanceCache.get(material);
                if (cached) return cached;

                const result = onNewMaterialInstance({ device, material, data });
                materialInstanceCache.set(material, result);
                return result;
            }

            function getOrCreateGeometryInstance(geometry: G): OnNewGeometryInstanceResult {
                const cached = geometryInstanceCache.get(geometry);
                if (cached) return cached;

                const result = onNewGeometryInstance({ device, geometry });
                geometryInstanceCache.set(geometry, result);
                return result;
            }

            function createTransform(material: M, data: ArrayBufferLike): OnNewTransformResult {
                return onNewTransform({ device, material, data });
            }

            function addEntity(entity: RenderEntity<M, G>) {
                const result = getOrCreatePipeline(entity.material, entity.geometry);
                const materialInstance = getOrCreateMaterialInstance(entity.material, entity.materialData);
                const geometryInstance = getOrCreateGeometryInstance(entity.geometry);
                // TODO: Transform shouldnt be dependent on material
                const transform = createTransform(entity.material, entity.transformData);

                const sort = (entity.material.type << 16) | (entity.geometry.type << 8) | entity.id;

                renderList.push({
                    sort,
                    entityId: entity.id,
                    pipeline: result.pipeline,
                    frame: result.materialResult.frameBindgroup,
                    material: materialInstance.bindGroup,
                    primitive: geometryInstance.primitive,
                    transform: transform.bindGroup,
                });

                renderListNeedsSort = true;
            }

            function removeEntity(entity: RenderEntity<M, G>['id']) {
                let idx = -1;

                for (let i = 0; i < renderList.length; i++) {
                    const item = renderList[i];
                    if (item && item.entityId === entity) {
                        idx = i;
                        break;
                    }
                }

                if (idx === -1) return;
                renderList[idx] = undefined;
                renderListNeedsSort = true;
            }

            function createColorTexture(width: number, height: number) {
                return device.createTexture({
                    format,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                    size: [width, height],
                    sampleCount: msaa,
                });
            }

            let colorTexture = isMultiSampled
                ? createColorTexture(canvas.width, canvas.height)
                : context.getCurrentTexture();

            const renderPassDescriptor = {
                colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
            };

            function resize(width: number, height: number) {
                if (isMultiSampled) {
                    colorTexture.destroy();
                    colorTexture = createColorTexture(width, height);
                    renderPassDescriptor.colorAttachments[0] = WebgpuUtils.createColorAttachmentFromView(
                        colorTexture.createView(),
                    );
                }
            }

            const stats = {
                pipelineSwitches: 0,
                materialSwitches: 0,
                geometrySwitches: 0,
                drawCalls: 0,
            };

            function clearStats() {
                stats.pipelineSwitches = 0;
                stats.materialSwitches = 0;
                stats.geometrySwitches = 0;
                stats.drawCalls = 0;
            }

            function update(encoder: GPUCommandEncoder) {
                clearStats();

                if (renderListNeedsSort) {
                    renderList.sort((a, b) => a!.sort - b!.sort);
                    renderListNeedsSort = false;
                }

                if (isMultiSampled) {
                    renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
                } else {
                    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
                }

                const pass = encoder.beginRenderPass(renderPassDescriptor);

                for (let i = 0; i < renderList.length; i++) {
                    const currentItem = renderList[i];
                    if (!currentItem) continue;
                    const previousItem = i === 0 ? undefined : renderList[i - 1];

                    if (!previousItem || previousItem.pipeline !== currentItem.pipeline) {
                        stats.pipelineSwitches++;
                        pass.setPipeline(currentItem.pipeline);
                        pass.setBindGroup(currentItem.frame.group, currentItem.frame.bindGroup);
                        for (let j = 0; j < currentItem.frame.entries.length; j++) {
                            const entry = currentItem.frame.entries[j];
                            device.queue.writeBuffer(entry.buffer, 0, entry.data);
                        }
                    }

                    if (!previousItem || previousItem.material !== currentItem.material) {
                        stats.materialSwitches++;
                        pass.setBindGroup(currentItem.material.group, currentItem.material.bindGroup);
                        for (let j = 0; j < currentItem.material.entries.length; j++) {
                            const entry = currentItem.material.entries[j];
                            device.queue.writeBuffer(entry.buffer, 0, entry.data);
                        }
                    }

                    if (!previousItem || previousItem.primitive !== currentItem.primitive) {
                        stats.geometrySwitches++;
                        if (currentItem.primitive.type === 'non-interleaved') {
                            for (let j = 0; j < currentItem.primitive.buffers.length; j++) {
                                const buffer = currentItem.primitive.buffers[j];
                                pass.setVertexBuffer(buffer.slot, buffer.buffer);
                            }
                        } else {
                            pass.setVertexBuffer(
                                currentItem.primitive.vertex.slot,
                                currentItem.primitive.vertex.buffer,
                            );
                        }

                        if (currentItem.primitive.index) {
                            pass.setIndexBuffer(currentItem.primitive.index.buffer, currentItem.primitive.index.format);
                        }
                    }

                    pass.setBindGroup(currentItem.transform.group, currentItem.transform.bindGroup);
                    for (let j = 0; j < currentItem.transform.entries.length; j++) {
                        const entry = currentItem.transform.entries[j];
                        device.queue.writeBuffer(entry.buffer, 0, entry.data);
                    }

                    stats.drawCalls++;
                    if (currentItem.primitive.index) {
                        pass.drawIndexed(currentItem.primitive.index.count);
                    } else {
                        if (currentItem.primitive.type === 'non-interleaved') {
                            pass.draw(currentItem.primitive.positionsCount);
                        } else {
                            pass.draw(currentItem.primitive.vertex.count);
                        }
                    }
                }

                console.log('render', renderList.length);
                console.log(stats);

                console.log({
                    pipelineMap,
                    materialTypeCache,
                    geometryTypeCache,
                    materialInstanceCache,
                    geometryInstanceCache,
                });

                pass.end();
            }

            return {
                addEntity,
                removeEntity,
                resize,
                update,
            };
        },
    });
}
