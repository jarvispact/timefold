# WebGPU Specification Summary

Condensed reference for implementing WebGPU rendering on the web. Focuses on practical rendering usage, omitting native-only concerns and low-level driver details.

## Architecture

WebGPU operates across three timelines:
- **Content timeline**: JavaScript execution and API calls
- **Device timeline**: Resource creation and driver communication
- **Queue timeline**: GPU command execution (draw/compute)

Core design principles:
- CPU-based validation prevents undefined behavior
- All resources initialize to zero (security)
- Explicit resource ownership and lifecycle management
- Contagious invalidity: objects created from invalid parents are invalid

## Initialization

```javascript
// 1. Request adapter (represents physical GPU)
const adapter = await navigator.gpu.requestAdapter();

// 2. Request device (manages resources, owns queue)
const device = await adapter.requestDevice({
  requiredFeatures: [],  // optional GPU features
  requiredLimits: {}     // resource limits
});

// 3. Handle device loss
device.lost.then((info) => {
  console.log('Device lost:', info.reason, info.message);
});
```

**GPUAdapter** properties:
- `isFallbackAdapter`: boolean
- `features`: supported optional features
- `limits`: resource constraints (texture sizes, buffer sizes, etc.)
- `info`: vendor/device information (privacy-protected)

## Resources

### Buffers

Unified memory for vertex, index, uniform, and storage data.

```javascript
const buffer = device.createBuffer({
  size: 1024,              // bytes
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  mappedAtCreation: false  // optional: map immediately
});
```

**Usage flags** (bitwise OR):
- `INDEX` - index buffer
- `VERTEX` - vertex buffer
- `UNIFORM` - uniform buffer
- `STORAGE` - storage buffer (read/write in shaders)
- `INDIRECT` - indirect draw/dispatch arguments
- `COPY_SRC` - source for copy operations
- `COPY_DST` - destination for copy operations

**Buffer mapping** (CPU access):
```javascript
await buffer.mapAsync(GPUMapMode.READ);
const data = new Float32Array(buffer.getMappedRange());
// ... use data ...
buffer.unmap();
```

**Write without mapping**:
```javascript
device.queue.writeBuffer(buffer, 0, new Float32Array([1, 2, 3]));
```

### Textures

Multi-dimensional image data with typed formats.

```javascript
const texture = device.createTexture({
  size: { width: 512, height: 512, depthOrArrayLayers: 1 },
  format: 'rgba8unorm',
  dimension: '2d',  // '1d', '2d', '3d'
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  mipLevelCount: 1,
  sampleCount: 1
});
```

**Usage flags**:
- `TEXTURE_BINDING` - read in shaders
- `STORAGE_BINDING` - read/write in compute shaders
- `RENDER_ATTACHMENT` - render target
- `COPY_SRC` / `COPY_DST` - copy operations

**Texture views** (typed accessors):
```javascript
const view = texture.createView({
  format: 'rgba8unorm',        // optional: reinterpret format
  dimension: '2d',             // optional: view dimension
  baseMipLevel: 0,             // mipmap range
  mipLevelCount: 1,
  baseArrayLayer: 0,           // array layer range
  arrayLayerCount: 1
});
```

**Common texture formats**:
- **8-bit**: `r8unorm`, `rg8unorm`, `rgba8unorm`, `rgba8unorm-srgb`
- **16-bit float**: `r16float`, `rg16float`, `rgba16float`
- **32-bit float**: `r32float`, `rg32float`, `rgba32float`
- **32-bit int**: `r32sint`, `r32uint`
- **Packed**: `rgb10a2unorm`, `rg11b10ufloat`
- **Depth**: `depth32float`, `depth24plus`, `depth16unorm`
- **Depth-stencil**: `depth24plus-stencil8`
- **Compressed** (optional features): BC*, ETC2, ASTC formats

**Write texture data**:
```javascript
device.queue.writeTexture(
  { texture, mipLevel: 0, origin: [0, 0, 0] },
  imageData,
  { bytesPerRow: 512 * 4, rowsPerImage: 512 },
  { width: 512, height: 512 }
);
```

### Samplers

Texture filtering and addressing configuration.

```javascript
const sampler = device.createSampler({
  addressModeU: 'repeat',      // 'repeat', 'mirror-repeat', 'clamp-to-edge'
  addressModeV: 'repeat',
  addressModeW: 'repeat',
  magFilter: 'linear',         // 'nearest', 'linear'
  minFilter: 'linear',
  mipmapFilter: 'linear',
  lodMinClamp: 0,
  lodMaxClamp: 32,
  maxAnisotropy: 1
});
```

## Shaders

Shaders use WGSL (WebGPU Shading Language). See separate WGSL spec for language details.

```javascript
const shaderModule = device.createShaderModule({
  code: `
    @vertex
    fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
      return vec4f(0.0, 0.0, 0.0, 1.0);
    }

    @fragment
    fn fs_main() -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
  `
});

// Check compilation errors
const info = await shaderModule.getCompilationInfo();
```

**Note**: WGSL details (built-ins, types, storage classes) are in the separate WGSL specification.

## Resource Binding

Bind groups connect resources (buffers, textures, samplers) to shaders.

### Bind Group Layout

Describes expected resource structure:

```javascript
const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' }  // 'uniform', 'storage', 'read-only-storage'
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: 'float' }  // 'float', 'sint', 'uint', 'depth'
    },
    {
      binding: 2,
      visibility: GPUShaderStage.FRAGMENT,
      sampler: { type: 'filtering' }  // 'filtering', 'non-filtering', 'comparison'
    }
  ]
});
```

### Bind Group

Actual resource bindings:

```javascript
const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    { binding: 0, resource: { buffer: uniformBuffer } },
    { binding: 1, resource: textureView },
    { binding: 2, resource: sampler }
  ]
});
```

### Pipeline Layout

Organizes multiple bind groups:

```javascript
const pipelineLayout = device.createPipelineLayout({
  bindGroupLayouts: [bindGroupLayout0, bindGroupLayout1]
});
```

**Auto-layout alternative**: Use `layout: 'auto'` in pipeline descriptor, then introspect:
```javascript
const layout = pipeline.getBindGroupLayout(0);
```

## Render Pipelines

Graphics pipelines control the entire rendering process.

```javascript
const pipeline = device.createRenderPipeline({
  layout: pipelineLayout,  // or 'auto'

  vertex: {
    module: shaderModule,
    entryPoint: 'vs_main',
    buffers: [  // vertex buffer layouts
      {
        arrayStride: 20,  // bytes per vertex
        stepMode: 'vertex',  // 'vertex' or 'instance'
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },   // position
          { shaderLocation: 1, offset: 12, format: 'float32x2' }   // uv
        ]
      }
    ]
  },

  primitive: {
    topology: 'triangle-list',  // 'point-list', 'line-list', 'line-strip', 'triangle-strip'
    frontFace: 'ccw',           // 'ccw', 'cw'
    cullMode: 'back'            // 'none', 'front', 'back'
  },

  depthStencil: {
    format: 'depth24plus',
    depthWriteEnabled: true,
    depthCompare: 'less',  // 'never', 'less', 'equal', 'less-equal', 'greater', 'not-equal', 'greater-equal', 'always'

    stencilFront: {
      compare: 'always',
      failOp: 'keep',      // 'keep', 'zero', 'replace', 'invert', 'increment-clamp', 'decrement-clamp', 'increment-wrap', 'decrement-wrap'
      depthFailOp: 'keep',
      passOp: 'keep'
    },
    stencilBack: { /* ... */ }
  },

  multisample: {
    count: 1,  // 1 or 4 (MSAA samples)
    mask: 0xFFFFFFFF
  },

  fragment: {
    module: shaderModule,
    entryPoint: 'fs_main',
    targets: [
      {
        format: 'rgba8unorm',
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add'  // 'add', 'subtract', 'reverse-subtract', 'min', 'max'
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'zero',
            operation: 'add'
          }
        },
        writeMask: GPUColorWrite.ALL  // bitwise OR of RED, GREEN, BLUE, ALPHA
      }
    ]
  }
});
```

**Async pipeline creation** (for large shaders):
```javascript
const pipeline = await device.createRenderPipelineAsync(descriptor);
```

**Vertex attribute formats**:
- `float32`, `float32x2`, `float32x3`, `float32x4`
- `sint32`, `sint32x2`, `sint32x3`, `sint32x4`
- `uint32`, `uint32x2`, `uint32x3`, `uint32x4`
- `float16x2`, `float16x4` (requires feature)
- `unorm8x2`, `unorm8x4`, `snorm8x2`, `snorm8x4`
- `unorm16x2`, `unorm16x4`, `snorm16x2`, `snorm16x4`

## Compute Pipelines

```javascript
const computePipeline = device.createComputePipeline({
  layout: pipelineLayout,  // or 'auto'
  compute: {
    module: shaderModule,
    entryPoint: 'compute_main'
  }
});
```

## Command Encoding

Commands are recorded into command buffers via encoders.

```javascript
const encoder = device.createCommandEncoder();

// Copy operations
encoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, 256);
encoder.copyBufferToTexture(
  { buffer: srcBuffer, bytesPerRow: 512 * 4 },
  { texture: dstTexture },
  { width: 512, height: 512 }
);
encoder.copyTextureToTexture(src, dst, size);

// Clear buffer
encoder.clearBuffer(buffer, 0, 256);

// Finish encoding
const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);
```

## Render Passes

Render passes define rendering operations.

```javascript
const renderPass = encoder.beginRenderPass({
  colorAttachments: [
    {
      view: textureView,
      loadOp: 'clear',    // 'load' or 'clear'
      storeOp: 'store',   // 'store' or 'discard'
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }
    }
  ],
  depthStencilAttachment: {
    view: depthTextureView,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
    depthClearValue: 1.0,
    stencilLoadOp: 'clear',
    stencilStoreOp: 'discard',
    stencilClearValue: 0
  },
  timestampWrites: undefined,  // optional query set
  occlusionQuerySet: undefined  // optional query set
});

// Set pipeline and resources
renderPass.setPipeline(pipeline);
renderPass.setBindGroup(0, bindGroup0);
renderPass.setBindGroup(1, bindGroup1, [0, 16]);  // optional dynamic offsets

// Set vertex/index buffers
renderPass.setVertexBuffer(0, vertexBuffer);
renderPass.setIndexBuffer(indexBuffer, 'uint16');  // 'uint16' or 'uint32'

// Viewport and scissor
renderPass.setViewport(0, 0, 800, 600, 0, 1);
renderPass.setScissorRect(0, 0, 800, 600);

// Blend and stencil state
renderPass.setBlendConstant([1, 1, 1, 1]);
renderPass.setStencilReference(0);

// Draw commands
renderPass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
renderPass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
renderPass.drawIndirect(indirectBuffer, offset);
renderPass.drawIndexedIndirect(indirectBuffer, offset);

// Execute reusable render bundles
renderPass.executeBundles([renderBundle1, renderBundle2]);

// End pass
renderPass.end();
```

## Compute Passes

```javascript
const computePass = encoder.beginComputePass();

computePass.setPipeline(computePipeline);
computePass.setBindGroup(0, bindGroup);

// Dispatch workgroups
computePass.dispatchWorkgroups(8, 8, 1);
computePass.dispatchWorkgroupsIndirect(indirectBuffer, offset);

computePass.end();
```

## Render Bundles

Reusable command bundles for repeated render operations.

```javascript
const bundleEncoder = device.createRenderBundleEncoder({
  colorFormats: ['rgba8unorm'],
  depthStencilFormat: 'depth24plus',
  sampleCount: 1
});

// Record commands (same as render pass, but limited subset)
bundleEncoder.setPipeline(pipeline);
bundleEncoder.setBindGroup(0, bindGroup);
bundleEncoder.setVertexBuffer(0, vertexBuffer);
bundleEncoder.draw(3);

const renderBundle = bundleEncoder.finish();

// Execute in render pass
renderPass.executeBundles([renderBundle]);
```

## Canvas Integration

Get WebGPU context and configure for rendering.

```javascript
const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');

context.configure({
  device: device,
  format: navigator.gpu.getPreferredCanvasFormat(),  // usually 'bgra8unorm'
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
  alphaMode: 'opaque',  // 'opaque' or 'premultiplied'
  colorSpace: 'srgb',   // 'srgb' or 'display-p3'
  viewFormats: []       // additional view formats
});

// Render loop
function frame() {
  const texture = context.getCurrentTexture();
  const view = texture.createView();

  // ... render to view ...

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

**Canvas format**: Use `navigator.gpu.getPreferredCanvasFormat()` for optimal performance (typically `bgra8unorm` or `rgba8unorm`).

## Queue Operations

Submit command buffers and write data directly.

```javascript
// Submit commands
device.queue.submit([commandBuffer1, commandBuffer2]);

// Write data without staging
device.queue.writeBuffer(buffer, offset, data);
device.queue.writeTexture(destination, data, dataLayout, size);

// Copy external images (canvas, ImageBitmap, video)
device.queue.copyExternalImageToTexture(
  { source: imageBitmap },
  { texture: texture },
  { width: 512, height: 512 }
);

// Wait for GPU work completion
await device.queue.onSubmittedWorkDone();
```

## Coordinate Systems

**Normalized Device Coordinates (NDC)**:
- X/Y range: `[-1, 1]`
- Z range (depth): `[0, 1]`
- Origin: bottom-left `(-1, -1)` in XY plane
- Z increases into screen (0 = near, 1 = far)

**Framebuffer Coordinates** (viewport, scissor):
- Origin: top-left `(0, 0)`
- X increases right, Y increases down
- Pixel centers at `(x + 0.5, y + 0.5)`

**Texture Coordinates**:
- Range `[0, 1]` per dimension
- `(0, 0, 0)` = first texel in memory order
- Origin depends on texture operation context

## Error Handling

Three error types:
- `GPUValidationError` - invalid API usage
- `GPUOutOfMemoryError` - allocation failed
- `GPUInternalError` - implementation issue

**Error scopes** for targeted error capture:

```javascript
device.pushErrorScope('validation');
// ... operations that might fail ...
const error = await device.popErrorScope();
if (error) {
  console.error('Validation error:', error.message);
}
```

**Device loss**:
```javascript
device.lost.then((info) => {
  // Reason: 'destroyed' or 'unknown'
  console.log(info.reason, info.message);
  // Must create new device to continue
});
```

**Explicit cleanup**:
```javascript
device.destroy();  // invalidate device and resources
buffer.destroy();  // release GPU memory
texture.destroy();
```

## Queries

**Occlusion queries** (fragment counts):
```javascript
const querySet = device.createQuerySet({
  type: 'occlusion',
  count: 2
});

renderPass.beginOcclusionQuery(0);
// ... draw calls ...
renderPass.endOcclusionQuery();

// Resolve to buffer
encoder.resolveQuerySet(querySet, 0, 2, resultBuffer, 0);
```

**Timestamp queries** (requires `timestamp-query` feature):
```javascript
const querySet = device.createQuerySet({
  type: 'timestamp',
  count: 2
});

encoder.writeTimestamp(querySet, 0);
// ... GPU work ...
encoder.writeTimestamp(querySet, 1);
```

## Optional Features

Common optional features (check `adapter.features`):
- `texture-compression-bc` / `etc2` / `astc`
- `timestamp-query`
- `depth-clip-control`
- `depth32float-stencil8`
- `indirect-first-instance`
- `shader-f16`
- `float32-filterable` / `float32-blendable`
- `dual-source-blending`
- `subgroups`

Request features when creating device:
```javascript
const device = await adapter.requestDevice({
  requiredFeatures: ['timestamp-query', 'texture-compression-bc']
});
```

## Limits

Key limits (check `adapter.limits` and set `requiredLimits` if needed):
- `maxTextureDimension1D` / `2D` / `3D`
- `maxTextureArrayLayers`
- `maxBindGroups` (default: 4)
- `maxDynamicUniformBuffersPerPipelineLayout`
- `maxDynamicStorageBuffersPerPipelineLayout`
- `maxStorageBufferBindingSize`
- `maxUniformBufferBindingSize`
- `maxVertexBuffers`
- `maxVertexAttributes`
- `maxComputeWorkgroupSizeX` / `Y` / `Z`
- `maxComputeInvocationsPerWorkgroup`

## Performance Tips

**Zero-allocation rendering**:
- Reuse command encoders by calling `finish()` and creating new ones
- Reuse bind groups across frames
- Use render bundles for repeated draw sequences
- Prefer `writeBuffer`/`writeTexture` over map/unmap

**Resource management**:
- Call `destroy()` on unused resources to free GPU memory
- Use appropriate buffer/texture usage flags (avoid over-specification)
- Batch draw calls when possible

**Pipeline efficiency**:
- Minimize pipeline switches
- Group draw calls by pipeline
- Use auto-layout (`layout: 'auto'`) for simpler pipelines
- Create pipelines async during load time

**Shader optimization**:
- Minimize texture samples and memory accesses
- Use appropriate precision (f16 where supported)
- Leverage hardware features (depth testing, early-z)

## Reference

Full specification: https://www.w3.org/TR/webgpu/
WGSL specification: https://www.w3.org/TR/WGSL/ (separate document)
