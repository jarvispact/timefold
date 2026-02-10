# WGSL Specification (Condensed)

Quick reference for WebGPU Shading Language targeting web rendering. Full spec: https://www.w3.org/TR/WGSL/

---

## Language Overview

WGSL is a statically-typed, imperative shading language. No implicit conversions between concrete types. All code lives in a single module.

```wgsl
// Line comment
/* Block comment */

const PI = 3.14159;                     // Compile-time constant
override WORKGROUP_SIZE: u32 = 64;      // Pipeline-overridable constant (@id(n) optional)
let x = 2.0;                            // Immutable binding (function scope only)
var<private> counter: u32 = 0;          // Mutable variable with address space
```

---

## Types

### Scalars

| Type | Description |
|------|-------------|
| `bool` | Boolean |
| `i32` | Signed 32-bit integer |
| `u32` | Unsigned 32-bit integer |
| `f32` | 32-bit float |
| `f16` | 16-bit float (requires `f16` extension) |

Abstract types `AbstractInt` and `AbstractFloat` exist only at compile time. Untyped integer literals produce `AbstractInt`, float literals produce `AbstractFloat`. They auto-convert to concrete types from context.

### Vectors

`vec2<T>`, `vec3<T>`, `vec4<T>` where T is any scalar type.

- Access: `.x/.y/.z/.w` or `.r/.g/.b/.a`
- Swizzling: `v.xyz`, `v.xxyy`, `v.zyx` (produces new vector)
- Construction: `vec3<f32>(1.0, 2.0, 3.0)`, `vec4<f32>(v3, 1.0)`, `vec3(1.0)` (splat)

### Matrices

`matCxR<f32>` or `matCxR<f16>` - C columns, R rows. Column-major storage.

Available: `mat2x2`, `mat2x3`, `mat2x4`, `mat3x2`, `mat3x3`, `mat3x4`, `mat4x2`, `mat4x3`, `mat4x4`.

- Access column: `m[col]` returns `vecR`
- Access element: `m[col][row]`
- A `matCxR` is stored as `array<vecR, C>` (array of column vectors)

### Arrays

```wgsl
array<f32, 4>        // Fixed-size
array<vec4<f32>>     // Runtime-sized (storage buffer last member only)
```

`arrayLength(&buffer.arr)` returns runtime-sized array length.

### Structs

```wgsl
struct Light {
  position: vec3<f32>,
  radius: f32,
  color: vec4<f32>,
}
```

No recursive types. All members must be constructible for the struct to be constructible.

### Atomic Types

`atomic<i32>`, `atomic<u32>` - only in `storage` (read_write) or `workgroup` address spaces.

### Texture Types

```
texture_2d<f32>               texture_depth_2d
texture_2d_array<f32>         texture_depth_2d_array
texture_3d<f32>               texture_depth_cube
texture_cube<f32>             texture_depth_cube_array
texture_cube_array<f32>       texture_depth_multisampled_2d
texture_multisampled_2d<f32>  texture_external
texture_storage_2d<FORMAT, ACCESS>
```

Sampled texture component type: `f32`, `i32`, or `u32`. Storage texture format examples: `rgba8unorm`, `rgba16float`, `r32float`, `rg32float`, `rgba32float`.

### Sampler Types

`sampler` - filtering sampler. `sampler_comparison` - depth comparison.

---

## Address Spaces

| Space | Access | Scope | Use |
|-------|--------|-------|-----|
| `function` | read_write | Function call | Local `var` (default) |
| `private` | read_write | Invocation | Per-invocation state |
| `workgroup` | read_write | Workgroup | Shared compute memory |
| `uniform` | read | Pipeline | Constant buffers (UBO) |
| `storage` | read or read_write | Pipeline | Storage buffers (SSBO) |

```wgsl
@group(0) @binding(0) var<uniform> ubo: Uniforms;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;
var<workgroup> shared: array<f32, 256>;
var<private> scratch: u32;
```

`bool` is **not host-shareable** - cannot appear in uniform/storage buffers. Use `u32` instead.

---

## Uniform Buffer Alignment and Padding

### Core Layout Functions

Every type has three layout properties:

- **AlignOf(T)**: byte boundary the type must start on
- **SizeOf(T)**: bytes the type occupies
- **StrideOf(T)**: byte stride in arrays = `roundUp(AlignOf(T), SizeOf(T))`

Where `roundUp(k, n) = ceil(n / k) * k`.

### Alignment Table

| Type | AlignOf | SizeOf | StrideOf | Notes |
|------|---------|--------|----------|-------|
| `i32`, `u32`, `f32` | 4 | 4 | 4 | |
| `f16` | 2 | 2 | 2 | |
| `vec2<f32>` | 8 | 8 | 8 | |
| `vec2<f16>` | 4 | 4 | 4 | |
| `vec3<f32>` | **16** | 12 | **16** | Alignment > size! |
| `vec3<f16>` | **8** | 6 | **8** | Alignment > size! |
| `vec4<f32>` | 16 | 16 | 16 | |
| `vec4<f16>` | 8 | 8 | 8 | |
| `vec2<i32>` | 8 | 8 | 8 | |
| `vec3<i32>` | **16** | 12 | **16** | Same as vec3\<f32\> |
| `vec4<i32>` | 16 | 16 | 16 | |

**Vector alignment formula:**
- `vec2<T>`: AlignOf = 2 * AlignOf(T), SizeOf = 2 * SizeOf(T)
- `vec3<T>`: AlignOf = **4** * AlignOf(T), SizeOf = 3 * SizeOf(T)
- `vec4<T>`: AlignOf = 4 * AlignOf(T), SizeOf = 4 * SizeOf(T)

### Matrix Alignment

A `matCxR<T>` is laid out as C column vectors of type `vecR<T>`, each at `StrideOf(vecR<T>)` intervals.

| Type | AlignOf | SizeOf | Derivation |
|------|---------|--------|------------|
| `mat2x2<f32>` | 8 | 16 | 2 * StrideOf(vec2\<f32\>) = 2 * 8 |
| `mat3x2<f32>` | 8 | 24 | 3 * 8 |
| `mat4x2<f32>` | 8 | 32 | 4 * 8 |
| `mat2x3<f32>` | 16 | 32 | 2 * StrideOf(vec3\<f32\>) = 2 * 16 |
| `mat3x3<f32>` | 16 | 48 | 3 * 16 |
| `mat4x3<f32>` | 16 | 64 | 4 * 16 |
| `mat2x4<f32>` | 16 | 32 | 2 * StrideOf(vec4\<f32\>) = 2 * 16 |
| `mat3x4<f32>` | 16 | 48 | 3 * 16 |
| `mat4x4<f32>` | 16 | 64 | 4 * 16 |

### Array Alignment

`array<T, N>`: AlignOf = AlignOf(T), SizeOf = N * StrideOf(T).

```
array<f32, 4>        → stride 4,  total 16 bytes
array<vec2<f32>, 4>  → stride 8,  total 32 bytes
array<vec3<f32>, 4>  → stride 16, total 64 bytes  (4 bytes padding per element!)
array<vec4<f32>, 4>  → stride 16, total 64 bytes
```

### Struct Layout Rules

1. First member offset = 0
2. Each subsequent member offset = smallest multiple of its AlignOf that is >= (previous member offset + previous member SizeOf)
3. Struct AlignOf = max AlignOf of all members
4. Struct SizeOf = roundUp(struct AlignOf, last member offset + last member SizeOf)

**Worked example:**
```wgsl
struct Example {
  a: f32,          // offset  0  (align 4,  size 4)
                   // 12 bytes padding to reach alignment of 16
  b: vec3<f32>,    // offset 16  (align 16, size 12)
  c: f32,          // offset 28  (align 4,  size 4)
}
// struct AlignOf = 16, struct SizeOf = roundUp(16, 32) = 32
```

**Matching JS side:**
```js
// Must match the GPU layout exactly
const buffer = new Float32Array([
  1.0,              // a at byte 0
  0.0, 0.0, 0.0,   // padding bytes 4-15
  1.0, 2.0, 3.0,   // b at byte 16
  4.0,              // c at byte 28
]);
// Total: 32 bytes
```

### @align and @size Attributes

Override natural alignment/size on struct members. Cannot go below natural values.

```wgsl
struct Custom {
  @align(16) a: f32,   // Forces 16-byte alignment (natural = 4)
  @size(32) b: f32,    // Forces 32-byte size (natural = 4, adds 28 bytes padding)
}
```

`@align(n)` must be a power of 2 and >= natural alignment. `@size(n)` must be >= natural size.

### Practical Guidelines

**Order members by descending alignment to minimize padding:**
```wgsl
// Bad: 48 bytes (wasted space)
struct Bad {
  x: f32,          // offset 0
                   // 12 bytes padding
  v: vec3<f32>,    // offset 16
                   // 4 bytes padding
  m: mat4x4<f32>, // offset 32
}

// Good: 80 bytes (minimal padding)
struct Good {
  m: mat4x4<f32>, // offset 0,  size 64
  v: vec3<f32>,    // offset 64, size 12
  x: f32,          // offset 76, size 4
}
// struct SizeOf = roundUp(16, 80) = 80
```

**Prefer vec4 over vec3 in buffers** - same stride, no wasted padding:
```wgsl
position: vec4<f32>,  // Use w=1.0 for points, w=0.0 for directions
```

**Pack scalars into vec3 trailing slots:**
```wgsl
struct Packed {
  positionAndRadius: vec4<f32>,  // xyz = position, w = radius
  colorAndIntensity: vec4<f32>,  // rgb = color, a = intensity
}
```

---

## Shader Entry Points

### Vertex

```wgsl
struct VertexOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs(@location(0) pos: vec3<f32>, @location(1) uv: vec2<f32>) -> VertexOut {
  var out: VertexOut;
  out.pos = uniforms.mvp * vec4<f32>(pos, 1.0);
  out.uv = uv;
  return out;
}
```

Vertex built-in inputs: `vertex_index`, `instance_index`.
Vertex built-in outputs: `position` (required).

### Fragment

```wgsl
@fragment
fn fs(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(tex, samp, uv);
}
```

Fragment built-in inputs: `position` (window coords), `front_facing`, `sample_index`, `sample_mask`.

Interpolation (on vertex outputs / fragment inputs):
- `@interpolate(perspective, center)` - default
- `@interpolate(linear, center)` - no perspective correction
- `@interpolate(flat)` - no interpolation (uses provoking vertex)
- Sampling: `center`, `centroid`, `sample`

Multiple render targets:
```wgsl
struct FragOut {
  @location(0) color: vec4<f32>,
  @location(1) normal: vec4<f32>,
}
```

### Compute

```wgsl
@compute @workgroup_size(8, 8, 1)
fn cs(@builtin(global_invocation_id) gid: vec3<u32>) {
  // ...
}
```

Compute built-ins: `global_invocation_id`, `local_invocation_id`, `local_invocation_index`, `workgroup_id`, `num_workgroups`.

---

## Variables and Declarations

```wgsl
const X = 1;                        // Module-scope compile-time constant
override Y: f32 = 1.0;              // Pipeline-overridable (optional @id(n))
var<uniform> u: Uniforms;           // Module-scope resource
var<private> p: f32;                // Module-scope per-invocation

fn foo() {
  let a = 1.0;                      // Immutable, type inferred
  var b: f32 = 2.0;                 // Mutable local (function address space)
  var c: vec3<f32>;                 // Zero-initialized
}
```

---

## Expressions and Operators

**Precedence (high to low):**

| Operators | Description |
|-----------|-------------|
| `()` `.` `[]` | Grouping, member access, index |
| `-` `!` `~` `&` `*` | Unary: negate, not, bitwise-not, address-of, deref |
| `*` `/` `%` | Multiply, divide, modulo |
| `+` `-` | Add, subtract |
| `<<` `>>` | Shift |
| `<` `>` `<=` `>=` | Comparison |
| `==` `!=` | Equality |
| `&` | Bitwise AND |
| `^` | Bitwise XOR |
| `\|` | Bitwise OR |
| `&&` | Logical AND (short-circuit) |
| `\|\|` | Logical OR (short-circuit) |

Binary arithmetic on vectors is component-wise. Matrix * vector and matrix * matrix follow linear algebra rules.

---

## Control Flow

```wgsl
// If
if condition { } else if other { } else { }

// Switch (cases need braces, no fallthrough)
switch value {
  case 0: { }
  case 1, 2: { }
  default: { }
}

// For
for (var i = 0; i < 10; i++) { }

// While
while condition { }

// Loop with continuing block
loop {
  if done { break; }
  continuing {
    i++;
    break if i >= 10;  // conditional break in continuing
  }
}

// discard - terminate fragment invocation (fragment shaders only)
```

---

## Functions

```wgsl
fn add(a: f32, b: f32) -> f32 {
  return a + b;
}

// Pointer parameters (pass by reference)
fn modify(p: ptr<function, f32>) {
  *p = *p + 1.0;
}

fn caller() {
  var x = 1.0;
  modify(&x);  // x is now 2.0
}
```

No function overloading. No recursion. No default parameter values.

---

## Built-in Functions

### Math

```
abs  sign  floor  ceil  round  trunc  fract
min  max  clamp  saturate  mix  step  smoothstep
sin  cos  tan  asin  acos  atan  atan2
sinh  cosh  tanh  asinh  acosh  atanh
exp  exp2  log  log2  pow  sqrt  inverseSqrt
fma  degrees  radians
```

### Vector / Matrix

```
dot  cross  length  distance  normalize
faceforward  reflect  refract
transpose  determinant
```

### Integer / Bit

```
countLeadingZeros  countTrailingZeros  countOneBits
firstLeadingBit  firstTrailingBit  reverseBits
extractBits  insertBits
```

### Type Conversion

```wgsl
f32(x)  i32(x)  u32(x)  vec3<f32>(v)
bitcast<u32>(floatVal)  // Reinterpret bits
quantizeToF16(x)        // Round to f16 precision
```

### Data Packing/Unpacking

```
pack4x8snorm  pack4x8unorm  pack2x16snorm  pack2x16unorm  pack2x16float
unpack4x8snorm  unpack4x8unorm  unpack2x16snorm  unpack2x16unorm  unpack2x16float
```

### Texture Operations

```wgsl
textureSample(t, s, uv)                    // Basic sample (fragment only)
textureSampleLevel(t, s, uv, lod)          // Explicit LOD (any stage)
textureSampleBias(t, s, uv, bias)          // LOD bias (fragment only)
textureSampleGrad(t, s, uv, ddx, ddy)      // Explicit gradients
textureSampleCompare(t, s, uv, ref)         // Depth comparison (fragment only)
textureSampleCompareLevel(t, s, uv, ref)    // Depth comparison explicit LOD
textureLoad(t, coords, level)               // Direct texel fetch (integer coords)
textureStore(t, coords, value)              // Write to storage texture
textureDimensions(t)                        // Returns texture size
textureNumLevels(t)                         // Mip levels count
textureNumLayers(t)                         // Array layers count
textureGather(component, t, s, uv)          // Gather one component from 4 texels
```

`textureSample` and `textureSampleBias` require **uniform control flow** (cannot be called inside non-uniform branches).

### Derivative Functions (Fragment Only)

```
dpdx  dpdy  fwidth
dpdxCoarse  dpdxFine  dpdyCoarse  dpdyFine  fwidthCoarse  fwidthFine
```

Require uniform control flow.

### Atomics

```wgsl
atomicLoad(&a)  atomicStore(&a, v)
atomicAdd(&a, v)  atomicSub(&a, v)
atomicMax(&a, v)  atomicMin(&a, v)
atomicAnd(&a, v)  atomicOr(&a, v)  atomicXor(&a, v)
atomicExchange(&a, v)
atomicCompareExchangeWeak(&a, expected, v) // returns struct { old_value, exchanged }
```

### Synchronization (Compute Only)

```wgsl
workgroupBarrier()      // Execution + memory barrier for workgroup
storageBarrier()        // Memory barrier for storage
textureBarrier()        // Memory barrier for textures
workgroupUniformLoad(p) // Load value uniformly across workgroup
```

---

## Attributes Reference

| Attribute | Applies to | Description |
|-----------|------------|-------------|
| `@vertex` | Function | Vertex entry point |
| `@fragment` | Function | Fragment entry point |
| `@compute` | Function | Compute entry point |
| `@workgroup_size(x,y,z)` | Compute function | Workgroup dimensions |
| `@group(n)` | Resource var | Bind group index |
| `@binding(n)` | Resource var | Binding index within group |
| `@location(n)` | Struct member / param | Vertex attribute or inter-stage slot |
| `@builtin(name)` | Struct member / param | Built-in value |
| `@interpolate(type,sampling)` | Fragment input | Interpolation mode |
| `@invariant` | `@builtin(position)` | Deterministic position output |
| `@align(n)` | Struct member | Override alignment (power of 2) |
| `@size(n)` | Struct member | Override size |
| `@id(n)` | `override` declaration | Pipeline constant ID |
| `@diagnostic(severity, rule)` | Statement / module | Filter diagnostics |

---

## Uniformity

Certain operations require **uniform control flow** - all invocations in the group must reach the call together:

- `textureSample`, `textureSampleBias`, `textureSampleCompare`
- `dpdx`, `dpdy`, `fwidth` and variants
- `workgroupBarrier`, `storageBarrier`, `textureBarrier`

Calling these inside divergent `if`/`switch`/`loop` branches is a shader-creation error. Use `textureSampleLevel` or `textureSampleGrad` as non-uniform alternatives for texture sampling.

---

## Diagnostics

```wgsl
// Module-level
diagnostic(off, derivative_uniformity);  // Suppress uniformity warnings

// Statement-level
@diagnostic(warning, derivative_uniformity)
if condition {
  let c = textureSample(t, s, uv);
}
```

Severity levels: `error`, `warning`, `info`, `off`.

---

## Common Patterns

### MVP Transform
```wgsl
struct Camera {
  viewProjection: mat4x4<f32>,
}
struct Model {
  transform: mat4x4<f32>,
  normalMatrix: mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<uniform> model: Model;

@vertex
fn vs(@location(0) pos: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOut {
  var out: VertexOut;
  let worldPos = model.transform * vec4(pos, 1.0);
  out.position = camera.viewProjection * worldPos;
  out.normal = (model.normalMatrix * vec4(normal, 0.0)).xyz;
  return out;
}
```

### Instanced Rendering
```wgsl
struct Instance {
  transform: mat4x4<f32>,
}
@group(1) @binding(0) var<storage, read> instances: array<Instance>;

@vertex
fn vs(@builtin(instance_index) idx: u32, @location(0) pos: vec3<f32>) -> @builtin(position) vec4<f32> {
  return camera.vp * instances[idx].transform * vec4(pos, 1.0);
}
```

### Fullscreen Triangle (No Vertex Buffer)
```wgsl
@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let uv = vec2<f32>(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}
```

---

## Gotchas

1. **vec3 alignment is 16 bytes**, not 12 - the most common buffer layout bug
2. **Matrices are column-major** - `mat4x4` stores 4 column `vec4`s
3. **No implicit conversions** - must cast explicitly: `f32(myInt)`
4. **bool is not host-shareable** - cannot use in uniform/storage structs
5. **Runtime-sized arrays** must be the last struct member, storage buffers only
6. **textureSample needs uniform control flow** - use `textureSampleLevel` in divergent branches
7. **Array element stride** includes padding: `array<vec3<f32>>` has stride 16, not 12
8. **Struct size rounds up** to multiple of its alignment
9. **No function overloading or recursion**
10. **`discard` does not terminate** the invocation immediately - execution continues but outputs are suppressed
