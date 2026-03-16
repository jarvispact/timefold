/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { expect, describe, beforeAll, afterAll, afterEach, it, expectTypeOf } from 'vitest';
import { page } from '@vitest/browser/context';
import { struct } from './wgsl';

const WIDTH = 512;
const HEIGHT = 512;

let device: GPUDevice;
let canvas: HTMLCanvasElement;

beforeAll(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter available');
    device = await adapter.requestDevice();

    await page.viewport(WIDTH, HEIGHT);

    canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${HEIGHT}px`;
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    canvas.style.border = 'none';
    canvas.style.boxSizing = 'border-box';
    canvas.dataset.testid = 'webgpu-canvas';
    document.body.appendChild(canvas);
});

afterEach(() => {
    const ctx = canvas.getContext('webgpu')!;
    ctx.unconfigure();
});

afterAll(() => {
    canvas.remove();
    device.destroy();
});

// --- helpers ---

const writeVec3 = (view: DataView, byteOffset: number, x: number, y: number, z: number) => {
    view.setFloat32(byteOffset, x, true);
    view.setFloat32(byteOffset + 4, y, true);
    view.setFloat32(byteOffset + 8, z, true);
};

const createShader = (structWgsl: string, structName: string, colorExprs: [string, string, string]) => `
${structWgsl}

@group(0) @binding(0) var<uniform> data: ${structName};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
}

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> VertexOutput {
    let positions = array<vec2<f32>, 3>(
        vec2(0.0, 0.8), // top
        vec2(-0.8, -0.8), // bottom left
        vec2(0.8, -0.8), // bottom right
    );

    let colors = array<vec3<f32>, 3>(
        ${colorExprs[0]},
        ${colorExprs[1]},
        ${colorExprs[2]},
    );

    var out: VertexOutput;
    out.position = vec4(positions[idx], 0.0, 1.0);
    out.color = colors[idx];
    return out;
}

@fragment
fn fs(@location(0) color: vec3<f32>) -> @location(0) vec4<f32> {
    return vec4(color, 1.0);
}
`;

const render = async (shaderCode: string, uniformData: ArrayBuffer): Promise<void> => {
    const ctx = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format, alphaMode: 'opaque' });

    const uniformBuffer = device.createBuffer({
        size: uniformData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const module = device.createShaderModule({ code: shaderCode });
    const compilationInfo = await module.getCompilationInfo();
    const errors = compilationInfo.messages.filter((m) => m.type === 'error');
    if (errors.length > 0) {
        throw new Error(`WGSL compilation failed:\n${errors.map((e) => e.message).join('\n')}`);
    }

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module },
        fragment: { module, targets: [{ format }] },
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: ctx.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
            },
        ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();

    uniformBuffer.destroy();
};

describe('webgpu buffer alignment/padding rules', () => {
    it('three consecutive vec3 fields', async () => {
        const s = struct('Colors', {
            c0: 'vec3<f32>',
            c1: 'vec3<f32>',
            c2: 'vec3<f32>',
        });

        // ==================================================================================
        // Make sure that the buffer size and view config matches our expectations at runtime

        expect(s.bufferSize).toEqual(48);
        expect(s.viewConfig).toEqual({
            c0: { scalar: 'f32', byteOffset: 0, componentCount: 3 },
            c1: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
            c2: { scalar: 'f32', byteOffset: 32, componentCount: 3 },
        });

        // =====================================================================
        // Make sure that the viewConfig is correctly inferred on the type level

        expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
            c0: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c1: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c2: { scalar: 'f32'; byteOffset: number; componentCount: number };
        }>();

        // =================================================================
        // Visual check that the values are correctly unpacked in the shader

        const data = new ArrayBuffer(s.bufferSize);
        const view = new DataView(data);
        writeVec3(view, s.viewConfig.c0.byteOffset, 1, 0, 0); // top vertex: red
        writeVec3(view, s.viewConfig.c1.byteOffset, 0, 1, 0); // bottom left: vertex green
        writeVec3(view, s.viewConfig.c2.byteOffset, 0, 0, 1); // bottom right: vertex blue

        const shader = createShader(s.getWgsl(), s.name, ['data.c0', 'data.c1', 'data.c2']);
        await render(shader, data);
        await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('three-vec3.png');
    });

    it('f32 followed by three vec3 fields', async () => {
        const s = struct('ScaledColors', {
            scale: 'f32',
            c0: 'vec3<f32>',
            c1: 'vec3<f32>',
            c2: 'vec3<f32>',
        });

        // ==================================================================================
        // Make sure that the buffer size and view config matches our expectations at runtime

        expect(s.bufferSize).toEqual(64);
        expect(s.viewConfig).toEqual({
            scale: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
            c0: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
            c1: { scalar: 'f32', byteOffset: 32, componentCount: 3 },
            c2: { scalar: 'f32', byteOffset: 48, componentCount: 3 },
        });

        // =====================================================================
        // Make sure that the viewConfig is correctly inferred on the type level

        expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
            scale: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c0: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c1: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c2: { scalar: 'f32'; byteOffset: number; componentCount: number };
        }>();

        // =================================================================
        // Visual check that the values are correctly unpacked in the shader

        const data = new ArrayBuffer(s.bufferSize);
        const view = new DataView(data);
        view.setFloat32(s.viewConfig.scale.byteOffset, 0.5, true);
        writeVec3(view, s.viewConfig.c0.byteOffset, 1, 0, 0); // top vertex: red
        writeVec3(view, s.viewConfig.c1.byteOffset, 0, 1, 0); // bottom left: vertex green
        writeVec3(view, s.viewConfig.c2.byteOffset, 0, 0, 1); // bottom right: vertex blue

        const shader = createShader(s.getWgsl(), s.name, [
            'data.c0 * data.scale',
            'data.c1 * data.scale',
            'data.c2 * data.scale',
        ]);
        await render(shader, data);
        await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('f32-then-three-vec3.png');
    });

    it('three f32 followed by three vec3 fields', async () => {
        const s = struct('PerChannelScaledColors', {
            s0: 'f32',
            s1: 'f32',
            s2: 'f32',
            c0: 'vec3<f32>',
            c1: 'vec3<f32>',
            c2: 'vec3<f32>',
        });

        // ==================================================================================
        // Make sure that the buffer size and view config matches our expectations at runtime

        expect(s.bufferSize).toEqual(64);
        expect(s.viewConfig).toEqual({
            s0: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
            s1: { scalar: 'f32', byteOffset: 4, componentCount: 1 },
            s2: { scalar: 'f32', byteOffset: 8, componentCount: 1 },
            c0: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
            c1: { scalar: 'f32', byteOffset: 32, componentCount: 3 },
            c2: { scalar: 'f32', byteOffset: 48, componentCount: 3 },
        });

        // =====================================================================
        // Make sure that the viewConfig is correctly inferred on the type level

        expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
            s0: { scalar: 'f32'; byteOffset: number; componentCount: number };
            s1: { scalar: 'f32'; byteOffset: number; componentCount: number };
            s2: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c0: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c1: { scalar: 'f32'; byteOffset: number; componentCount: number };
            c2: { scalar: 'f32'; byteOffset: number; componentCount: number };
        }>();

        // =================================================================
        // Visual check that the values are correctly unpacked in the shader

        const data = new ArrayBuffer(s.bufferSize);
        const view = new DataView(data);
        view.setFloat32(s.viewConfig.s0.byteOffset, 1.0, true);
        view.setFloat32(s.viewConfig.s1.byteOffset, 0.5, true);
        view.setFloat32(s.viewConfig.s2.byteOffset, 0.25, true);
        writeVec3(view, s.viewConfig.c0.byteOffset, 1, 0, 0); // top vertex: red
        writeVec3(view, s.viewConfig.c1.byteOffset, 0, 1, 0); // bottom left: vertex green
        writeVec3(view, s.viewConfig.c2.byteOffset, 0, 0, 1); // bottom right: vertex blue

        const shader = createShader(s.getWgsl(), s.name, [
            'data.c0 * data.s0',
            'data.c1 * data.s1',
            'data.c2 * data.s2',
        ]);
        await render(shader, data);
        await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('three-f32-then-three-vec3.png');
    });
});
