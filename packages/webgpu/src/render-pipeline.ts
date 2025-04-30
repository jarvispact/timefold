/* eslint-disable @typescript-eslint/no-explicit-any */

// ==============================
// Utils

const isPromise = (value: unknown): value is Promise<unknown> =>
    !!value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';

// ==============================
// RenderPass

type RenderFn = () => void;
type RenderPassFnResult = { render: RenderFn; context?: unknown };
type RenderPassFn<Context> = (context: Context) => RenderPassFnResult | Promise<RenderPassFnResult>;

export type RenderPass<Name extends string, Context> = {
    name: Name;
    fn: RenderPassFn<Context>;
};

export const defineRenderPass = <const Pass extends RenderPass<string, any>>(renderPass: Pass) => renderPass;

// ==============================
// PipelineContext

export type InferContextFromRenderPass<Pass extends RenderPass<string, any>> = Record<
    Pass['name'],
    Awaited<ReturnType<Pass['fn']>>['context']
>;

type InitialPipelineContext<Args> = { args: Args };

type TupleToRecord<Passes extends RenderPass<string, any>[], Result = NonNullable<unknown>> = Passes extends [
    infer Head extends RenderPass<string, any>,
    ...infer Tail extends RenderPass<string, any>[],
]
    ? TupleToRecord<Tail, Result & InferContextFromRenderPass<Head>>
    : Result;

export type RenderPipelineContext<
    Passes extends RenderPass<string, any>[] = [],
    AdditionalArgs = NonNullable<unknown>,
> = InitialPipelineContext<CreateRenderPipelineArgs & AdditionalArgs> & TupleToRecord<Passes>;

// ==============================
// Pipeline

export type CreateRenderPipelineArgs = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
};

class RenderPipeline<Args extends CreateRenderPipelineArgs, Context = InitialPipelineContext<Args>> {
    args: Args;

    private renderPasses: RenderPass<string, any>[] = [];

    constructor(args: Args) {
        this.args = args;
    }

    addRenderPass<const Pass extends RenderPass<string, Context>>(pass: Pass) {
        if (pass.name === 'args') {
            throw new Error(`Name: ${pass.name} is reserved. Use another name for your render pass.`);
        }

        this.renderPasses.push(pass);
        return this as RenderPipeline<Args, Context & InferContextFromRenderPass<Pass>>;
    }

    async build() {
        const builtRenderPasses: RenderFn[] = [];

        const ctx: Record<string, unknown> = { args: this.args };

        for (let passIdx = 0; passIdx < this.renderPasses.length; passIdx++) {
            const pass = this.renderPasses[passIdx];
            const builtPass = pass.fn(ctx as never);

            if (isPromise(builtPass)) {
                const result = await builtPass;
                ctx[pass.name] = result.context;
                builtRenderPasses.push(result.render);
            } else {
                ctx[pass.name] = builtPass.context;
                builtRenderPasses.push(builtPass.render);
            }
        }

        const render = () => {
            for (let passIdx = 0; passIdx < builtRenderPasses.length; passIdx++) {
                builtRenderPasses[passIdx]();
            }
        };

        return { render };
    }
}

export const createRenderPipeline = <Args extends CreateRenderPipelineArgs>(args: Args) => new RenderPipeline(args);
