/* eslint-disable @typescript-eslint/no-explicit-any */

import { CreateDeviceAndContextResult } from './types';
import { createContext, createDevice } from './utils';

// ==============================
// Utils

function isPromise(value: unknown): value is Promise<unknown> {
    return !!value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';
}

// ==============================
// RenderPass

type UpdateFn = (encoder: GPUCommandEncoder) => void;
type PassFnResult = { update: UpdateFn; context?: unknown };
type PassFn<Context> = (context: Context) => PassFnResult | Promise<PassFnResult>;

export type PipelinePass<Name extends string, Context> = {
    name: Name;
    build: PassFn<Context>;
};

export function definePipelinePass<const Pass extends PipelinePass<string, any>>(renderPass: Pass) {
    return renderPass;
}

// ==============================
// PipelineContext

export type InferContextFromPass<Pass extends PipelinePass<string, any>> = Record<
    Pass['name'],
    Awaited<ReturnType<Pass['build']>>['context']
>;

export type InferPublicApiFromPass<Pass extends PipelinePass<string, any>> = Record<
    Pass['name'],
    Omit<Awaited<ReturnType<Pass['build']>>, 'render' | 'context'>
>;

export type MSAA = 1 | 4;

type InitialPipelineContext<AdditionalArgs> = {
    args: CreateDeviceAndContextResult & {
        canvas: HTMLCanvasElement | OffscreenCanvas;
        msaa: MSAA;
    } & AdditionalArgs;
};

type PassContextByName<Passes extends PipelinePass<string, any>[], Result = NonNullable<unknown>> = Passes extends [
    infer Head extends PipelinePass<string, any>,
    ...infer Tail extends PipelinePass<string, any>[],
]
    ? PassContextByName<Tail, Result & InferContextFromPass<Head>>
    : Result;

export type PipelineContext<
    Passes extends PipelinePass<string, any>[] = [],
    AdditionalArgs = NonNullable<unknown>,
> = InitialPipelineContext<AdditionalArgs> & PassContextByName<Passes>;

// ==============================
// Pipeline

export type CreatePipelineArgs = Partial<CreateDeviceAndContextResult> & {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    msaa?: MSAA;
};

export type Pipeline<
    Args extends CreatePipelineArgs,
    Context = InitialPipelineContext<Args>,
    RenderPassResultByName = NonNullable<unknown>,
> = {
    withPass: <const Pass extends PipelinePass<string, Context>>(
        pass: Pass,
    ) => Pipeline<Args, Context & InferContextFromPass<Pass>, RenderPassResultByName & InferPublicApiFromPass<Pass>>;
    build: () => Promise<{
        update: () => void;
        passes: RenderPassResultByName;
    }>;
};

export function createPipeline<Args extends CreatePipelineArgs>(args: Args) {
    const passes: PipelinePass<string, unknown>[] = [];

    function withPass(pass: PipelinePass<string, unknown>) {
        if (pass.name === 'args') {
            throw new Error(`Name: ${pass.name} is reserved. Use another name for your render pass.`);
        }

        passes.push(pass);
        return api;
    }

    async function build() {
        const device = args.device ?? (await createDevice());
        const context = args.context ?? createContext({ canvas: args.canvas, device });
        const format = args.format ?? navigator.gpu.getPreferredCanvasFormat();

        const buildPassesByName: Record<string, { update: UpdateFn }> = {};

        const ctx: Record<string, unknown> = {
            args: {
                canvas: args.canvas,
                context,
                device,
                format,
                msaa: args.msaa ?? 1,
            },
        };

        for (let passIdx = 0; passIdx < passes.length; passIdx++) {
            const pass = passes[passIdx];
            const builtPass = pass.build(ctx as never);

            if (isPromise(builtPass)) {
                const result = await builtPass;
                ctx[pass.name] = result.context;
                buildPassesByName[pass.name] = result;
            } else {
                ctx[pass.name] = builtPass.context;
                buildPassesByName[pass.name] = builtPass;
            }
        }

        const builtRenderPasses = Object.values(buildPassesByName);

        function update() {
            const encoder = device.createCommandEncoder();

            for (let passIdx = 0; passIdx < builtRenderPasses.length; passIdx++) {
                builtRenderPasses[passIdx].update(encoder);
            }

            device.queue.submit([encoder.finish()]);
        }

        return {
            update,
            passes: buildPassesByName,
        };
    }

    const api = {
        withPass,
        build,
    };

    return api as Pipeline<Args>;
}
