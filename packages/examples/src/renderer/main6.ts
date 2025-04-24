import { InterleavedInfo, InterleavedObjPrimitiveIndexed, ObjLoader } from '@timefold/obj';
import { WebgpuUtils } from '@timefold/webgpu';
import { createRenderPipeline, defineRenderPass, RenderPipelineContext } from './renderer5';
import { PostProcessingRenderPass } from './post-processing-pass';
import { createUnlitRenderer } from './unlit-renderer';
import { createPhongRenderer } from './phong-renderer';

type AdditionalContext = {
    info: InterleavedInfo;
    planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>;
};

const MainRenderPass = defineRenderPass({
    name: 'MainRenderPass',
    fn: (ctx: RenderPipelineContext<[], AdditionalContext>) => {
        const { device, canvas } = ctx.args;

        const renderTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'bgra8unorm',
            dimension: '2d',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });

        const renderPassDescriptor = {
            colorAttachments: [
                WebgpuUtils.createColorAttachmentFromView(renderTexture.createView(), {
                    clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                }),
            ],
        };

        const unlitRenderer = createUnlitRenderer({ args: { ...ctx.args, renderTexture } });
        const phongRenderer = createPhongRenderer({ args: { ...ctx.args, renderTexture } });

        const render = () => {
            renderPassDescriptor.colorAttachments[0].view = renderTexture.createView();
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass(renderPassDescriptor);

            unlitRenderer.render(pass);
            phongRenderer.render(pass);

            pass.end();
            device.queue.submit([encoder.finish()]);
        };

        return {
            render,
            context: { renderTexture },
        };
    },
});

const main = async () => {
    // =========================
    // Load and prepare Geometry

    const { info, objects } = await ObjLoader.load('./webgpu-plane.obj');
    const planePrimitive = objects.Plane.primitives.default;

    // ================================
    // Setup canvas and render pipeline

    const dpr = window.devicePixelRatio || 1;
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

    const pipeline = await createRenderPipeline({
        canvas,
        device,
        context,
        format,
        info,
        planePrimitive,
    })
        .addRenderPass(MainRenderPass)
        .addRenderPass(PostProcessingRenderPass)
        .build();

    pipeline.render();
};

void main();
