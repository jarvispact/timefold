// common

type BindGroup = {
    group: number;
    bindGroup: GPUBindGroup;
    uniforms: { buffer: GPUBuffer; data: ArrayBufferLike }[];
};

type VertexBuffer = {
    slot: number;
    buffer: GPUBuffer;
};

type Index = {
    buffer: GPUBuffer;
    format: GPUIndexFormat;
    count: number;
};

// args

export type AddPipelineArgs = {
    pipeline: GPURenderPipeline;
    bindgroup: BindGroup;
};

export type AddMaterialArgs = {
    bindgroup: BindGroup;
};

export type AddPrimitiveArgs = {
    vertex: { buffers: VertexBuffer[]; count: number };
    index?: Index;
};

export type AddTransformArgs = {
    bindgroup: BindGroup;
};

// entity

type Entity = {
    pipeline: number;
    material: number;
    primitive: number;
    transform: number;
};

type RenderCommand = {
    sort: number;
};

const createRenderer = () => {
    const indices = {
        pipeline: 0,
        material: 0,
        primitive: 0,
        transform: 0,
    };

    const renderCommands: RenderCommand[] = [];

    const addPipeline = (args: AddPipelineArgs) => {
        return indices.pipeline++;
    };

    const addEntity = (entity: Entity) => {
        const sort = (entity.pipeline << 24) | (entity.material << 16) | (entity.primitive << 8) | entity.transform;
        renderCommands.push({ sort });
        renderCommands.sort((a, b) => a.sort - b.sort);
    };

    const render = () => {
        for (let ci = 0; ci < renderCommands.length; ci++) {
            const command = renderCommands[ci];
            const pip = (command.sort >> 24) & 0xff;
            const m = (command.sort >> 16) & 0xff;
            const p = (command.sort >> 8) & 0xff;
            const t = command.sort & 0xff;
            console.log({ pip, m, p, t });
        }
    };

    return {
        addPipeline,
        addEntity,
        render,
    };
};

const renderer = createRenderer();

const pipeline1 = renderer.addPipeline({
    pipeline: null as unknown as GPURenderPipeline,
    bindgroup: { group: 0, bindGroup: null as unknown as GPUBindGroup, uniforms: [] },
});

const pipeline2 = renderer.addPipeline({
    pipeline: null as unknown as GPURenderPipeline,
    bindgroup: { group: 0, bindGroup: null as unknown as GPUBindGroup, uniforms: [] },
});

renderer.addEntity({ pipeline: pipeline1 });
renderer.addEntity({ pipeline: pipeline2 });

renderer.render();
