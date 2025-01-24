# @timefold/webgpu
Fast and efficient, utilities to work with wgsl and webgpu.

## Overview

See it in action in this [stackblitz example](https://stackblitz.com/edit/timefold-webgpu-example?file=src%2Fmain.ts)

- 🔺 Define your structs and uniforms in Typescript.
- 🔨 Utilities to interface with WebGPU in a typesafe way.
- 🌳 Tree shaking - Only pay for what you need.
- 🚀 Awesome DX and type safety

## Installation

- `npm i @timefold/webgpu`

## Quick start

```ts
import { Uniform, Wgsl, WebgpuUtils } from '@timefold/webgpu';

// Step 1:
// Define your typesafe structs and uniforms.

const Camera = Wgsl.struct('Camera', {
    position: Wgsl.type('vec3<f32>'),
    view_matrix: Wgsl.type('mat4x4<f32>'),
    projection_matrix: Wgsl.type('mat4x4<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const DirLight = Wgsl.struct('DirLight', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
    intensity: Wgsl.type('f32'),
});

const Scene = Wgsl.struct('Scene', {
    camera: Camera,
    dir_lights: Wgsl.array(DirLight, 3),
});

const Material = Wgsl.struct('Material', {
    diffuse: Wgsl.type('vec3<f32>'),
    specular: Wgsl.type('vec3<f32>'),
    opacity: Wgsl.type('f32'),
});

const Entity = Wgsl.struct('Entity', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    material: Material,
});

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.buffer(0, Scene),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.buffer(0, Entity),
    color_map_sampler: Uniform.sampler(1),
    color_map_texture: Uniform.texture(2),
});

// Step 2:
// Define your typesafe vertex buffer layout.

const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', offset: 0 },
    uv: { format: 'float32x2', offset: 3 },
});

// Step 3:
// Use it to generate the wgsl declarations for your shader.

const uniformsWgsl = Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup]);
const vertexWgsl = Vertex.wgsl;

const shaderCode = `
${vertexWgsl}
${uniformsWgsl}

@vertex fn vs(vert: Vertex) -> VsOut {
    // your code goes here
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    // your code goes here
}
`;

// Step 4:
// Create a pipeline and layout.

const { device, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
const shaderModule = device.createShaderModule({ code: shaderCode });

const Pipeline = WebgpuUtils.createPipelineLayout({
    device,
    uniformGroups: [SceneUniformGroup, EntityUniformGroup],
});

const pipeline = device.createRenderPipeline({
    layout: Pipeline.layout,
    vertex: { module: shaderModule, buffers: Vertex.layout },
    fragment: { module: shaderModule, targets: [{ format }] },
});

// Step 5:
// Create typesafe bindgroups and vertex buffers

const scene = Pipeline.createBindGroups(0, {
    scene: WebgpuUtils.createBufferDescriptor(),
});

const entity = Pipeline.createBindGroups(1, {
    entity: WebgpuUtils.createBufferDescriptor(),
    color_map_sampler: WebgpuUtils.createSampler(device),
    color_map_texture: WebgpuUtils.createImageBitmapTexture(device, imageBitmap),
});

const vertex = Vertex.createBuffer(device, new Float32Array([...]));

// Step 6:
// Create ArrayBuffer and TypedArray views.
// (ℹ️) The padding and alignment rules are handled for you.
// (ℹ️) Typesafe access to the generated views.

const sceneData = Scene.create();
const entityData = Entity.create();

// Step 7:
// Use the bindgroups and buffers in your render pass.

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({ ... });
pass.setPipeline(pipeline);
pass.setVertexBuffer(vertex.slot, vertex.buffer);

pass.setBindGroup(0, scene.bindGroup);
device.queue.writeBuffer(scene.buffers.scene, 0, sceneData.buffer);

pass.setBindGroup(1, entity.bindGroup);
device.queue.writeBuffer(entity.buffers.entity, 0, entityData.buffer);
pass.draw(vertex.count);

pass.end();
device.queue.submit([encoder.finish()]);

```