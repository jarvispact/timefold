# WebGPU Specification - Condensed Reference

Condensed reference of the W3C WebGPU specification (https://www.w3.org/TR/webgpu/) for implementing web-targeted rendering code.

---

## 1. Architecture

### Timelines

- **Content timeline** - JS execution, API calls
- **Device timeline** - resource creation, driver communication
- **Queue timeline** - GPU command execution

### Design Principles

- CPU-side validation prevents undefined behavior - no raw GPU errors leak
- All resources zero-initialized (security guarantee)
- Contagious invalidity: objects created from invalid parents are themselves invalid
- Explicit resource ownership and lifecycle management

### Object Graph

```
navigator.gpu (GPU)
  └─ GPUAdapter (physical GPU)
       └─ GPUDevice (logical device, owns all resources)
            ├─ GPUQueue (single queue per device)
            ├─ GPUBuffer, GPUTexture, GPUSampler
            ├─ GPUShaderModule
            ├─ GPUBindGroupLayout, GPUPipelineLayout
            ├─ GPUBindGroup
            ├─ GPURenderPipeline, GPUComputePipeline
            ├─ GPUCommandEncoder → GPUCommandBuffer
            ├─ GPURenderBundleEncoder → GPURenderBundle
            └─ GPUQuerySet
```

---

## 2. Initialization

```js
const adapter = await navigator.gpu.requestAdapter({
  powerPreference: 'high-performance'  // 'low-power' | 'high-performance'
});

const device = await adapter.requestDevice({
  requiredFeatures: ['timestamp-query'],
  requiredLimits: { maxStorageBufferBindingSize: 256 * 1024 * 1024 }
});

device.lost.then(info => { /* info.reason: 'destroyed' | 'unknown' */ });
```

**GPUAdapter** exposes:
- `features: GPUSupportedFeatures` - set of optional feature strings
- `limits: GPUSupportedLimits` - numerical resource constraints
- `info: GPUAdapterInfo` - vendor, architecture, device, description (privacy-filtered)
- `isFallbackAdapter: boolean`

---

## 3. Buffers

```js
const buffer = device.createBuffer({
  size: 1024,                // bytes, must be multiple of 4
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  mappedAtCreation: false
});
```

### Usage Flags (bitwise OR)

| Flag | Value | Description |
|------|-------|-------------|
| `MAP_READ` | 0x0001 | Can be mapped for reading |
| `MAP_WRITE` | 0x0002 | Can be mapped for writing |
| `COPY_SRC` | 0x0004 | Source of copy operations |
| `COPY_DST` | 0x0008 | Destination of copy operations |
| `INDEX` | 0x0010 | Index buffer |
| `VERTEX` | 0x0020 | Vertex buffer |
| `UNIFORM` | 0x0040 | Uniform buffer binding |
| `STORAGE` | 0x0080 | Storage buffer binding |
| `INDIRECT` | 0x0100 | Indirect draw/dispatch arguments |
| `QUERY_RESOLVE` | 0x0200 | Destination of query resolve |

**Constraints**: `MAP_READ` only combinable with `COPY_DST`. `MAP_WRITE` only combinable with `COPY_SRC`.

### Buffer Mapping

```js
// Async map for CPU access
await buffer.mapAsync(GPUMapMode.READ, offset, size);
const data = new Float32Array(buffer.getMappedRange(offset, size));
buffer.unmap();

// Direct write (no mapping needed, requires COPY_DST)
device.queue.writeBuffer(buffer, byteOffset, typedArray);
```

### Destruction

```js
buffer.destroy();  // releases GPU memory, invalidates buffer
```

---

## 4. Textures

```js
const texture = device.createTexture({
  size: { width: 512, height: 512, depthOrArrayLayers: 1 },
  format: 'rgba8unorm',
  dimension: '2d',           // '1d' | '2d' | '3d'
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  mipLevelCount: 1,
  sampleCount: 1,            // 1 or 4 (MSAA)
  viewFormats: []             // additional formats for views
});
```

### Usage Flags

| Flag | Value | Description |
|------|-------|-------------|
| `COPY_SRC` | 0x01 | Source for copy operations |
| `COPY_DST` | 0x02 | Destination for copy operations |
| `TEXTURE_BINDING` | 0x04 | Sampleable in shaders |
| `STORAGE_BINDING` | 0x08 | Writable in compute shaders |
| `RENDER_ATTACHMENT` | 0x10 | Render target / resolve target |

### Texture Views

```js
const view = texture.createView({
  format: 'rgba8unorm',       // can reinterpret if listed in viewFormats
  dimension: '2d',            // override view dimension
  aspect: 'all',              // 'all' | 'depth-only' | 'stencil-only'
  baseMipLevel: 0,
  mipLevelCount: 1,
  baseArrayLayer: 0,
  arrayLayerCount: 1
});
```

**GPUTextureViewDimension**: `'1d'` | `'2d'` | `'2d-array'` | `'cube'` | `'cube-array'` | `'3d'`

### Texture Formats

#### Plain Color Formats

**8-bit per component:**
`r8unorm`, `r8snorm`, `r8uint`, `r8sint`
`rg8unorm`, `rg8snorm`, `rg8uint`, `rg8sint`
`rgba8unorm`, `rgba8unorm-srgb`, `rgba8snorm`, `rgba8uint`, `rgba8sint`
`bgra8unorm`, `bgra8unorm-srgb`

**16-bit per component:**
`r16uint`, `r16sint`, `r16float`
`rg16uint`, `rg16sint`, `rg16float`
`rgba16uint`, `rgba16sint`, `rgba16float`

**32-bit per component:**
`r32uint`, `r32sint`, `r32float`
`rg32uint`, `rg32sint`, `rg32float`
`rgba32uint`, `rgba32sint`, `rgba32float`

**Packed formats:**
`rgb10a2uint`, `rgb10a2unorm` - 10-bit RGB + 2-bit alpha
`rg11b10ufloat` - 11/11/10-bit unsigned float
`rgb9e5ufloat` - 9-bit mantissa + 5-bit shared exponent

#### Depth/Stencil Formats

| Format | Depth bits | Stencil bits | Notes |
|--------|-----------|--------------|-------|
| `depth16unorm` | 16 | - | |
| `depth24plus` | 24+ | - | opaque depth |
| `depth24plus-stencil8` | 24+ | 8 | opaque depth + stencil |
| `depth32float` | 32 (float) | - | |
| `depth32float-stencil8` | 32 (float) | 8 | requires feature |
| `stencil8` | - | 8 | |

#### Compressed Formats (optional features)

**BC** (require `texture-compression-bc`):
`bc1-rgba-unorm`, `bc1-rgba-unorm-srgb`, `bc2-rgba-unorm`, `bc2-rgba-unorm-srgb`,
`bc3-rgba-unorm`, `bc3-rgba-unorm-srgb`, `bc4-r-unorm`, `bc4-r-snorm`,
`bc5-rg-unorm`, `bc5-rg-snorm`, `bc6h-rgb-ufloat`, `bc6h-rgb-float`,
`bc7-rgba-unorm`, `bc7-rgba-unorm-srgb`

**ETC2** (require `texture-compression-etc2`):
`etc2-rgb8unorm`, `etc2-rgb8unorm-srgb`, `etc2-rgb8a1unorm`, `etc2-rgb8a1unorm-srgb`,
`etc2-rgba8unorm`, `etc2-rgba8unorm-srgb`, `eac-r11unorm`, `eac-r11snorm`,
`eac-rg11unorm`, `eac-rg11snorm`

**ASTC** (require `texture-compression-astc`):
`astc-4x4-unorm`, `astc-4x4-unorm-srgb`, `astc-5x4-unorm`, `astc-5x4-unorm-srgb`,
`astc-5x5-unorm`, `astc-5x5-unorm-srgb`, `astc-6x5-unorm`, `astc-6x5-unorm-srgb`,
`astc-6x6-unorm`, `astc-6x6-unorm-srgb`, `astc-8x5-unorm`, `astc-8x5-unorm-srgb`,
`astc-8x6-unorm`, `astc-8x6-unorm-srgb`, `astc-8x8-unorm`, `astc-8x8-unorm-srgb`,
`astc-10x5-unorm`, `astc-10x5-unorm-srgb`, `astc-10x6-unorm`, `astc-10x6-unorm-srgb`,
`astc-10x8-unorm`, `astc-10x8-unorm-srgb`, `astc-10x10-unorm`, `astc-10x10-unorm-srgb`,
`astc-12x10-unorm`, `astc-12x10-unorm-srgb`, `astc-12x12-unorm`, `astc-12x12-unorm-srgb`

### Writing Texture Data

```js
device.queue.writeTexture(
  { texture, mipLevel: 0, origin: [0, 0, 0], aspect: 'all' },
  data,                                          // ArrayBuffer or typed array
  { offset: 0, bytesPerRow: width * 4, rowsPerImage: height },
  { width, height, depthOrArrayLayers: 1 }
);

// From canvas, ImageBitmap, VideoFrame, OffscreenCanvas
device.queue.copyExternalImageToTexture(
  { source: imageBitmap, flipY: false },
  { texture, premultipliedAlpha: false, colorSpace: 'srgb' },
  { width, height }
);
```

---

## 5. Samplers

```js
const sampler = device.createSampler({
  addressModeU: 'repeat',    // 'clamp-to-edge' | 'repeat' | 'mirror-repeat'
  addressModeV: 'repeat',
  addressModeW: 'repeat',
  magFilter: 'linear',       // 'nearest' | 'linear'
  minFilter: 'linear',
  mipmapFilter: 'linear',    // 'nearest' | 'linear'
  lodMinClamp: 0,
  lodMaxClamp: 32,
  compare: undefined,        // GPUCompareFunction for depth comparison samplers
  maxAnisotropy: 1           // 1-16, requires linear filtering
});
```

---

## 6. External Textures

Import live video content for efficient single-frame sampling:

```js
const externalTexture = device.importExternalTexture({
  source: videoElement,       // HTMLVideoElement or VideoFrame
  colorSpace: 'srgb'         // 'srgb' | 'display-p3'
});
// Must be used within the same task (expires at end of microtask)
```

Bound as `texture_external` in WGSL, sampled with `textureSampleBaseClampToEdge`.

---

## 7. Shader Modules

```js
const shaderModule = device.createShaderModule({
  code: wgslSourceString,
  compilationHints: [{ entryPoint: 'main', layout: pipelineLayout }]  // optional
});

const info = await shaderModule.getCompilationInfo();
// info.messages[].{ message, type: 'error'|'warning'|'info', lineNum, linePos }
```

---

## 8. Resource Binding

### Bind Group Layout

Declares the expected shape of resources for a pipeline stage:

```js
const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,  // VERTEX=0x1, FRAGMENT=0x2, COMPUTE=0x4
      buffer: {
        type: 'uniform',          // 'uniform' | 'storage' | 'read-only-storage'
        hasDynamicOffset: false,
        minBindingSize: 0          // 0 = no minimum
      }
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      texture: {
        sampleType: 'float',      // 'float' | 'unfilterable-float' | 'depth' | 'sint' | 'uint'
        viewDimension: '2d',      // GPUTextureViewDimension
        multisampled: false
      }
    },
    {
      binding: 2,
      visibility: GPUShaderStage.FRAGMENT,
      sampler: {
        type: 'filtering'          // 'filtering' | 'non-filtering' | 'comparison'
      }
    },
    {
      binding: 3,
      visibility: GPUShaderStage.COMPUTE,
      storageTexture: {
        access: 'write-only',     // 'write-only' | 'read-only' | 'read-write'
        format: 'rgba8unorm',
        viewDimension: '2d'
      }
    },
    {
      binding: 4,
      visibility: GPUShaderStage.FRAGMENT,
      externalTexture: {}
    }
  ]
});
```

### Bind Group

Creates actual resource bindings matching a layout:

```js
const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    { binding: 0, resource: { buffer: uniformBuf, offset: 0, size: 64 } },
    { binding: 1, resource: textureView },
    { binding: 2, resource: sampler },
    { binding: 3, resource: storageTextureView },
    { binding: 4, resource: externalTexture }
  ]
});
```

### Pipeline Layout

```js
const pipelineLayout = device.createPipelineLayout({
  bindGroupLayouts: [bgl0, bgl1, bgl2, bgl3]   // max 4 groups (default limit)
});
```

**Auto layout**: Use `layout: 'auto'` in pipeline descriptor. Then retrieve with `pipeline.getBindGroupLayout(index)`. Cannot mix auto-layout bind group layouts across pipelines.

---

## 9. Render Pipelines

```js
const pipeline = device.createRenderPipeline({
  layout: pipelineLayout,    // GPUPipelineLayout or 'auto'

  vertex: {
    module: shaderModule,
    entryPoint: 'vs_main',   // optional if module has single vertex entry point
    constants: { },           // pipeline-overridable constants
    buffers: [                // vertex buffer layouts, up to maxVertexBuffers
      {
        arrayStride: 32,      // bytes per element
        stepMode: 'vertex',   // 'vertex' | 'instance'
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
          { shaderLocation: 2, offset: 24, format: 'float32x2' }
        ]
      }
    ]
  },

  primitive: {
    topology: 'triangle-list',   // 'point-list'|'line-list'|'line-strip'|'triangle-list'|'triangle-strip'
    stripIndexFormat: undefined,  // required for strip topologies: 'uint16'|'uint32'
    frontFace: 'ccw',            // 'ccw' | 'cw'
    cullMode: 'back',            // 'none' | 'front' | 'back'
    unclippedDepth: false        // requires 'depth-clip-control' feature
  },

  depthStencil: {                // omit if no depth/stencil attachment
    format: 'depth24plus',
    depthWriteEnabled: true,
    depthCompare: 'less',        // GPUCompareFunction
    stencilFront: {              // defaults: compare='always', all ops='keep'
      compare: 'always',
      failOp: 'keep',
      depthFailOp: 'keep',
      passOp: 'keep'
    },
    stencilBack: { /* same as stencilFront */ },
    stencilReadMask: 0xFFFFFFFF,
    stencilWriteMask: 0xFFFFFFFF,
    depthBias: 0,
    depthBiasSlopeScale: 0,
    depthBiasClamp: 0
  },

  multisample: {
    count: 1,                    // 1 or 4
    mask: 0xFFFFFFFF,
    alphaToCoverageEnabled: false
  },

  fragment: {
    module: shaderModule,
    entryPoint: 'fs_main',
    constants: { },
    targets: [                   // one per color attachment
      {
        format: 'bgra8unorm',
        blend: {                 // omit for no blending
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'zero', operation: 'add' }
        },
        writeMask: GPUColorWrite.ALL   // RED=0x1, GREEN=0x2, BLUE=0x4, ALPHA=0x8, ALL=0xF
      }
    ]
  }
});

// Async creation (avoids stalling on shader compilation)
const pipeline = await device.createRenderPipelineAsync(descriptor);
```

### Vertex Formats

| Format | Components | Byte size | WGSL type |
|--------|-----------|-----------|-----------|
| `uint8x2`, `uint8x4` | 2, 4 | 2, 4 | `vec2<u32>`, `vec4<u32>` |
| `sint8x2`, `sint8x4` | 2, 4 | 2, 4 | `vec2<i32>`, `vec4<i32>` |
| `unorm8x2`, `unorm8x4` | 2, 4 | 2, 4 | `vec2<f32>`, `vec4<f32>` |
| `snorm8x2`, `snorm8x4` | 2, 4 | 2, 4 | `vec2<f32>`, `vec4<f32>` |
| `uint16x2`, `uint16x4` | 2, 4 | 4, 8 | `vec2<u32>`, `vec4<u32>` |
| `sint16x2`, `sint16x4` | 2, 4 | 4, 8 | `vec2<i32>`, `vec4<i32>` |
| `unorm16x2`, `unorm16x4` | 2, 4 | 4, 8 | `vec2<f32>`, `vec4<f32>` |
| `snorm16x2`, `snorm16x4` | 2, 4 | 4, 8 | `vec2<f32>`, `vec4<f32>` |
| `float16x2`, `float16x4` | 2, 4 | 4, 8 | `vec2<f16>`, `vec4<f16>` |
| `float32`, `float32x2`, `float32x3`, `float32x4` | 1-4 | 4-16 | `f32`, `vec2f`-`vec4f` |
| `uint32`, `uint32x2`, `uint32x3`, `uint32x4` | 1-4 | 4-16 | `u32`, `vec2u`-`vec4u` |
| `sint32`, `sint32x2`, `sint32x3`, `sint32x4` | 1-4 | 4-16 | `i32`, `vec2i`-`vec4i` |
| `unorm10-10-10-2` | 4 | 4 | `vec4<f32>` |

### Blend Factors (`GPUBlendFactor`)

`zero`, `one`, `src`, `one-minus-src`, `src-alpha`, `one-minus-src-alpha`,
`dst`, `one-minus-dst`, `dst-alpha`, `one-minus-dst-alpha`,
`src-alpha-saturated`, `constant`, `one-minus-constant`

With `dual-source-blending` feature: `src1`, `one-minus-src1`, `src1-alpha`, `one-minus-src1-alpha`

### Blend Operations (`GPUBlendOperation`)

`add`, `subtract`, `reverse-subtract`, `min`, `max`

### Compare Functions (`GPUCompareFunction`)

`never`, `less`, `equal`, `less-equal`, `greater`, `not-equal`, `greater-equal`, `always`

### Stencil Operations (`GPUStencilOperation`)

`keep`, `zero`, `replace`, `invert`, `increment-clamp`, `decrement-clamp`, `increment-wrap`, `decrement-wrap`

---

## 10. Compute Pipelines

```js
const computePipeline = device.createComputePipeline({
  layout: pipelineLayout,   // or 'auto'
  compute: {
    module: shaderModule,
    entryPoint: 'main',
    constants: { blockSize: 16 }   // pipeline-overridable constants
  }
});

const computePipeline = await device.createComputePipelineAsync(descriptor);
```

---

## 11. Command Encoding

### Command Encoder

```js
const encoder = device.createCommandEncoder({ label: 'frame' });

// Copy operations
encoder.copyBufferToBuffer(src, srcOffset, dst, dstOffset, size);
encoder.copyBufferToTexture(
  { buffer, bytesPerRow, rowsPerImage, offset },
  { texture, mipLevel, origin, aspect },
  { width, height, depthOrArrayLayers }
);
encoder.copyTextureToBuffer(source, destination, copySize);
encoder.copyTextureToTexture(source, destination, copySize);

// Clear
encoder.clearBuffer(buffer, offset, size);

// Queries
encoder.resolveQuerySet(querySet, firstQuery, queryCount, destination, destinationOffset);

// Finish
const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);
```

### Render Pass

```js
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: textureView,           // render target
    resolveTarget: undefined,    // MSAA resolve target (sampleCount=1 texture)
    loadOp: 'clear',             // 'load' | 'clear'
    storeOp: 'store',            // 'store' | 'discard'
    clearValue: { r: 0, g: 0, b: 0, a: 1 }
  }],
  depthStencilAttachment: {
    view: depthView,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
    depthClearValue: 1.0,
    depthReadOnly: false,
    stencilLoadOp: 'clear',      // omit for depth-only formats
    stencilStoreOp: 'discard',
    stencilClearValue: 0,
    stencilReadOnly: false
  },
  occlusionQuerySet: undefined,
  timestampWrites: undefined
});

// State setup
pass.setPipeline(renderPipeline);
pass.setBindGroup(0, bindGroup);
pass.setBindGroup(1, dynamicBindGroup, [dynamicOffset1, dynamicOffset2]);  // dynamic offsets
pass.setVertexBuffer(0, vertexBuffer, offset, size);
pass.setIndexBuffer(indexBuffer, 'uint16', offset, size);  // 'uint16' | 'uint32'
pass.setViewport(x, y, width, height, minDepth, maxDepth);
pass.setScissorRect(x, y, width, height);
pass.setBlendConstant({ r, g, b, a });
pass.setStencilReference(value);

// Draw commands
pass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
pass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
pass.drawIndirect(indirectBuffer, indirectOffset);
pass.drawIndexedIndirect(indirectBuffer, indirectOffset);

// Render bundles
pass.executeBundles([bundle1, bundle2]);

// Occlusion queries
pass.beginOcclusionQuery(queryIndex);
pass.endOcclusionQuery();

pass.end();
```

**Indirect buffer layout** (draw):
| Offset | Field | Type |
|--------|-------|------|
| 0 | vertexCount | uint32 |
| 4 | instanceCount | uint32 |
| 8 | firstVertex | uint32 |
| 12 | firstInstance | uint32 |

**Indirect buffer layout** (drawIndexed):
| Offset | Field | Type |
|--------|-------|------|
| 0 | indexCount | uint32 |
| 4 | instanceCount | uint32 |
| 8 | firstIndex | uint32 |
| 12 | baseVertex | int32 |
| 16 | firstInstance | uint32 |

### Compute Pass

```js
const pass = encoder.beginComputePass({
  timestampWrites: undefined
});

pass.setPipeline(computePipeline);
pass.setBindGroup(0, bindGroup);
pass.dispatchWorkgroups(countX, countY, countZ);
pass.dispatchWorkgroupsIndirect(indirectBuffer, indirectOffset);

pass.end();
```

**Indirect dispatch buffer layout**: 3x uint32 (workgroupCountX, workgroupCountY, workgroupCountZ)

### Render Bundles

Pre-record reusable command sequences for repeated rendering:

```js
const bundleEncoder = device.createRenderBundleEncoder({
  colorFormats: ['bgra8unorm'],
  depthStencilFormat: 'depth24plus',
  sampleCount: 1,
  depthReadOnly: false,
  stencilReadOnly: false
});

// Supports: setPipeline, setBindGroup, setVertexBuffer, setIndexBuffer, draw*, setStencilReference, setBlendConstant
bundleEncoder.setPipeline(pipeline);
bundleEncoder.setVertexBuffer(0, vertexBuffer);
bundleEncoder.draw(3);

const bundle = bundleEncoder.finish();
// Use in render pass: pass.executeBundles([bundle]);
```

---

## 12. Queue Operations

```js
device.queue.submit([commandBuffer1, commandBuffer2]);

// Convenience writes (no command encoder needed)
device.queue.writeBuffer(buffer, bufferOffset, data, dataOffset, size);
device.queue.writeTexture(destination, data, dataLayout, size);
device.queue.copyExternalImageToTexture(source, destination, copySize);

// Fence: resolves when all submitted work completes
await device.queue.onSubmittedWorkDone();
```

---

## 13. Canvas Integration

```js
const context = canvas.getContext('webgpu');

context.configure({
  device,
  format: navigator.gpu.getPreferredCanvasFormat(),  // 'bgra8unorm' or 'rgba8unorm'
  usage: GPUTextureUsage.RENDER_ATTACHMENT,           // can add COPY_SRC, TEXTURE_BINDING etc
  alphaMode: 'opaque',       // 'opaque' | 'premultiplied'
  colorSpace: 'srgb',        // 'srgb' | 'display-p3'
  toneMapping: { mode: 'standard' },  // 'standard' | 'extended'
  viewFormats: []             // e.g. ['bgra8unorm-srgb'] for sRGB views
});

// Per-frame
const texture = context.getCurrentTexture();
const view = texture.createView();
// ... render to view ...

context.unconfigure();  // release resources
```

`getCurrentTexture()` returns a texture sized to the canvas. Same texture returned per animation frame. Expires when:
- The canvas is resized
- `configure()` / `unconfigure()` is called
- The document's animation frame runs (compositor presents it)

---

## 14. Queries

### Occlusion Queries

Count fragments passing depth/stencil tests (binary or precise):

```js
const querySet = device.createQuerySet({ type: 'occlusion', count: 4 });

// In render pass:
pass.beginOcclusionQuery(0);
pass.draw(/* ... */);
pass.endOcclusionQuery();

// Resolve to buffer (uint64 per query):
encoder.resolveQuerySet(querySet, 0, 4, resultBuffer, 0);
```

### Timestamp Queries

Requires `'timestamp-query'` feature. Values may be quantized for security.

```js
const querySet = device.createQuerySet({ type: 'timestamp', count: 2 });

// Via render/compute pass:
encoder.beginRenderPass({
  timestampWrites: {
    querySet,
    beginningOfPassWriteIndex: 0,
    endOfPassWriteIndex: 1
  },
  // ...
});

// Resolve to buffer (uint64 nanoseconds per query):
encoder.resolveQuerySet(querySet, 0, 2, resultBuffer, 0);
```

---

## 15. Error Handling

### Error Types

| Type | Meaning |
|------|---------|
| `GPUValidationError` | Invalid API usage (wrong params, state) |
| `GPUOutOfMemoryError` | Allocation failure |
| `GPUInternalError` | Implementation/driver issue |

### Error Scopes

Capture errors from a block of operations:

```js
device.pushErrorScope('validation');    // 'validation' | 'out-of-memory' | 'internal'
// ... operations ...
const error = await device.popErrorScope();  // null or GPUError
```

Scopes are a stack. Each error is captured by the innermost matching scope. Uncaptured errors fire `device.onuncapturederror`.

### Device Loss

```js
device.lost.then(info => {
  // info.reason: 'destroyed' | 'unknown'
  // info.message: string
  // Must create a new device to continue
});

device.destroy();  // triggers device loss with reason 'destroyed'
```

### Uncaptured Errors

```js
device.addEventListener('uncapturederror', event => {
  console.error(event.error);  // GPUError
});
```

---

## 16. Coordinate Systems

**Normalized Device Coordinates (NDC):**
- X: [-1, 1] (left to right)
- Y: [-1, 1] (bottom to top)
- Z: [0, 1] (near to far, left-handed depth)

**Framebuffer / Viewport Coordinates:**
- Origin: top-left (0, 0)
- X right, Y down
- Pixel centers at half-integers (x+0.5, y+0.5)

**Texture Coordinates:**
- Origin: top-left (0, 0) for 2D textures
- Range [0, 1] per dimension
- First texel in memory = (0, 0)

**UV → NDC note**: WebGPU's NDC Y-up vs framebuffer Y-down means the first row of a texture maps to the top of the screen when rendered to a full-screen quad with standard UV mapping.

---

## 17. Optional Features

Request via `requiredFeatures` when calling `requestDevice()`.

| Feature | Description |
|---------|-------------|
| `depth-clip-control` | Disable depth clipping (`unclippedDepth: true`) |
| `depth32float-stencil8` | `depth32float-stencil8` format |
| `texture-compression-bc` | BC compressed texture formats |
| `texture-compression-bc-sliced-3d` | BC formats for 3D textures |
| `texture-compression-etc2` | ETC2 compressed texture formats |
| `texture-compression-astc` | ASTC compressed texture formats |
| `texture-compression-astc-sliced-3d` | ASTC formats for 3D textures |
| `timestamp-query` | GPU timestamp queries |
| `indirect-first-instance` | `firstInstance` in indirect draws |
| `shader-f16` | 16-bit float in WGSL shaders |
| `float32-filterable` | Linear filtering for `r32float`, `rg32float`, `rgba32float` |
| `float32-blendable` | Blending for float32 render targets |
| `clip-distances` | `clip_distances` builtin in vertex shaders |
| `dual-source-blending` | Two blend sources from fragment shader |
| `subgroups` | Subgroup operations in shaders |
| `rg11b10ufloat-renderable` | `rg11b10ufloat` as render attachment |
| `bgra8unorm-storage` | `bgra8unorm` as storage texture |

---

## 18. Default Limits

| Limit | Default |
|-------|---------|
| `maxTextureDimension1D` | 8192 |
| `maxTextureDimension2D` | 8192 |
| `maxTextureDimension3D` | 2048 |
| `maxTextureArrayLayers` | 256 |
| `maxBindGroups` | 4 |
| `maxBindGroupsPlusVertexBuffers` | 24 |
| `maxBindingsPerBindGroup` | 1000 |
| `maxDynamicUniformBuffersPerPipelineLayout` | 8 |
| `maxDynamicStorageBuffersPerPipelineLayout` | 4 |
| `maxSampledTexturesPerShaderStage` | 16 |
| `maxSamplersPerShaderStage` | 16 |
| `maxStorageBuffersPerShaderStage` | 8 |
| `maxStorageTexturesPerShaderStage` | 4 |
| `maxUniformBuffersPerShaderStage` | 12 |
| `maxUniformBufferBindingSize` | 65536 (64 KiB) |
| `maxStorageBufferBindingSize` | 134217728 (128 MiB) |
| `minUniformBufferOffsetAlignment` | 256 |
| `minStorageBufferOffsetAlignment` | 256 |
| `maxVertexBuffers` | 8 |
| `maxBufferSize` | 268435456 (256 MiB) |
| `maxVertexAttributes` | 16 |
| `maxVertexBufferArrayStride` | 2048 |
| `maxInterStageShaderVariables` | 16 |
| `maxColorAttachments` | 8 |
| `maxColorAttachmentBytesPerSample` | 32 |
| `maxComputeWorkgroupStorageSize` | 16384 (16 KiB) |
| `maxComputeInvocationsPerWorkgroup` | 256 |
| `maxComputeWorkgroupSizeX` | 256 |
| `maxComputeWorkgroupSizeY` | 256 |
| `maxComputeWorkgroupSizeZ` | 64 |
| `maxComputeWorkgroupsPerDimension` | 65535 |

Alignment limits (`minUniformBufferOffsetAlignment`, `minStorageBufferOffsetAlignment`) are **maximum** defaults — adapters may support lower (better) alignment.

---

## 19. Key Validation Rules

1. **Device affinity** - all objects in an operation must belong to the same device
2. **Usage compatibility** - a texture used as both `TEXTURE_BINDING` and `STORAGE_BINDING` in the same pass must use different views of non-overlapping subresources
3. **Render attachment constraints** - all color and depth/stencil attachments must have matching dimensions and sample counts
4. **Bind group compatibility** - bind groups must match pipeline layout; buffer sizes must meet `minBindingSize`
5. **Buffer overlap** - vertex/index buffers may alias in a draw; writable storage buffers must not alias
6. **Encoding state** - passes must be ended before encoder is finished; only one pass open at a time
7. **Map state** - mapped buffers cannot be used in submit; must unmap before use on GPU
8. **Dynamic offsets** - must be aligned to `minUniformBufferOffsetAlignment` / `minStorageBufferOffsetAlignment`

---

## 20. Common Patterns

### Typical Render Loop

```js
function frame() {
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: 'clear',
      storeOp: 'store',
      clearValue: { r: 0, g: 0, b: 0, a: 1 }
    }],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      depthClearValue: 1.0
    }
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, sceneBindGroup);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.setIndexBuffer(indexBuffer, 'uint32');
  pass.drawIndexed(indexCount);
  pass.end();
  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(frame);
}
```

### MSAA (4x Multisampling)

```js
// Create multisample render target
const msaaTexture = device.createTexture({
  size: [width, height],
  format: canvasFormat,
  sampleCount: 4,
  usage: GPUTextureUsage.RENDER_ATTACHMENT
});

// Pipeline must match
const pipeline = device.createRenderPipeline({
  multisample: { count: 4 },
  // ...
});

// Render pass: render to MSAA, resolve to canvas
pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: msaaTexture.createView(),
    resolveTarget: context.getCurrentTexture().createView(),  // sampleCount=1
    loadOp: 'clear',
    storeOp: 'discard'     // discard MSAA, keep resolved
  }]
});
```

### Dynamic Uniform Buffers

```js
// Single buffer, multiple offsets
const dynamicBuffer = device.createBuffer({
  size: objectCount * 256,   // aligned to minUniformBufferOffsetAlignment
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});

const bgl = device.createBindGroupLayout({
  entries: [{
    binding: 0,
    visibility: GPUShaderStage.VERTEX,
    buffer: { type: 'uniform', hasDynamicOffset: true }
  }]
});

// In render loop:
for (let i = 0; i < objectCount; i++) {
  pass.setBindGroup(0, bindGroup, [i * 256]);  // dynamic offset
  pass.draw(vertexCount);
}
```
