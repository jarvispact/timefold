type Assume<T, V> = T extends V ? T : never;
type AssumeString<T> = Assume<T, string>;

type FixedRenderPassDescriptor = Omit<GPURenderPassDescriptor, 'colorAttachments'> & {
    colorAttachments: GPURenderPassColorAttachment[];
};

type CustomError<Code extends string> = Error & { code: Code };

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const fail = <Code extends string>(code: Code) => {
    const error = new Error(`[${code}] Could not create WebgpuRenderer.`) as CustomError<Code>;
    error.code = code;
    throw error;
};

export type Entity<Material extends string, Geometry extends string> = {
    id: string;
    active: boolean;
    material: Material;
    geometry: Geometry;
    data: ArrayBufferLike;
};

export type Geometry = {
    vertexBufferLayout: GPUVertexBufferLayout[];
    vertexBuffer: GPUBuffer;
    vertexData: ArrayBufferLike;
    vertexCount: number;
};

export type MaterialSceneData = {
    binding: number;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

export type MaterialEntityData = {
    binding: number;
    bindGroupLayout: GPUBindGroupLayout;
    dataSize: number;
};

export type Material = {
    module: GPUShaderModule;
    pipelineLayout: GPUPipelineLayout;
    scene?: MaterialSceneData;
    entity?: MaterialEntityData;
};

export type MaterialFactoryArgs = {
    device: GPUDevice;
};

export type MaterialFactory = (args: MaterialFactoryArgs) => Material;
type GenericMaterialFactories = Record<string, MaterialFactory>;

export type GeometryFactoryArgs = {
    device: GPUDevice;
};

export type GeometryFactory = (args: GeometryFactoryArgs) => Geometry;
type GenericGeometryFactories = Record<string, GeometryFactory>;

type PipelineData = {
    pipeline: GPURenderPipeline;
    material: Material;
    geometry: Geometry;
    entityList: (
        | (Entity<string, string> & {
              bindGroup: GPUBindGroup;
              buffer: GPUBuffer;
          })
        | undefined
    )[];
    entityIdToIdx: Record<string, number | undefined>;
};

type RenderTree = {
    pipelineById: Record<string, PipelineData>;
    pipelineIds: string[];
    entityListPath: Record<string, [string, number] | undefined>;
};

type CreateArgs<
    MaterialFactories extends GenericMaterialFactories,
    GeometryFactories extends GenericGeometryFactories,
> = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    materialFactories: MaterialFactories;
    geometryFactories: GeometryFactories;
};

export type Type<Materials extends GenericMaterialFactories, Geometries extends GenericGeometryFactories> = {
    addEntity: (entity: Entity<AssumeString<keyof Materials>, AssumeString<keyof Geometries>>) => void;
    removeEntity: (entityId: Entity<string, string>['id']) => void;
    resize: (width: number, height: number) => void;
    render: () => void;
};

export const create = async <Materials extends GenericMaterialFactories, Geometries extends GenericGeometryFactories>({
    canvas,
    materialFactories,
    geometryFactories,
}: CreateArgs<Materials, Geometries>): Promise<Type<Materials, Geometries>> => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        return fail('E_NO_WEBGPU_SUPPORT');
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) {
        return fail('E_NO_WEBGPU_SUPPORT');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format,
    });

    const renderPassDescriptor: FixedRenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    };

    const pipelineById: RenderTree['pipelineById'] = {};

    const materialNames = Object.keys(materialFactories);
    const geometryNames = Object.keys(geometryFactories);

    for (let mi = 0; mi < materialNames.length; mi++) {
        const materialName = materialNames[mi];
        const material = materialFactories[materialName]({ device });

        for (let gi = 0; gi < geometryNames.length; gi++) {
            const geometryName = geometryNames[gi];
            const geometry = geometryFactories[geometryName]({ device });

            const pipelineId = `${materialName}-${geometryName}`;

            const pipeline = device.createRenderPipeline({
                label: materialName,
                layout: material.pipelineLayout,
                vertex: {
                    module: material.module,
                    buffers: geometry.vertexBufferLayout,
                },
                fragment: {
                    module: material.module,
                    targets: [{ format }],
                },
            });

            device.queue.writeBuffer(geometry.vertexBuffer, 0, geometry.vertexData);

            pipelineById[pipelineId] = {
                pipeline,
                material,
                geometry,
                entityList: [],
                entityIdToIdx: {},
            };
        }
    }

    const renderTree: RenderTree = {
        pipelineById,
        pipelineIds: Object.keys(pipelineById),
        entityListPath: {},
    };

    const addEntity = (entity: Entity<AssumeString<keyof Materials>, AssumeString<keyof Geometries>>) => {
        const pipelineId = `${entity.material}-${entity.geometry}`;
        const pipeline = renderTree.pipelineById[pipelineId];
        if (!pipeline.material.entity) return;

        const buffer = device.createBuffer({
            size: pipeline.material.entity.dataSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindGroup = device.createBindGroup({
            layout: pipeline.material.entity.bindGroupLayout,
            entries: [{ binding: 0, resource: { buffer } }],
        });

        pipeline.entityList.push({
            ...entity,
            bindGroup,
            buffer,
        });

        const idxOfNewEntity = pipeline.entityList.length - 1;
        pipeline.entityIdToIdx[entity.id] = idxOfNewEntity;
        renderTree.entityListPath[entity.id] = [pipelineId, idxOfNewEntity];
    };

    const removeEntity = (entityId: Entity<string, string>['id']) => {
        const p = renderTree.entityListPath[entityId];
        if (!p) return;

        renderTree.pipelineById[p[0]].entityList[p[1]] = undefined;
        renderTree.pipelineById[p[0]].entityIdToIdx[entityId] = undefined;
        renderTree.entityListPath[entityId] = undefined;
    };

    const resize = (width: number, height: number) => {
        canvas.width = width;
        canvas.height = height;
        console.log({ width, height });
    };

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        for (let pi = 0; pi < renderTree.pipelineIds.length; pi++) {
            const pipelineId = renderTree.pipelineIds[pi];
            const pipeline = renderTree.pipelineById[pipelineId];

            pass.setPipeline(pipeline.pipeline);
            pass.setVertexBuffer(0, pipeline.geometry.vertexBuffer);

            if (pipeline.material.scene) {
                pass.setBindGroup(pipeline.material.scene.binding, pipeline.material.scene.bindGroup);
                device.queue.writeBuffer(pipeline.material.scene.buffer, 0, pipeline.material.scene.data);
            }

            if (pipeline.material.entity) {
                for (let ei = 0; ei < pipeline.entityList.length; ei++) {
                    const entity = pipeline.entityList[ei];
                    if (entity && entity.active) {
                        pass.setBindGroup(pipeline.material.entity.binding, entity.bindGroup);
                        device.queue.writeBuffer(entity.buffer, 0, entity.data);
                        pass.draw(pipeline.geometry.vertexCount);
                    }
                }
            }
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    return {
        addEntity,
        removeEntity,
        resize,
        render,
    };
};
