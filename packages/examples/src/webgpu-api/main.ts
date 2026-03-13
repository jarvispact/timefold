// ============================================================================
// WebGPU Phong-Lit Cube — raw API, zero abstractions
// ============================================================================

import { Mat4, Vec3 } from '@timefold/math';
import { DomUtils } from '@timefold/engine';
import { WebgpuUtils } from '@timefold/webgpu';

// --- GPU init ---------------------------------------------------------------

const canvas = DomUtils.getCanvasById('canvas');
const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

// --- Cube geometry ----------------------------------------------------------
// Abstraction idea: `defineGeometry({ layout: [pos: vec3f, normal: vec3f], data })` that
// auto-computes arrayStride, attribute offsets/formats, and returns typed GPUVertexBufferLayout + GPUBuffer.

// prettier-ignore
const cubeVertices = new Float32Array([
  // pos (vec3)          normal (vec3)        — 6 floats per vertex, 36 vertices (no index buffer)
  // Front face (+Z in right-handed, but we use -Z forward so this faces the camera)
  // Face -Z (front, facing camera)
  -1, -1, -1,   0,  0, -1,
   1, -1, -1,   0,  0, -1,
   1,  1, -1,   0,  0, -1,
  -1, -1, -1,   0,  0, -1,
   1,  1, -1,   0,  0, -1,
  -1,  1, -1,   0,  0, -1,
  // Face +Z (back)
  -1, -1,  1,   0,  0,  1,
   1,  1,  1,   0,  0,  1,
   1, -1,  1,   0,  0,  1,
  -1, -1,  1,   0,  0,  1,
  -1,  1,  1,   0,  0,  1,
   1,  1,  1,   0,  0,  1,
  // Face +X (right)
   1, -1, -1,   1,  0,  0,
   1, -1,  1,   1,  0,  0,
   1,  1,  1,   1,  0,  0,
   1, -1, -1,   1,  0,  0,
   1,  1,  1,   1,  0,  0,
   1,  1, -1,   1,  0,  0,
  // Face -X (left)
  -1, -1, -1,  -1,  0,  0,
  -1,  1,  1,  -1,  0,  0,
  -1, -1,  1,  -1,  0,  0,
  -1, -1, -1,  -1,  0,  0,
  -1,  1, -1,  -1,  0,  0,
  -1,  1,  1,  -1,  0,  0,
  // Face +Y (top)
  -1,  1, -1,   0,  1,  0,
   1,  1, -1,   0,  1,  0,
   1,  1,  1,   0,  1,  0,
  -1,  1, -1,   0,  1,  0,
   1,  1,  1,   0,  1,  0,
  -1,  1,  1,   0,  1,  0,
  // Face -Y (bottom)
  -1, -1, -1,   0, -1,  0,
   1, -1,  1,   0, -1,  0,
   1, -1, -1,   0, -1,  0,
  -1, -1, -1,   0, -1,  0,
  -1, -1,  1,   0, -1,  0,
   1, -1,  1,   0, -1,  0,
]);

const vertexBuffer = device.createBuffer({
    size: cubeVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, cubeVertices);

const VERTEX_STRIDE = 6 * 4; // 6 floats × 4 bytes

// --- Uniform buffers --------------------------------------------------------
// Abstraction idea: `defineUniformStruct({ ... })` that computes WGSL struct layout,
// byte offsets per field (respecting alignment rules from spec), total padded size,
// and returns a typed writer: `uniforms.set('lightPos', [2,5,3])`.

// Per-frame uniforms (group 0) — written once per frame:
//   mat4x4<f32> view          offset  0   size 64  align 16
//   mat4x4<f32> projection    offset 64   size 64  align 16
//   vec3<f32>   lightPos      offset 128  size 12  align 16  (+4 bytes padding)
//   vec3<f32>   viewPos       offset 144  size 12  align 16  (+4 bytes padding)
//   Total: roundUp(16, 156) = 160 bytes

const FRAME_UNIFORM_SIZE = 160;
const frameUniformBuffer = device.createBuffer({
    size: FRAME_UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// Per-object uniforms (group 1) — written per draw call:
//   mat4x4<f32> model         offset  0   size 64  align 16
//   vec3<f32>   color         offset 64   size 12  align 16  (+4 bytes padding)
//   Total: roundUp(16, 76) = 80 bytes

const OBJECT_UNIFORM_SIZE = 80;
const objectUniformBufferA = device.createBuffer({
    size: OBJECT_UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const objectUniformBufferB = device.createBuffer({
    size: OBJECT_UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// --- Depth texture & resize -------------------------------------------------

const DEPTH_FORMAT = 'depth24plus' as const;

let depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: DEPTH_FORMAT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

// --- Shader -----------------------------------------------------------------
// Abstraction idea: a shader builder that lets you declare structs once in TS and
// generates both the WGSL source AND the matching JS layout metadata. e.g.:
//   const Uniforms = wgslStruct('Uniforms', { model: mat4x4f, view: mat4x4f, ... });
//   const shader = wgslModule`...${Uniforms}...`;  // embeds the struct declaration
// This keeps WGSL and TS in sync and eliminates offset/alignment bugs.

const shaderCode = /* wgsl */ `

struct FrameUniforms {
  view:       mat4x4<f32>,
  projection: mat4x4<f32>,
  lightPos:   vec3<f32>,      // align 16, size 12 + 4 bytes padding
  viewPos:    vec3<f32>,      // align 16, size 12 + 4 bytes padding
}

struct ObjectUniforms {
  model: mat4x4<f32>,
  color: vec3<f32>,           // align 16, size 12 + 4 bytes padding
}

@group(0) @binding(0) var<uniform> frame:  FrameUniforms;
@group(1) @binding(0) var<uniform> object: ObjectUniforms;

struct VsOut {
  @builtin(position) pos:      vec4<f32>,
  @location(0)       worldPos: vec3<f32>,
  @location(1)       normal:   vec3<f32>,
}

@vertex
fn vs(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>) -> VsOut {
  let worldPos = object.model * vec4(position, 1.0);
  var out: VsOut;
  out.pos      = frame.projection * frame.view * worldPos;
  out.worldPos = worldPos.xyz;
  // Normal transform: for uniform scale, model matrix suffices.
  // For non-uniform scale you'd need the inverse-transpose — skip for now.
  out.normal   = (object.model * vec4(normal, 0.0)).xyz;
  return out;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let N = normalize(in.normal);
  let L = normalize(frame.lightPos - in.worldPos);
  let V = normalize(frame.viewPos  - in.worldPos);
  let H = normalize(L + V);

  // Phong components
  let ambient  = object.color * 0.1;
  let diffuse  = max(dot(N, L), 0.0) * object.color;
  let specular = pow(max(dot(N, H), 0.0), 64.0) * vec3<f32>(1.0, 1.0, 1.0);

  return vec4(ambient + diffuse + specular, 1.0);
}
`;

const shaderModule = device.createShaderModule({ code: shaderCode });

// --- Bind group layout & pipeline layout ------------------------------------
// Abstraction idea: derive these from the shader's @group/@binding declarations and
// the uniform struct metadata. The abstraction knows visibility from entry point usage,
// buffer type from var<uniform> vs var<storage>, and minBindingSize from struct layout.

const frameBindGroupLayout = device.createBindGroupLayout({
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform', minBindingSize: FRAME_UNIFORM_SIZE },
        },
    ],
});

const objectBindGroupLayout = device.createBindGroupLayout({
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform', minBindingSize: OBJECT_UNIFORM_SIZE },
        },
    ],
});

const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [frameBindGroupLayout, objectBindGroupLayout],
});

// --- Pipeline ---------------------------------------------------------------
// Abstraction idea: `createRenderPipelineFrom({ shader, vertexLayout, depthFormat, ... })`
// that derives the vertex buffer layout from the shader's @location attributes,
// auto-matches fragment target format to the canvas, and fills in sensible defaults
// for primitive/depthStencil/multisample. Cuts the descriptor from ~40 lines to ~5.

const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
        module: shaderModule,
        entryPoint: 'vs',
        buffers: [
            {
                arrayStride: VERTEX_STRIDE,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' as GPUVertexFormat }, // position
                    { shaderLocation: 1, offset: 12, format: 'float32x3' as GPUVertexFormat }, // normal
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

// --- Bind groups ------------------------------------------------------------
// Abstraction idea: auto-derive bind group from layout + named resource map:
//   `createBindGroupFor(bindGroupLayout, { uniforms: uniformBuffer })`
// Maps names → bindings using metadata from the layout definition.

const frameBindGroup = device.createBindGroup({
    layout: frameBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: frameUniformBuffer } }],
});

const objectBindGroupA = device.createBindGroup({
    layout: objectBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: objectUniformBufferA } }],
});

const objectBindGroupB = device.createBindGroup({
    layout: objectBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: objectUniformBufferB } }],
});

// --- Render loop ------------------------------------------------------------
// Abstraction idea for uniform writes: the struct abstraction from above could provide
//   uniforms.write(device, { model: mat4RotateY(t), view, projection, lightPos, viewPos })
// that packs fields at correct byte offsets into a single writeBuffer call.

const projection = Mat4.create();
const eye = Vec3.create(3, 5, -8);
const view = Mat4.lookAt(Mat4.create(), eye, Vec3.zero(), Vec3.up());
const lightPos = Vec3.create(4, 5, -3);
const viewPos = Vec3.createCopy(eye);

Mat4.perspective(projection, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

DomUtils.onResize({
    canvas,
    fn: (width, height) => {
        depthTexture.destroy();
        depthTexture = device.createTexture({
            size: [width, height],
            format: DEPTH_FORMAT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        Mat4.perspective(projection, Math.PI / 4, width / height, 0.1, 100);
    },
});

const frameUniformData = new Float32Array(FRAME_UNIFORM_SIZE / 4);
const objectUniformData = new Float32Array(OBJECT_UNIFORM_SIZE / 4);
const model = Mat4.create();
const translation = Mat4.create();
const identity = Mat4.create();

const colorA = Vec3.create(0.9, 0.3, 0.1); // orange
const colorB = Vec3.create(0.1, 0.4, 0.9); // blue

const writeObjectUniforms = (buffer: GPUBuffer, modelMat: typeof model, color: typeof colorA) => {
    objectUniformData.set(modelMat as number[], 0); // offset 0:  model
    objectUniformData.set(color as number[], 16); // offset 64: color.xyz  (64 / 4 = 16 floats)
    // objectUniformData[19] = 0;                   // padding already zero
    device.queue.writeBuffer(buffer, 0, objectUniformData);
};

const frame = (t: number) => {
    const time = t * 0.001;

    // Pack per-frame uniforms (once)
    frameUniformData.set(view as number[], 0); // offset 0:   view
    frameUniformData.set(projection as number[], 16); // offset 64:  projection  (64 / 4 = 16 floats)
    frameUniformData.set(lightPos as number[], 32); // offset 128: lightPos.xyz  (128 / 4 = 32 floats)
    // frameUniformData[35] = 0;                     // padding already zero
    frameUniformData.set(viewPos as number[], 36); // offset 144: viewPos.xyz   (144 / 4 = 36 floats)
    // frameUniformData[39] = 0;                     // padding already zero
    device.queue.writeBuffer(frameUniformBuffer, 0, frameUniformData);

    // Object A — left, slow rotation
    Mat4.fromTranslation(translation, Vec3.create(-2, 0, 0));
    Mat4.rotationY(model, identity, time * 0.5);
    Mat4.multiply(model, translation, model);
    writeObjectUniforms(objectUniformBufferA, model, colorA);

    // Object B — right, fast rotation
    Mat4.fromTranslation(translation, Vec3.create(2, 0, 0));
    Mat4.rotationY(model, identity, time * 2.0);
    Mat4.multiply(model, translation, model);
    writeObjectUniforms(objectUniformBufferB, model, colorB);

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
    pass.draw(36);

    // Draw object B
    pass.setBindGroup(1, objectBindGroupB);
    pass.draw(36);

    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
};

requestAnimationFrame(frame);
