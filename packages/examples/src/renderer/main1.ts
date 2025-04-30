import { ObjLoader } from '@timefold/obj';
import { WebgpuUtils, createRenderPipeline } from '@timefold/webgpu';
import { MultiMaterialRenderPass } from './multi-material-render-pass';
import { PostProcessingRenderPass } from './post-processing-pass';

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
        .addRenderPass(MultiMaterialRenderPass)
        .addRenderPass(PostProcessingRenderPass)
        .build();

    const tick = () => {
        pipeline.render();
        window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
};

void main();
