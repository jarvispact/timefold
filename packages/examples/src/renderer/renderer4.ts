import { WebgpuUtils } from '@timefold/webgpu';

const isPromise = (value: unknown): value is Promise<unknown> =>
    !!value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';

type GenericRenderPassResult = { render: () => void; context?: unknown };

type GenericRenderPass<Name extends string = string, Ctx = unknown> = {
    name: Name;
    pass: (ctx: Ctx) => GenericRenderPassResult | Promise<GenericRenderPassResult>;
};

type GenericBuiltRenderPass = {
    name: string;
    pass: GenericRenderPassResult;
};

type InitialPipelineContext = {
    args: CreateRenderPipelineArgs;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
};

const reservedContextScopes = ['args', 'device', 'context', 'format'];

type CreateRenderPipelineArgs = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
};

type PipelineBuilder<InitialContext = InitialPipelineContext> = {
    addRenderPass: <const T extends GenericRenderPass<string, InitialContext>>(
        renderPass: T,
    ) => PipelineBuilder<
        InitialContext &
            Record<
                T['name'],
                ReturnType<T['pass']> extends Promise<infer AwaitedValue extends { context?: unknown }>
                    ? AwaitedValue['context']
                    : ReturnType<T['pass']> extends { context?: infer Ctx }
                      ? Ctx
                      : NonNullable<unknown>
            >
    >;
    build: () => Promise<{ render: () => void }>;
};

export const createRenderPipeline = (args: CreateRenderPipelineArgs) => {
    const renderPasses: GenericRenderPass[] = [];

    const addRenderPass = <const T extends GenericRenderPass<string, InitialPipelineContext>>(
        renderPass: T,
    ): PipelineBuilder<
        InitialPipelineContext &
            Record<
                T['name'],
                ReturnType<T['pass']> extends Promise<infer AwaitedValue extends { context?: unknown }>
                    ? AwaitedValue['context']
                    : ReturnType<T['pass']> extends { context?: infer Ctx }
                      ? Ctx
                      : NonNullable<unknown>
            >
    > => {
        if (reservedContextScopes.includes(renderPass.name)) {
            throw new Error(`Name: "${renderPass.name}" is reserved. Use another name for your render pass.`);
        }

        renderPasses.push(renderPass as never);
        return pipelineBuilder as never;
    };

    const build = async () => {
        const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

        const builtRenderPasses: GenericBuiltRenderPass[] = [];

        const ctx: Record<string, unknown> = { args, device, context, format };

        for (let passIdx = 0; passIdx < renderPasses.length; passIdx++) {
            const pass = renderPasses[passIdx];
            const builtPass = pass.pass(ctx as never);

            if (isPromise(builtPass)) {
                const result = await builtPass;
                ctx[pass.name] = result.context;
                builtRenderPasses.push({ name: pass.name, pass: result });
            } else {
                ctx[pass.name] = builtPass.context;
                builtRenderPasses.push({ name: pass.name, pass: builtPass });
            }
        }

        const render = () => {
            for (let passIdx = 0; passIdx < builtRenderPasses.length; passIdx++) {
                const pass = builtRenderPasses[passIdx];
                pass.pass.render();
            }
        };

        return { render };
    };

    const pipelineBuilder = {
        addRenderPass,
        build,
    };

    return pipelineBuilder;
};

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const pipeline = await createRenderPipeline({ canvas })
    .addRenderPass({
        name: 'First',
        pass: (ctx) => {
            console.log('First', ctx.args.canvas);
            console.log('First', ctx.device);
            return {
                render: () => {
                    console.log('First pass render');
                },
                context: { foo: 'bar' },
            };
        },
    })
    .addRenderPass({
        name: 'Second',
        pass: async (ctx) => {
            console.log('Second', ctx.args.canvas);
            console.log('Second', ctx.device);
            console.log('Second', ctx.First.foo);
            return Promise.resolve({
                render: () => {
                    console.log('Second pass render');
                },
                context: { bar: 'wat' },
            });
        },
    })
    .addRenderPass({
        name: 'Third',
        pass: (ctx) => {
            console.log('Third', ctx.args.canvas);
            console.log('Third', ctx.device);
            console.log('Third', ctx.First.foo);
            console.log('Third', ctx.Second.bar);
            return {
                render: () => {
                    console.log('Third pass render');
                },
                context: { wat: 2 },
            };
        },
    })
    .build();

pipeline.render();
