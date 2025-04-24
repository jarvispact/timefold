type GenericRenderPass<Ctx> = (args: Ctx) => { render: () => unknown; context?: unknown };

type CreateRenderPipelineArgs = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
};

class RenderPipeline<Ctx extends Record<'args', CreateRenderPipelineArgs> = Record<'args', CreateRenderPipelineArgs>> {
    private canvas: HTMLCanvasElement | OffscreenCanvas;
    private renderPasses: { name: string; pass: GenericRenderPass<Ctx> }[] = [];

    constructor({ canvas }: CreateRenderPipelineArgs) {
        this.canvas = canvas;
    }

    addRenderPass<Name extends string, Pass extends GenericRenderPass<Ctx>>(name: Name, pass: Pass) {
        if (name === 'args') {
            throw new Error(`Name: ${name} is reserved. Use another name for your render pass.`);
        }

        this.renderPasses.push({ name, pass });
        return this as RenderPipeline<Ctx & Record<Name, ReturnType<Pass>['context']>>;
    }

    build() {
        const renderPasses = this.renderPasses;
        const builtRenderPasses: { name: string; pass: ReturnType<GenericRenderPass<Ctx>> }[] = [];

        const ctx: Record<string, unknown> = { args: { canvas: this.canvas } };

        for (let passIdx = 0; passIdx < renderPasses.length; passIdx++) {
            const pass = renderPasses[passIdx];
            builtRenderPasses.push({ name: pass.name, pass: pass.pass(ctx as never) });
        }

        const render = () => {
            for (let passIdx = 0; passIdx < builtRenderPasses.length; passIdx++) {
                const builtPass = builtRenderPasses[passIdx];
                ctx[builtPass.name] = builtPass.pass.render();
            }
        };

        return {
            render,
        };
    }
}

export const createRenderPipeline = (args: CreateRenderPipelineArgs) => {
    return new RenderPipeline(args);
};

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const pipeline = createRenderPipeline({ canvas })
    .addRenderPass('first', (pass) => {
        console.log(pass.args.canvas);

        const renderResult = { foo: 'bar' };

        const render = () => {
            console.log('render first');
            return renderResult;
        };
        const context = { someTexture: null as unknown as GPUTexture };
        return { render, context };
    })
    .addRenderPass('second', (pass) => {
        console.log(pass.args.canvas);
        console.log(pass.first.someTexture);
        const render = () => {
            console.log('render second');
        };
        const context = { otherTexture: null as unknown as GPUTexture };
        return { render, context };
    })
    .addRenderPass('third', (pass) => {
        console.log(pass.args.canvas);
        console.log(pass.first.someTexture);
        console.log(pass.second.otherTexture);
        const render = () => {
            console.log('render third');
        };
        return { render };
    })
    .build();

pipeline.render();
