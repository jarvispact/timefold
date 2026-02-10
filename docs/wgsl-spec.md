# WGSL Specification (Condensed)

Quick reference for WebGPU Shading Language. Full spec: https://www.w3.org/TR/WGSL/

## Language Basics

WGSL is a statically-typed, imperative shading language for WebGPU.

**Key characteristics:**
- No implicit type conversions between concrete types
- Structured control flow (`if`, `switch`, `loop`, `while`, `for`)
- Single-module programs (all code in one file or imported)
- Const expressions evaluated at shader creation time

**Syntax:**
```wgsl
// Comments
/* Block comments */

// Variables
var<private> x: f32 = 1.0;
let y = 2.0;  // Immutable, type inferred
const Z = 3.0;  // Compile-time constant

// Functions
fn compute(a: f32) -> f32 {
  return a * 2.0;
}
```

## Types

### Scalars
- `bool` - boolean
- `i32`, `u32` - signed/unsigned 32-bit integers
- `f32` - 32-bit float
- `f16` - 16-bit float (requires extension)

### Vectors
- `vec2<T>`, `vec3<T>`, `vec4<T>` where `T` is `f32`, `i32`, `u32`, `bool`, or `f16`
- Component access: `.x`, `.y`, `.z`, `.w` or `.r`, `.g`, `.b`, `.a`
- Swizzling: `v.xyz`, `v.xxyy`, etc.

### Matrices
- `mat2x2<f32>`, `mat2x3<f32>`, `mat2x4<f32>`
- `mat3x2<f32>`, `mat3x3<f32>`, `mat3x4<f32>`
- `mat4x2<f32>`, `mat4x3<f32>`, `mat4x4<f32>`
- Column-major layout (column vectors)
- Access: `m[col][row]`

### Arrays
```wgsl
array<f32, 4>           // Fixed-size array
array<vec4<f32>>        // Runtime-sized (storage only)
```

### Structs
```wgsl
struct MyStruct {
  position: vec3<f32>,
  color: vec4<f32>,
}
```

### Special Types
- `atomic<i32>`, `atomic<u32>` - atomic operations
- `texture_*` - texture types (see Textures section)
- `sampler`, `sampler_comparison` - sampler types

## Uniform Buffer Alignment and Padding

**Critical for WebGPU buffers!** Incorrect alignment causes rendering bugs or validation errors.

### Alignment Rules

Every type has an **alignment** (boundary it must start on) and **size** (bytes it occupies).

| Type | Alignment | Size | Notes |
|------|-----------|------|-------|
| `bool`, `i32`, `u32`, `f32` | 4 bytes | 4 bytes | |
| `f16` | 2 bytes | 2 bytes | Requires extension |
| `vec2<f32>` | 8 bytes | 8 bytes | 2 × 4 bytes |
| `vec3<f32>` | **16 bytes** | **12 bytes** | ⚠️ Special case! |
| `vec4<f32>` | 16 bytes | 16 bytes | |
| `vec2<i32>` | 8 bytes | 8 bytes | |
| `vec3<i32>` | **16 bytes** | **12 bytes** | ⚠️ Special case! |
| `vec4<i32>` | 16 bytes | 16 bytes | |
| `mat2x2<f32>` | 8 bytes | 16 bytes | Array of 2 vec2 |
| `mat3x3<f32>` | 16 bytes | 48 bytes | Array of 3 vec3 (each 16-aligned) |
| `mat4x4<f32>` | 16 bytes | 64 bytes | Array of 4 vec4 |

**Key insights:**
- `vec3<T>` has 16-byte alignment but only 12-byte size (4 bytes padding)
- Matrices are arrays of column vectors
- Each matrix column follows vector alignment rules

### Struct Layout Rules

1. **First member** starts at offset 0
2. **Each member** must start at a multiple of its alignment
3. **Padding** inserted automatically between members
4. **Total size** rounds up to multiple of largest member alignment

**Example 1: Simple struct**
```wgsl
struct Example1 {
  a: f32,        // offset 0, align 4, size 4
  b: f32,        // offset 4, align 4, size 4
  c: vec2<f32>,  // offset 8, align 8, size 8
}
// Total: 16 bytes (no padding needed)
```

**Example 2: Vec3 padding**
```wgsl
struct Example2 {
  a: f32,        // offset 0, align 4, size 4
                 // 12 bytes padding!
  b: vec3<f32>,  // offset 16, align 16, size 12
  c: f32,        // offset 28, align 4, size 4
}
// Total: 32 bytes (rounds to multiple of 16)
```

**Example 3: Matrix alignment**
```wgsl
struct Example3 {
  modelMatrix: mat4x4<f32>,  // offset 0, align 16, size 64
  color: vec4<f32>,          // offset 64, align 16, size 16
}
// Total: 80 bytes
```

### Array Layout

Arrays have element stride aligned to element type:

```wgsl
array<f32, 4>        // stride 4, total 16 bytes
array<vec2<f32>, 4>  // stride 8, total 32 bytes
array<vec3<f32>, 4>  // stride 16 (!), total 64 bytes
array<vec4<f32>, 4>  // stride 16, total 64 bytes
```

**⚠️ Vec3 arrays:** Each element uses 16 bytes (12 data + 4 padding).

### Practical Tips

**Anti-pattern (wastes space):**
```wgsl
struct Bad {
  x: f32,        // offset 0
                 // 12 bytes wasted
  v: vec3<f32>,  // offset 16
}
```

**Better (reorder members):**
```wgsl
struct Good {
  v: vec3<f32>,  // offset 0
  x: f32,        // offset 12
}
// Total: 16 bytes (saves 12 bytes)
```

**Avoid vec3 when possible:**
```wgsl
// Instead of:
position: vec3<f32>,  // 16 bytes (4 wasted)

// Use:
position: vec4<f32>,  // 16 bytes (w = 1.0 for positions, 0.0 for directions)
```

**Use `@size` and `@align` for manual control:**
```wgsl
struct Custom {
  @align(16) a: f32,  // Force 16-byte alignment
  @size(16) b: f32,   // Force 16-byte size (12 bytes padding)
}
```

### Verification

Use browser DevTools or validation layers to check buffer layouts. Common issues:
- Forgetting vec3 alignment
- Wrong matrix column stride
- Mismatched CPU/GPU struct layouts

## Address Spaces

Memory is organized into distinct address spaces:

| Space | Access | Scope | Usage |
|-------|--------|-------|-------|
| `function` | read/write | Function | Local variables (default for `var` in functions) |
| `private` | read/write | Invocation | Per-invocation persistent data |
| `workgroup` | read/write | Workgroup | Shared compute memory (requires synchronization) |
| `uniform` | read-only | Module | Constant buffers (UBO) |
| `storage` | read/write | Module | Storage buffers (SSBO) |

**Syntax:**
```wgsl
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

var<workgroup> shared_data: array<f32, 256>;
var<private> counter: u32;
```

## Shader Stages

### Vertex Shader
```wgsl
@vertex
fn vs_main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @builtin(vertex_index) vertexIdx: u32,
  @builtin(instance_index) instanceIdx: u32,
) -> VertexOutput {
  var out: VertexOutput;
  out.position = vec4<f32>(position, 1.0);  // @builtin(position) required
  return out;
}
```

**Built-ins:**
- `@builtin(vertex_index)` - vertex index
- `@builtin(instance_index)` - instance index
- `@builtin(position)` - output clip-space position (required)

### Fragment Shader
```wgsl
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) @interpolate(linear, center) uv: vec2<f32>,
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return in.color;
}
```

**Built-ins:**
- `@builtin(position)` - fragment coordinates
- `@builtin(front_facing)` - bool, true if front-facing
- `@builtin(sample_index)` - MSAA sample index
- `@builtin(sample_mask)` - coverage mask

**Interpolation:**
- `@interpolate(perspective, center)` - default
- `@interpolate(linear, center)` - linear interpolation
- `@interpolate(flat)` - no interpolation

### Compute Shader
```wgsl
@compute @workgroup_size(8, 8, 1)
fn cs_main(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
  // Compute work
}
```

**Built-ins:**
- `@builtin(global_invocation_id)` - global thread ID
- `@builtin(local_invocation_id)` - thread ID within workgroup
- `@builtin(workgroup_id)` - workgroup ID
- `@builtin(num_workgroups)` - total workgroups dispatched

## Textures and Samplers

### Texture Types
```wgsl
// Sampled textures
texture_1d<f32>
texture_2d<f32>          // Most common
texture_2d_array<f32>
texture_3d<f32>
texture_cube<f32>
texture_cube_array<f32>
texture_multisampled_2d<f32>

// Depth textures
texture_depth_2d
texture_depth_cube
texture_depth_2d_array
texture_depth_cube_array
texture_depth_multisampled_2d

// Storage textures (compute)
texture_storage_2d<rgba8unorm, write>
texture_storage_3d<r32float, read_write>

// External (video/canvas)
texture_external
```

### Sampler Types
```wgsl
sampler               // Regular filtering
sampler_comparison    // Depth comparison
```

### Texture Sampling
```wgsl
@group(0) @binding(0) var myTexture: texture_2d<f32>;
@group(0) @binding(1) var mySampler: sampler;

fn example(uv: vec2<f32>) -> vec4<f32> {
  // Basic sampling
  let color = textureSample(myTexture, mySampler, uv);

  // With LOD
  let color2 = textureSampleLevel(myTexture, mySampler, uv, 0.0);

  // With bias (fragment only)
  let color3 = textureSampleBias(myTexture, mySampler, uv, 1.0);

  // Manual gradients
  let color4 = textureSampleGrad(myTexture, mySampler, uv, dpdx(uv), dpdy(uv));

  // Load without sampling (integer coords)
  let texel = textureLoad(myTexture, vec2<i32>(10, 20), 0);

  return color;
}
```

### Storage Textures
```wgsl
@group(0) @binding(0) var output: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
  textureStore(output, id.xy, vec4<f32>(1.0, 0.0, 0.0, 1.0));
}
```

## Built-in Functions (Common Subset)

### Math
```wgsl
// Trigonometry
sin, cos, tan, asin, acos, atan, atan2

// Exponential
exp, exp2, log, log2, pow, sqrt, inverseSqrt

// Common
abs, sign, floor, ceil, round, trunc, fract
min, max, clamp, saturate, mix, step, smoothstep

// Vector
dot, cross, length, distance, normalize, faceforward, reflect, refract
```

### Type Conversion
```wgsl
f32(x)        // Convert to f32
i32(x)        // Convert to i32
u32(x)        // Convert to u32
vec3<f32>(v)  // Convert vector
bitcast<u32>(f)  // Reinterpret bits
```

### Derivatives (Fragment only)
```wgsl
dpdx(x), dpdy(x), fwidth(x)
dpdxCoarse(x), dpdxFine(x)
dpdyCoarse(x), dpdyFine(x)
```

### Atomics (Storage/Workgroup)
```wgsl
atomicLoad, atomicStore
atomicAdd, atomicSub, atomicMin, atomicMax
atomicAnd, atomicOr, atomicXor
atomicExchange, atomicCompareExchangeWeak
```

### Synchronization (Compute only)
```wgsl
workgroupBarrier()   // Sync all threads in workgroup
storageBarrier()     // Memory fence for storage
```

## Attributes

### Entry Points
- `@vertex` - vertex shader
- `@fragment` - fragment shader
- `@compute @workgroup_size(x, y, z)` - compute shader

### Bindings
- `@group(n) @binding(m)` - resource binding point
- `@location(n)` - vertex attribute or fragment output location

### Built-ins
- `@builtin(name)` - built-in input/output values

### Interpolation
- `@interpolate(type, sampling)` - fragment input interpolation
  - Types: `perspective`, `linear`, `flat`
  - Sampling: `center`, `centroid`, `sample`

### Layout Control
- `@align(bytes)` - override alignment
- `@size(bytes)` - override size

### Other
- `@invariant` - guarantee deterministic position output
- `@id(n)` - pipeline-overridable constant ID

## Control Flow

```wgsl
// If-else
if (condition) {
  // ...
} else if (other) {
  // ...
} else {
  // ...
}

// Switch
switch (value) {
  case 0: { /* ... */ }
  case 1, 2: { /* ... */ }  // Multiple cases
  default: { /* ... */ }
}

// For loop
for (var i = 0; i < 10; i++) {
  // ...
}

// While loop
while (condition) {
  // ...
}

// Loop (infinite with break)
loop {
  if (done) { break; }
  // ...
  continuing {
    // Runs at end of each iteration
  }
}
```

## Common Patterns

### Uniform Buffer Setup
```wgsl
struct Uniforms {
  viewProjection: mat4x4<f32>,  // 64 bytes
  modelMatrix: mat4x4<f32>,     // 64 bytes
  cameraPos: vec3<f32>,         // 12 bytes
  time: f32,                    // 4 bytes
  // Total: 144 bytes
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
```

### Vertex Output / Fragment Input
```wgsl
struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPosition: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>,
}
```

### Simple Vertex Transform
```wgsl
@vertex
fn vs_main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
  return uniforms.viewProjection * vec4<f32>(position, 1.0);
}
```

### Textured Fragment
```wgsl
@group(1) @binding(0) var albedoTexture: texture_2d<f32>;
@group(1) @binding(1) var texSampler: sampler;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(albedoTexture, texSampler, uv);
}
```

## Performance Considerations

- **Use vec4 instead of vec3** for uniform buffers (same size, no padding issues)
- **Order struct members** by descending alignment to minimize padding
- **Prefer storage buffers** over uniform buffers for large/dynamic data
- **Workgroup size** should be multiple of 32/64 for GPU occupancy
- **Avoid divergent branching** in fragment shaders when possible
- **Use `workgroupBarrier()`** carefully - it's expensive

## Common Gotchas

1. **Vec3 alignment:** Always 16 bytes, not 12
2. **Matrix layout:** Column-major, not row-major
3. **No implicit conversions:** Must explicitly cast between types
4. **Array stride:** Vec3 arrays use 16-byte stride
5. **Derivative functions:** Only work in fragment shaders
6. **Atomics:** Only on `i32`/`u32` in storage/workgroup memory
7. **Runtime-sized arrays:** Must be last member of struct, storage only
8. **Texture formats:** Must match between shader and pipeline

## References

- Full specification: https://www.w3.org/TR/WGSL/
- WebGPU spec: https://www.w3.org/TR/webgpu/
- WGSL playground: https://webgpufundamentals.org/webgpu/lessons/webgpu-wgsl.html
