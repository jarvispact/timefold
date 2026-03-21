/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { expect, describe, beforeAll, afterAll, afterEach, it, expectTypeOf } from 'vitest';
import { page } from '@vitest/browser/context';
import { runtimeArray, sizedArray, struct } from './wgsl';

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

const writeVec2 = (view: DataView, byteOffset: number, x: number, y: number) => {
    view.setFloat32(byteOffset, x, true);
    view.setFloat32(byteOffset + 4, y, true);
};

const writeVec3 = (view: DataView, byteOffset: number, x: number, y: number, z: number) => {
    view.setFloat32(byteOffset, x, true);
    view.setFloat32(byteOffset + 4, y, true);
    view.setFloat32(byteOffset + 8, z, true);
};

const writeVec4 = (view: DataView, byteOffset: number, x: number, y: number, z: number, w: number) => {
    view.setFloat32(byteOffset, x, true);
    view.setFloat32(byteOffset + 4, y, true);
    view.setFloat32(byteOffset + 8, z, true);
    view.setFloat32(byteOffset + 12, w, true);
};

const createShader = (
    structWgsl: string,
    structName: string,
    colorExprs: [string, string, string],
    varQualifier = 'uniform',
) => `
${structWgsl}

@group(0) @binding(0) var<${varQualifier}> data: ${structName};

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

const render = async (
    shaderCode: string,
    bufferData: ArrayBuffer,
    bufferUsage = GPUBufferUsage.UNIFORM,
): Promise<void> => {
    const ctx = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format, alphaMode: 'opaque' });

    const gpuBuffer = device.createBuffer({
        size: bufferData.byteLength,
        usage: bufferUsage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(gpuBuffer, 0, bufferData);

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
        entries: [{ binding: 0, resource: { buffer: gpuBuffer } }],
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

    gpuBuffer.destroy();
};

describe('webgpu buffer alignment/padding rules', () => {
    describe('struct of primitives', () => {
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

            const shader = createShader(s.wgsl, s.name, ['data.c0', 'data.c1', 'data.c2']);
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

            const shader = createShader(s.wgsl, s.name, [
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

            const shader = createShader(s.wgsl, s.name, [
                'data.c0 * data.s0',
                'data.c1 * data.s1',
                'data.c2 * data.s2',
            ]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('three-f32-then-three-vec3.png');
        });

        it('three vec2 + f32 pairs building up vertex colors', async () => {
            const s = struct('SplitColors', {
                rg0: 'vec2<f32>',
                b0: 'f32',
                rg1: 'vec2<f32>',
                b1: 'f32',
                rg2: 'vec2<f32>',
                b2: 'f32',
            });

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            expect(s.bufferSize).toEqual(48);
            expect(s.viewConfig).toEqual({
                rg0: { scalar: 'f32', byteOffset: 0, componentCount: 2 },
                b0: { scalar: 'f32', byteOffset: 8, componentCount: 1 },
                rg1: { scalar: 'f32', byteOffset: 16, componentCount: 2 },
                b1: { scalar: 'f32', byteOffset: 24, componentCount: 1 },
                rg2: { scalar: 'f32', byteOffset: 32, componentCount: 2 },
                b2: { scalar: 'f32', byteOffset: 40, componentCount: 1 },
            });

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
                rg0: { scalar: 'f32'; byteOffset: number; componentCount: number };
                b0: { scalar: 'f32'; byteOffset: number; componentCount: number };
                rg1: { scalar: 'f32'; byteOffset: number; componentCount: number };
                b1: { scalar: 'f32'; byteOffset: number; componentCount: number };
                rg2: { scalar: 'f32'; byteOffset: number; componentCount: number };
                b2: { scalar: 'f32'; byteOffset: number; componentCount: number };
            }>();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(s.bufferSize);
            const view = new DataView(data);
            writeVec2(view, s.viewConfig.rg0.byteOffset, 1, 0); // top vertex: red
            view.setFloat32(s.viewConfig.b0.byteOffset, 0, true);
            writeVec2(view, s.viewConfig.rg1.byteOffset, 0, 1); // bottom left vertex: green
            view.setFloat32(s.viewConfig.b1.byteOffset, 0, true);
            writeVec2(view, s.viewConfig.rg2.byteOffset, 0, 0); // bottom right vertex: blue
            view.setFloat32(s.viewConfig.b2.byteOffset, 1, true);

            const shader = createShader(s.wgsl, s.name, [
                'vec3(data.rg0, data.b0)',
                'vec3(data.rg1, data.b1)',
                'vec3(data.rg2, data.b2)',
            ]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('three-vec2-f32-pairs.png');
        });

        it('three f32 as shared rgb for all vertices', async () => {
            const s = struct('FlatColor', {
                r: 'f32',
                g: 'f32',
                b: 'f32',
            });

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            expect(s.bufferSize).toEqual(12);
            expect(s.viewConfig).toEqual({
                r: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
                g: { scalar: 'f32', byteOffset: 4, componentCount: 1 },
                b: { scalar: 'f32', byteOffset: 8, componentCount: 1 },
            });

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
                r: { scalar: 'f32'; byteOffset: number; componentCount: number };
                g: { scalar: 'f32'; byteOffset: number; componentCount: number };
                b: { scalar: 'f32'; byteOffset: number; componentCount: number };
            }>();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(s.bufferSize);
            const view = new DataView(data);
            view.setFloat32(s.viewConfig.r.byteOffset, 1, true);
            view.setFloat32(s.viewConfig.g.byteOffset, 0, true);
            view.setFloat32(s.viewConfig.b.byteOffset, 1, true);

            const color = 'vec3(data.r, data.g, data.b)';
            const shader = createShader(s.wgsl, s.name, [color, color, color]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('three-f32-flat-color.png');
        });

        it('three consecutive vec4 fields', async () => {
            const s = struct('Colors4', {
                c0: 'vec4<f32>',
                c1: 'vec4<f32>',
                c2: 'vec4<f32>',
            });

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            expect(s.bufferSize).toEqual(48);
            expect(s.viewConfig).toEqual({
                c0: { scalar: 'f32', byteOffset: 0, componentCount: 4 },
                c1: { scalar: 'f32', byteOffset: 16, componentCount: 4 },
                c2: { scalar: 'f32', byteOffset: 32, componentCount: 4 },
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
            writeVec4(view, s.viewConfig.c0.byteOffset, 1, 0, 0, 1); // top vertex: red
            writeVec4(view, s.viewConfig.c1.byteOffset, 0, 1, 0, 1); // bottom left vertex: green
            writeVec4(view, s.viewConfig.c2.byteOffset, 0, 0, 1, 1); // bottom right vertex: blue

            const shader = createShader(s.wgsl, s.name, ['data.c0.rgb', 'data.c1.rgb', 'data.c2.rgb']);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('three-vec4.png');
        });

        it('mixed scalar types: f32, i32, u32 with vec2<i32>', async () => {
            const s = struct('MixedTypes', {
                red: 'f32',
                green: 'i32',
                blue: 'u32',
                tint: 'vec2<i32>',
            });

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            expect(s.bufferSize).toEqual(24);
            expect(s.viewConfig).toEqual({
                red: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
                green: { scalar: 'i32', byteOffset: 4, componentCount: 1 },
                blue: { scalar: 'u32', byteOffset: 8, componentCount: 1 },
                tint: { scalar: 'i32', byteOffset: 16, componentCount: 2 },
            });

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
                red: { scalar: 'f32'; byteOffset: number; componentCount: number };
                green: { scalar: 'i32'; byteOffset: number; componentCount: number };
                blue: { scalar: 'u32'; byteOffset: number; componentCount: number };
                tint: { scalar: 'i32'; byteOffset: number; componentCount: number };
            }>();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(s.bufferSize);
            const view = new DataView(data);
            view.setFloat32(s.viewConfig.red.byteOffset, 1, true);
            view.setInt32(s.viewConfig.green.byteOffset, 0, true);
            view.setUint32(s.viewConfig.blue.byteOffset, 1, true);
            view.setInt32(s.viewConfig.tint.byteOffset, 1, true); // tint.x
            view.setInt32(s.viewConfig.tint.byteOffset + 4, 1, true); // tint.y

            // red=1.0, green=0, blue=1, tint=(1,1)
            // color = (1.0, 0+1, 1-1) = (1, 1, 0) = yellow
            const color = 'vec3(data.red, f32(data.green) + f32(data.tint.x), f32(data.blue) - f32(data.tint.y))';
            const shader = createShader(s.wgsl, s.name, [color, color, color]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('mixed-types-flat-color.png');
        });
    });

    describe('array of primitives', () => {
        it('array<vec3<f32>, 3>', async () => {
            const a = sizedArray('vec3<f32>', 3);

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // vec3<f32>: size=12, align=16, stride=roundUp(16,12)=16 → 3×16=48
            expect(a.bufferSize).toEqual(48);
            expect(a.viewConfig).toEqual([
                { scalar: 'f32', byteOffset: 0, componentCount: 3 },
                { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                { scalar: 'f32', byteOffset: 32, componentCount: 3 },
            ]);

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                { scalar: 'f32'; byteOffset: number; componentCount: number }[]
            >();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(a.bufferSize);
            const view = new DataView(data);
            writeVec3(view, a.viewConfig[0].byteOffset, 1, 0, 0); // top vertex: red
            writeVec3(view, a.viewConfig[1].byteOffset, 0, 1, 0); // bottom left vertex: green
            writeVec3(view, a.viewConfig[2].byteOffset, 0, 0, 1); // bottom right vertex: blue

            const shader = createShader('', 'array<vec3<f32>, 3>', ['data[0]', 'data[1]', 'data[2]']);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('array-three-vec3f.png');
        });

        it('array<vec4<f32>, 3>', async () => {
            const a = sizedArray('vec4<f32>', 3);

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // vec4<f32>: size=16, align=16, stride=16 → 3×16=48
            expect(a.bufferSize).toEqual(48);
            expect(a.viewConfig).toEqual([
                { scalar: 'f32', byteOffset: 0, componentCount: 4 },
                { scalar: 'f32', byteOffset: 16, componentCount: 4 },
                { scalar: 'f32', byteOffset: 32, componentCount: 4 },
            ]);

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                { scalar: 'f32'; byteOffset: number; componentCount: number }[]
            >();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(a.bufferSize);
            const view = new DataView(data);
            writeVec4(view, a.viewConfig[0].byteOffset, 1, 0, 0, 1); // top vertex: red
            writeVec4(view, a.viewConfig[1].byteOffset, 0, 1, 0, 1); // bottom left vertex: green
            writeVec4(view, a.viewConfig[2].byteOffset, 0, 0, 1, 1); // bottom right vertex: blue

            const shader = createShader('', 'array<vec4<f32>, 3>', ['data[0].rgb', 'data[1].rgb', 'data[2].rgb']);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('array-three-vec4f.png');
        });

        it('array<vec3<i32>, 3>', async () => {
            const a = sizedArray('vec3<i32>', 3);

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // vec3<i32>: size=12, align=16, stride=roundUp(16,12)=16 → 3×16=48
            expect(a.bufferSize).toEqual(48);
            expect(a.viewConfig).toEqual([
                { scalar: 'i32', byteOffset: 0, componentCount: 3 },
                { scalar: 'i32', byteOffset: 16, componentCount: 3 },
                { scalar: 'i32', byteOffset: 32, componentCount: 3 },
            ]);

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                { scalar: 'i32'; byteOffset: number; componentCount: number }[]
            >();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(a.bufferSize);
            const view = new DataView(data);
            // write vec3<i32> manually (3 × setInt32 per element)
            view.setInt32(a.viewConfig[0].byteOffset, 1, true); // top vertex: red
            view.setInt32(a.viewConfig[0].byteOffset + 4, 0, true);
            view.setInt32(a.viewConfig[0].byteOffset + 8, 0, true);

            view.setInt32(a.viewConfig[1].byteOffset, 0, true); // bottom left vertex: green
            view.setInt32(a.viewConfig[1].byteOffset + 4, 1, true);
            view.setInt32(a.viewConfig[1].byteOffset + 8, 0, true);

            view.setInt32(a.viewConfig[2].byteOffset, 0, true); // bottom right vertex: blue
            view.setInt32(a.viewConfig[2].byteOffset + 4, 0, true);
            view.setInt32(a.viewConfig[2].byteOffset + 8, 1, true);

            const shader = createShader('', 'array<vec3<i32>, 3>', [
                'vec3<f32>(data[0])',
                'vec3<f32>(data[1])',
                'vec3<f32>(data[2])',
            ]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('array-three-vec3i.png');
        });
    });

    describe('array of structs', () => {
        it('array of compact struct (vec3 + f32, no internal padding)', async () => {
            const inner = struct('Vertex', {
                color: 'vec3<f32>',
                intensity: 'f32',
            });
            const a = sizedArray(inner, 3);

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // struct Vertex: vec3 at 0 (size=12), f32 at 12 (fits in vec3 tail), size=16, align=16
            // stride = roundUp(16, 16) = 16 → 3×16 = 48
            expect(inner.bufferSize).toEqual(16);
            expect(a.bufferSize).toEqual(48);
            expect(a.viewConfig).toEqual([
                {
                    color: { scalar: 'f32', byteOffset: 0, componentCount: 3 },
                    intensity: { scalar: 'f32', byteOffset: 12, componentCount: 1 },
                },
                {
                    color: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                    intensity: { scalar: 'f32', byteOffset: 28, componentCount: 1 },
                },
                {
                    color: { scalar: 'f32', byteOffset: 32, componentCount: 3 },
                    intensity: { scalar: 'f32', byteOffset: 44, componentCount: 1 },
                },
            ]);

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                {
                    color: { scalar: 'f32'; byteOffset: number; componentCount: number };
                    intensity: { scalar: 'f32'; byteOffset: number; componentCount: number };
                }[]
            >();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(a.bufferSize);
            const view = new DataView(data);
            writeVec3(view, a.viewConfig[0].color.byteOffset, 1, 0, 0);
            view.setFloat32(a.viewConfig[0].intensity.byteOffset, 1, true);
            writeVec3(view, a.viewConfig[1].color.byteOffset, 0, 1, 0);
            view.setFloat32(a.viewConfig[1].intensity.byteOffset, 0.5, true);
            writeVec3(view, a.viewConfig[2].color.byteOffset, 0, 0, 1);
            view.setFloat32(a.viewConfig[2].intensity.byteOffset, 0.25, true);

            const shader = createShader(inner.wgsl, 'array<Vertex, 3>', [
                'data[0].color * data[0].intensity',
                'data[1].color * data[1].intensity',
                'data[2].color * data[2].intensity',
            ]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('array-compact-struct.png');
        });

        it('array of padded struct (f32 + vec3, internal padding)', async () => {
            const inner = struct('ScaledColor', {
                scale: 'f32',
                color: 'vec3<f32>',
            });
            const a = sizedArray(inner, 3);

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // struct ScaledColor: f32 at 0 (size=4), vec3 needs align 16 → at 16 (size=12)
            // total=28, roundUp(16, 28)=32, stride=roundUp(16, 32)=32 → 3×32=96
            expect(inner.bufferSize).toEqual(32);
            expect(a.bufferSize).toEqual(96);
            expect(a.viewConfig).toEqual([
                {
                    scale: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
                    color: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                },
                {
                    scale: { scalar: 'f32', byteOffset: 32, componentCount: 1 },
                    color: { scalar: 'f32', byteOffset: 48, componentCount: 3 },
                },
                {
                    scale: { scalar: 'f32', byteOffset: 64, componentCount: 1 },
                    color: { scalar: 'f32', byteOffset: 80, componentCount: 3 },
                },
            ]);

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                {
                    scale: { scalar: 'f32'; byteOffset: number; componentCount: number };
                    color: { scalar: 'f32'; byteOffset: number; componentCount: number };
                }[]
            >();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(a.bufferSize);
            const view = new DataView(data);
            view.setFloat32(a.viewConfig[0].scale.byteOffset, 1, true);
            writeVec3(view, a.viewConfig[0].color.byteOffset, 1, 0, 0);
            view.setFloat32(a.viewConfig[1].scale.byteOffset, 0.5, true);
            writeVec3(view, a.viewConfig[1].color.byteOffset, 0, 1, 0);
            view.setFloat32(a.viewConfig[2].scale.byteOffset, 0.25, true);
            writeVec3(view, a.viewConfig[2].color.byteOffset, 0, 0, 1);

            const shader = createShader(inner.wgsl, 'array<ScaledColor, 3>', [
                'data[0].color * data[0].scale',
                'data[1].color * data[1].scale',
                'data[2].color * data[2].scale',
            ]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('array-padded-struct.png');
        });
    });

    describe('nesting', () => {
        it('struct holding an array of nested structs', async () => {
            const inner = struct('VertexColor', {
                color: 'vec3<f32>',
                intensity: 'f32',
            });
            const outer = struct('Scene', {
                ambient: 'f32',
                vertices: sizedArray(inner, 3),
            });

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // VertexColor: vec3 at 0, f32 at 12 (tail reuse), size=16, align=16
            // array<VertexColor, 3>: stride=16, size=48
            // Scene: ambient f32 at 0, vertices at roundUp(16, 4)=16, total=64
            expect(inner.bufferSize).toEqual(16);
            expect(outer.bufferSize).toEqual(64);
            expect(outer.viewConfig).toEqual({
                ambient: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
                vertices: [
                    {
                        color: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                        intensity: { scalar: 'f32', byteOffset: 28, componentCount: 1 },
                    },
                    {
                        color: { scalar: 'f32', byteOffset: 32, componentCount: 3 },
                        intensity: { scalar: 'f32', byteOffset: 44, componentCount: 1 },
                    },
                    {
                        color: { scalar: 'f32', byteOffset: 48, componentCount: 3 },
                        intensity: { scalar: 'f32', byteOffset: 60, componentCount: 1 },
                    },
                ],
            });

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof outer.viewConfig>().toEqualTypeOf<{
                ambient: { scalar: 'f32'; byteOffset: number; componentCount: number };
                vertices: {
                    color: { scalar: 'f32'; byteOffset: number; componentCount: number };
                    intensity: { scalar: 'f32'; byteOffset: number; componentCount: number };
                }[];
            }>();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(outer.bufferSize);
            const view = new DataView(data);
            view.setFloat32(outer.viewConfig.ambient.byteOffset, 0.5, true);

            writeVec3(view, outer.viewConfig.vertices[0].color.byteOffset, 1, 0, 0);
            view.setFloat32(outer.viewConfig.vertices[0].intensity.byteOffset, 1, true);
            writeVec3(view, outer.viewConfig.vertices[1].color.byteOffset, 0, 1, 0);
            view.setFloat32(outer.viewConfig.vertices[1].intensity.byteOffset, 1, true);
            writeVec3(view, outer.viewConfig.vertices[2].color.byteOffset, 0, 0, 1);
            view.setFloat32(outer.viewConfig.vertices[2].intensity.byteOffset, 1, true);

            const shader = createShader(`${inner.wgsl}\n\n${outer.wgsl}`, 'Scene', [
                'data.vertices[0].color * data.vertices[0].intensity * data.ambient',
                'data.vertices[1].color * data.vertices[1].intensity * data.ambient',
                'data.vertices[2].color * data.vertices[2].intensity * data.ambient',
            ]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('nested-struct-array-struct.png');
        });

        it('array of arrays of structs', async () => {
            const tint = struct('Tint', {
                color: 'vec3<f32>',
            });
            const a = sizedArray(sizedArray(tint, 2), 3);

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // Tint: vec3 at 0, size=16, align=16
            // array<Tint, 2>: stride=16, size=32
            // array<array<Tint, 2>, 3>: stride=32, size=96
            expect(tint.bufferSize).toEqual(16);
            expect(a.bufferSize).toEqual(96);
            expect(a.viewConfig).toEqual([
                [
                    { color: { scalar: 'f32', byteOffset: 0, componentCount: 3 } },
                    { color: { scalar: 'f32', byteOffset: 16, componentCount: 3 } },
                ],
                [
                    { color: { scalar: 'f32', byteOffset: 32, componentCount: 3 } },
                    { color: { scalar: 'f32', byteOffset: 48, componentCount: 3 } },
                ],
                [
                    { color: { scalar: 'f32', byteOffset: 64, componentCount: 3 } },
                    { color: { scalar: 'f32', byteOffset: 80, componentCount: 3 } },
                ],
            ]);

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                { color: { scalar: 'f32'; byteOffset: number; componentCount: number } }[][]
            >();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(a.bufferSize);
            const view = new DataView(data);
            // each vertex blends two tints: data[i][0].color + data[i][1].color
            writeVec3(view, a.viewConfig[0][0].color.byteOffset, 0.5, 0, 0); // top vertex: red
            writeVec3(view, a.viewConfig[0][1].color.byteOffset, 0.5, 0, 0);
            writeVec3(view, a.viewConfig[1][0].color.byteOffset, 0, 0.5, 0); // bottom left: green
            writeVec3(view, a.viewConfig[1][1].color.byteOffset, 0, 0.5, 0);
            writeVec3(view, a.viewConfig[2][0].color.byteOffset, 0, 0, 0.5); // bottom right: blue
            writeVec3(view, a.viewConfig[2][1].color.byteOffset, 0, 0, 0.5);

            const shader = createShader(tint.wgsl, 'array<array<Tint, 2>, 3>', [
                'data[0][0].color + data[0][1].color',
                'data[1][0].color + data[1][1].color',
                'data[2][0].color + data[2][1].color',
            ]);
            await render(shader, data);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('nested-array-array-struct.png');
        });
    });

    describe('runtime array', () => {
        it('runtime array of structs via storage buffer', async () => {
            const vertex = struct('Vertex', {
                color: 'vec3<f32>',
                scale: 'f32',
            });
            const a = runtimeArray(vertex, 3);

            // ==================================================================================
            // Make sure that the buffer size and view config matches our expectations at runtime

            // Vertex: vec3 at 0, f32 at 12 (tail reuse), size=16, align=16
            // runtime array: stride=16, maxSize=3 → bufferSize=48
            expect(vertex.bufferSize).toEqual(16);
            expect(a.bufferSize).toEqual(48);
            expect(a.viewConfig).toEqual([
                {
                    color: { scalar: 'f32', byteOffset: 0, componentCount: 3 },
                    scale: { scalar: 'f32', byteOffset: 12, componentCount: 1 },
                },
                {
                    color: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                    scale: { scalar: 'f32', byteOffset: 28, componentCount: 1 },
                },
                {
                    color: { scalar: 'f32', byteOffset: 32, componentCount: 3 },
                    scale: { scalar: 'f32', byteOffset: 44, componentCount: 1 },
                },
            ]);

            // =====================================================================
            // Make sure that the viewConfig is correctly inferred on the type level

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                {
                    color: { scalar: 'f32'; byteOffset: number; componentCount: number };
                    scale: { scalar: 'f32'; byteOffset: number; componentCount: number };
                }[]
            >();

            // =================================================================
            // Visual check that the values are correctly unpacked in the shader

            const data = new ArrayBuffer(a.bufferSize);
            const view = new DataView(data);
            writeVec3(view, a.viewConfig[0].color.byteOffset, 1, 0, 0); // top vertex: red
            view.setFloat32(a.viewConfig[0].scale.byteOffset, 1, true);
            writeVec3(view, a.viewConfig[1].color.byteOffset, 0, 1, 0); // bottom left: green
            view.setFloat32(a.viewConfig[1].scale.byteOffset, 0.5, true);
            writeVec3(view, a.viewConfig[2].color.byteOffset, 0, 0, 1); // bottom right: blue
            view.setFloat32(a.viewConfig[2].scale.byteOffset, 0.25, true);

            const shader = createShader(
                vertex.wgsl,
                'array<Vertex>',
                ['data[0].color * data[0].scale', 'data[1].color * data[1].scale', 'data[2].color * data[2].scale'],
                'storage, read',
            );
            await render(shader, data, GPUBufferUsage.STORAGE);
            await expect.element(page.getByTestId('webgpu-canvas')).toMatchScreenshot('runtime-array-struct.png');
        });
    });
});
