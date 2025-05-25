/* eslint-disable @typescript-eslint/no-explicit-any */

import { CreateDeviceAndContextResult } from './types';

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
    build: RenderPassFn<Context>;
};

export const defineRenderPass = <const Pass extends RenderPass<string, any>>(renderPass: Pass) => renderPass;

// ==============================
// PipelineContext

export type InferContextFromRenderPass<Pass extends RenderPass<string, any>> = Record<
    Pass['name'],
    Awaited<ReturnType<Pass['build']>>['context']
>;

export type InferPublicApiFromRenderPass<Pass extends RenderPass<string, any>> = Record<
    Pass['name'],
    Omit<Awaited<ReturnType<Pass['build']>>, 'render' | 'context'>
>;

type MSAA = 1 | 4;

type InitialPipelineContext<Args> = { args: Omit<Args, 'msaa'> & { msaa: MSAA } };

type RenderPassContextByName<Passes extends RenderPass<string, any>[], Result = NonNullable<unknown>> = Passes extends [
    infer Head extends RenderPass<string, any>,
    ...infer Tail extends RenderPass<string, any>[],
]
    ? RenderPassContextByName<Tail, Result & InferContextFromRenderPass<Head>>
    : Result;

export type RenderPipelineContext<
    Passes extends RenderPass<string, any>[] = [],
    AdditionalArgs = NonNullable<unknown>,
> = InitialPipelineContext<CreateRenderPipelineArgs & AdditionalArgs> & RenderPassContextByName<Passes>;

// ==============================
// Pipeline

export type CreateRenderPipelineArgs = CreateDeviceAndContextResult & {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    msaa?: MSAA;
};

class RenderPipeline<
    Args extends CreateRenderPipelineArgs,
    Context = InitialPipelineContext<Args>,
    RenderPassResultByName = NonNullable<unknown>,
> {
    args: Args;

    private renderPasses: RenderPass<string, Context>[] = [];

    constructor(args: Args) {
        this.args = args;
    }

    addRenderPass<const Pass extends RenderPass<string, Context>>(pass: Pass) {
        if (pass.name === 'args') {
            throw new Error(`Name: ${pass.name} is reserved. Use another name for your render pass.`);
        }

        this.renderPasses.push(pass);
        return this as RenderPipeline<
            Args,
            Context & InferContextFromRenderPass<Pass>,
            RenderPassResultByName & InferPublicApiFromRenderPass<Pass>
        >;
    }

    async build() {
        const buildRenderPassesByName: Record<string, { render: RenderFn }> = {};

        const ctx: Record<string, unknown> = {
            args: {
                ...this.args,
                msaa: this.args.msaa ?? 1,
            },
        };

        for (let passIdx = 0; passIdx < this.renderPasses.length; passIdx++) {
            const pass = this.renderPasses[passIdx];
            const builtPass = pass.build(ctx as never);

            if (isPromise(builtPass)) {
                const result = await builtPass;
                ctx[pass.name] = result.context;
                buildRenderPassesByName[pass.name] = result;
            } else {
                ctx[pass.name] = builtPass.context;
                buildRenderPassesByName[pass.name] = builtPass;
            }
        }

        const builtRenderPasses = Object.values(buildRenderPassesByName);

        const render = () => {
            for (let passIdx = 0; passIdx < builtRenderPasses.length; passIdx++) {
                builtRenderPasses[passIdx].render();
            }
        };

        return {
            render,
            passes: buildRenderPassesByName as RenderPassResultByName,
        };
    }
}

export const createRenderPipeline = <Args extends CreateRenderPipelineArgs>(args: Args) => new RenderPipeline(args);
