/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Mat4, Vec3 } from '@timefold/math';
import { cubeVertices, VERTEX_STRIDE } from './cube-data';

// --- GPU init ---------------------------------------------------------------

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error('No GPU adapter found');
const device = await adapter.requestDevice();

const context = canvas.getContext('webgpu')!;
const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format });

// --- Shader -----------------------------------------------------------------

const shaderCode = /* wgsl */ `
struct FrameUniforms {
    view:       mat4x4<f32>,
    projection: mat4x4<f32>,
    lightPos:   vec3<f32>,
    viewPos:    vec3<f32>,
}

struct ObjectUniforms {
    model: mat4x4<f32>,
    color: vec3<f32>,
}

@group(0) @binding(0) var<uniform> frame:  FrameUniforms;
@group(1) @binding(0) var<uniform> object: ObjectUniforms;

struct VsIn {
    @location(0) position: vec3<f32>,
    @location(1) normal:   vec3<f32>,
}

struct VsOut {
  @builtin(position) pos:      vec4<f32>,
  @location(0)       worldPos: vec3<f32>,
  @location(1)       normal:   vec3<f32>,
}

@vertex
fn vs(in: VsIn) -> VsOut {
  let worldPos = object.model * vec4(in.position, 1.0);
  var out: VsOut;
  out.pos      = frame.projection * frame.view * worldPos;
  out.worldPos = worldPos.xyz;
  out.normal   = (object.model * vec4(in.normal, 0.0)).xyz;
  return out;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let N = normalize(in.normal);
  let L = normalize(frame.lightPos - in.worldPos);
  let V = normalize(frame.viewPos  - in.worldPos);
  let H = normalize(L + V);

  let ambient  = object.color * 0.1;
  let diffuse  = max(dot(N, L), 0.0) * object.color;
  let specular = pow(max(dot(N, H), 0.0), 64.0) * vec3<f32>(1.0, 1.0, 1.0);

  return vec4(ambient + diffuse + specular, 1.0);
}
`;

const shaderModule = device.createShaderModule({ code: shaderCode });

// --- Bind group layouts & pipeline layout -----------------------------------

const frameBindGroupLayout = device.createBindGroupLayout({
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
        },
    ],
});

const objectBindGroupLayout = device.createBindGroupLayout({
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
        },
    ],
});

const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [frameBindGroupLayout, objectBindGroupLayout],
});

// --- Pipeline ---------------------------------------------------------------

const DEPTH_FORMAT = 'depth24plus' as const;

const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
        module: shaderModule,
        entryPoint: 'vs',
        buffers: [
            {
                arrayStride: VERTEX_STRIDE,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },
                    { shaderLocation: 1, offset: 12, format: 'float32x3' },
                ],
            },
        ],
    },
    fragment: {
        module: shaderModule,
        entryPoint: 'fs',
        targets: [{ format }],
    },
    primitive: {
        topology: 'triangle-list',
        frontFace: 'cw',
        cullMode: 'back',
    },
    depthStencil: {
        format: DEPTH_FORMAT,
        depthWriteEnabled: true,
        depthCompare: 'less',
    },
});

// --- Vertex buffer ----------------------------------------------------------

const vertexBuffer = device.createBuffer({
    size: cubeVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, cubeVertices);

const vertexCount = cubeVertices.length / 6; // 6 floats per vertex

// --- Uniform buffers & bind groups ------------------------------------------

// FrameUniforms layout (WGSL uniform alignment):
//   view:       offset 0   (64 bytes)
//   projection: offset 64  (64 bytes)
//   lightPos:   offset 128 (12 bytes, aligned 16)
//   viewPos:    offset 144 (12 bytes, aligned 16)
//   total: 160 bytes (rounded to alignment of 16)
const FRAME_BUFFER_SIZE = 160;

// ObjectUniforms layout:
//   model: offset 0  (64 bytes)
//   color: offset 64 (12 bytes, aligned 16)
//   total: 80 bytes
const OBJECT_BUFFER_SIZE = 80;

const frameBuffer = device.createBuffer({
    size: FRAME_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const objectBufferA = device.createBuffer({
    size: OBJECT_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const objectBufferB = device.createBuffer({
    size: OBJECT_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const frameBindGroup = device.createBindGroup({
    layout: frameBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: frameBuffer } }],
});

const objectBindGroupA = device.createBindGroup({
    layout: objectBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: objectBufferA } }],
});

const objectBindGroupB = device.createBindGroup({
    layout: objectBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: objectBufferB } }],
});

// --- Depth texture & resize -------------------------------------------------

let depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: DEPTH_FORMAT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const projection = Mat4.create();
const eye = Vec3.create(3, 5, -8);
const view = Mat4.lookAt(Mat4.create(), eye, Vec3.zero(), Vec3.up());
const lightPos = Vec3.create(4, 5, -3);
const viewPos = Vec3.createCopy(eye);

Mat4.perspective(projection, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0];
        const w = Math.max(1, Math.floor(width * devicePixelRatio));
        const h = Math.max(1, Math.floor(height * devicePixelRatio));
        canvas.width = w;
        canvas.height = h;
        depthTexture.destroy();
        depthTexture = device.createTexture({
            size: [w, h],
            format: DEPTH_FORMAT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        Mat4.perspective(projection, Math.PI / 4, w / h, 0.1, 100);
    }
});
resizeObserver.observe(canvas);

// --- Staging data -----------------------------------------------------------

const frameData = new ArrayBuffer(FRAME_BUFFER_SIZE);
const frameFloats = new Float32Array(frameData);

const objectData = new ArrayBuffer(OBJECT_BUFFER_SIZE);
const objectFloats = new Float32Array(objectData);

const model = Mat4.create();
const translation = Mat4.create();
const identity = Mat4.create();

const colorA = Vec3.create(0.9, 0.3, 0.1); // orange
const colorB = Vec3.create(0.1, 0.4, 0.9); // blue

const writeFrameUniforms = () => {
    frameFloats.set(view as number[], 0); // offset 0: view
    frameFloats.set(projection as number[], 16); // offset 64: projection
    frameFloats.set(lightPos as number[], 32); // offset 128: lightPos
    frameFloats.set(viewPos as number[], 36); // offset 144: viewPos
    device.queue.writeBuffer(frameBuffer, 0, frameData);
};

const writeObjectUniforms = (buffer: GPUBuffer, modelMat: typeof model, color: typeof colorA) => {
    objectFloats.set(modelMat as number[], 0); // offset 0: model
    objectFloats.set(color as number[], 16); // offset 64: color
    device.queue.writeBuffer(buffer, 0, objectData);
};

// --- Render loop ------------------------------------------------------------

const frame = (t: number) => {
    const time = t * 0.001;

    writeFrameUniforms();

    // Object A — left, slow rotation
    Mat4.fromTranslation(translation, Vec3.create(-2, 0, 0));
    Mat4.rotationY(model, identity, time * 0.5);
    Mat4.multiply(model, translation, model);
    writeObjectUniforms(objectBufferA, model, colorA);

    // Object B — right, fast rotation
    Mat4.fromTranslation(translation, Vec3.create(2, 0, 0));
    Mat4.rotationY(model, identity, time * 2.0);
    Mat4.multiply(model, translation, model);
    writeObjectUniforms(objectBufferB, model, colorB);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear' as GPULoadOp,
                storeOp: 'store' as GPUStoreOp,
                clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: 'clear' as GPULoadOp,
            depthStoreOp: 'store' as GPUStoreOp,
            depthClearValue: 1.0,
        },
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, frameBindGroup);
    pass.setVertexBuffer(0, vertexBuffer);

    // Draw object A
    pass.setBindGroup(1, objectBindGroupA);
    pass.draw(vertexCount);

    // Draw object B
    pass.setBindGroup(1, objectBindGroupB);
    pass.draw(vertexCount);

    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
};

requestAnimationFrame(frame);
