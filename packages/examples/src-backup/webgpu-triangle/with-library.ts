import { WebgpuUtils } from '@timefold/webgpu';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

/* eslint-disable prettier/prettier */
const triangle = new Float32Array([
     0.8, -0.8, 0.0,
     0.0,  0.8, 0.0,
    -0.8, -0.8, 0.0,
]);
/* eslint-enable prettier/prettier */

const Vertex = WebgpuUtils.createVertexBufferLayout('non-interleaved', {
    position: { format: 'float32x3' },
});

const shaderCode = /* wgsl */ `
${Vertex.wgsl}

@vertex fn vs(
  vert: Vertex
) -> @builtin(position) vec4f {
    return vec4f(vert.position, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
    return vec4f(0.7, 0.7, 0.7, 1.0);
}
`.trim();

const run = async () => {
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });
    const PipelineLayout = WebgpuUtils.createPipelineLayout({ device, uniformGroups: [] });

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.layout,
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
    });

    const P = Vertex.createBuffers(device, { position: triangle });

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(P.attribs.position.slot, P.attribs.position.buffer);
        pass.draw(P.attribs.position.count);
        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    render();
};

void run();
