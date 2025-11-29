import { definePipelinePass, PipelineContext, WebgpuUtils } from '@timefold/webgpu';

export const EntityRenderPass = definePipelinePass({
    name: 'EntityRenderPass',
    build({ args }: PipelineContext) {
        const { canvas, device, format, context, msaa } = args;
        const isMultiSampled = msaa > 1;

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

        function setCamera() {}

        function addEntity() {}

        function removeEntity() {}

        function update(encoder: GPUCommandEncoder) {
            if (isMultiSampled) {
                renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
            } else {
                renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
            }

            const pass = encoder.beginRenderPass(renderPassDescriptor);
            pass.end();
        }

        return {
            resize,
            setCamera,
            addEntity,
            removeEntity,
            update,
        };
    },
});
