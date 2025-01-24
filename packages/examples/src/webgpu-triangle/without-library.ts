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

const shaderCode = /* wgsl */ `
struct Vertex {
    @location(0) position: vec3f,
}

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
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('Webgpu not available');
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) {
        throw new Error('Webgpu not available');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format });

    const module = device.createShaderModule({ code: shaderCode });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [],
    });

    const pipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: module,
            buffers: [
                {
                    stepMode: 'vertex',
                    arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
                    attributes: [
                        {
                            format: 'float32x3',
                            offset: 0,
                            shaderLocation: 0,
                        },
                    ],
                },
            ],
        },
        fragment: {
            module: module,
            targets: [{ format }],
        },
    });

    const renderPassDescriptor = {
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: [0, 0, 0, 1],
                loadOp: 'clear' as const,
                storeOp: 'store' as const,
            },
        ],
    };

    const positionBuffer = device.createBuffer({
        size: triangle.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(positionBuffer, 0, triangle);

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, positionBuffer);
        pass.draw(triangle.length / 3);
        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    render();
};

void run();
