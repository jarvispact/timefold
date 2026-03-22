import { Mat4, Vec3 } from '@timefold/math';
import { DomUtils } from '@timefold/engine';
import { WebgpuUtils, Wgsl, Bgl } from '@timefold/webgpu';
import { cubeVertices, VERTEX_STRIDE } from './cube-data';

// --- GPU init ---------------------------------------------------------------

const canvas = DomUtils.getCanvasById('canvas');
const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

const vertexBuffer = device.createBuffer({
    size: cubeVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, cubeVertices);

const FrameUniforms = Wgsl.struct('FrameUniforms', {
    view: 'mat4x4<f32>',
    projection: 'mat4x4<f32>',
    lightPos: 'vec3<f32>',
    viewPos: 'vec3<f32>',
});

const ObjectUniforms = Wgsl.struct('ObjectUniforms', {
    model: 'mat4x4<f32>',
    color: 'vec3<f32>',
});

const Layout = Bgl.layout({
    per_frame: {
        frame: Bgl.uniform(FrameUniforms),
    },
    per_object: {
        object: Bgl.uniform(ObjectUniforms),
    },
});

// --- Depth texture & resize -------------------------------------------------

const DEPTH_FORMAT = 'depth24plus' as const;

let depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: DEPTH_FORMAT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const shaderCode = /* wgsl */ `
${Layout.wgsl}

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

const gpu = Layout.init(device);

const pipeline = device.createRenderPipeline({
    layout: gpu.pipelineLayout,
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

const perFrame = gpu.createGroup('per_frame');
const perObjectA = gpu.createGroup('per_object');
const perObjectB = gpu.createGroup('per_object');

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

const frameData = FrameUniforms.create();
const objectData = ObjectUniforms.create();
const model = Mat4.create();
const translation = Mat4.create();
const identity = Mat4.create();

const colorA = Vec3.create(0.9, 0.3, 0.1); // orange
const colorB = Vec3.create(0.1, 0.4, 0.9); // blue

const writeObjectUniforms = (group: typeof perObjectA, modelMat: typeof model, color: typeof colorA) => {
    objectData.views.model.set(modelMat as number[]);
    objectData.views.color.set(color as number[]);
    device.queue.writeBuffer(group.buffers.object, 0, objectData.data);
};

const frame = (t: number) => {
    const time = t * 0.001;

    frameData.views.view.set(view as number[]);
    frameData.views.projection.set(projection as number[]);
    frameData.views.lightPos.set(lightPos as number[]);
    frameData.views.viewPos.set(viewPos as number[]);
    device.queue.writeBuffer(perFrame.buffers.frame, 0, frameData.data);

    // Object A — left, slow rotation
    Mat4.fromTranslation(translation, Vec3.create(-2, 0, 0));
    Mat4.rotationY(model, identity, time * 0.5);
    Mat4.multiply(model, translation, model);
    writeObjectUniforms(perObjectA, model, colorA);

    // Object B — right, fast rotation
    Mat4.fromTranslation(translation, Vec3.create(2, 0, 0));
    Mat4.rotationY(model, identity, time * 2.0);
    Mat4.multiply(model, translation, model);
    writeObjectUniforms(perObjectB, model, colorB);

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
    pass.setBindGroup(perFrame.index, perFrame.bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);

    // Draw object A
    pass.setBindGroup(perObjectA.index, perObjectA.bindGroup);
    pass.draw(36);

    // Draw object B
    pass.setBindGroup(perObjectB.index, perObjectB.bindGroup);
    pass.draw(36);

    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
};

requestAnimationFrame(frame);
