import { Mat4x4, MathUtils, Vec3, Vec3Type } from '@timefold/math';
import { Entity } from './entity';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

/* eslint-disable prettier/prettier */
const triangle = new Float32Array([
     1.0, -1.0, 0.0,
     0.0,  1.0, 0.0,
    -1.0, -1.0, 0.0,
]);
/* eslint-enable prettier/prettier */

const shaderCode = /* wgsl */ `
struct Vertex {
    @location(0) position: vec3<f32>,
}

struct Scene {
    view_projection_matrix: mat4x4<f32>,
}

struct Entity {
    model_matrix: mat4x4<f32>,
    color: vec3<f32>,
}

@group(0) @binding(0) var<uniform> scene: Scene;
@group(1) @binding(0) var<uniform> entity: Entity;

@vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
    return scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
    return vec4f(entity.color, 1.0);
}
`.trim();

const createEntity = (device: GPUDevice, layout: GPUBindGroupLayout, position: Vec3Type, color: Vec3Type): Entity => {
    const data = new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT);
    const modelMatrix = new Float32Array(data, 0, 16);
    const _color = new Float32Array(data, 16 * Float32Array.BYTES_PER_ELEMENT, 3);

    Mat4x4.fromTranslation(modelMatrix, position);
    Vec3.copy(_color, color);

    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindgroup = device.createBindGroup({
        layout,
        entries: [{ binding: 0, resource: { buffer } }],
    });

    return {
        data,
        modelMatrix,
        color: _color,
        buffer,
        bindgroup,
    };
};

const run = async () => {
    // adapter, device, context, module

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

    // pipeline layout

    const sceneLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' },
            },
        ],
    });

    const entityLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' },
            },
        ],
    });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [sceneLayout, entityLayout],
    });

    // pipeline

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

    // render pass

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

    // scene data

    const sceneData = new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT);
    const viewProjectionMatrix = new Float32Array(sceneData, 0, 16);
    const view = Mat4x4.createLookAt([2, 2, 5], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
    Mat4x4.multiplication(viewProjectionMatrix, proj, view);

    const sceneBuffer = device.createBuffer({
        size: sceneData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const sceneBindgroup = device.createBindGroup({
        layout: sceneLayout,
        entries: [{ binding: 0, resource: { buffer: sceneBuffer } }],
    });

    // geometry

    const positionBuffer = device.createBuffer({
        size: triangle.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(positionBuffer, 0, triangle);

    // entity data

    const entities: Entity[] = [];

    entities.push(
        createEntity(device, entityLayout, [-2, 0, 0], [1, 0, 0]),
        createEntity(device, entityLayout, [2, 0, 0], [0, 1, 0]),
    );

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, positionBuffer);

        pass.setBindGroup(0, sceneBindgroup);
        device.queue.writeBuffer(sceneBuffer, 0, sceneData);

        for (const entity of entities) {
            pass.setBindGroup(1, entity.bindgroup);
            device.queue.writeBuffer(entity.buffer, 0, entity.data);
            pass.draw(triangle.length / 3);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    render();
};

void run();
