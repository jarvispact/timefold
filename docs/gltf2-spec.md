# glTF 2.0 Specification — Condensed Reference

Complete reference for implementing a .gltf/.glb parser/loader. Covers every object type, constant, and binary layout detail from the [official specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).

---

## Coordinate System & Conventions

- **Right-handed** coordinate system, **+Y up**, **+Z toward viewer**
- Units are **meters** (by convention)
- Matrices are **column-major** 4×4
- Transform order: **Translation × Rotation × Scale**
- Quaternions use **[x, y, z, w]** order (not [w,x,y,z]), must be normalized
- Tangent vectors are **VEC4** where `w` = handedness (`-1.0` or `+1.0`)
- Color values are **linear** unless stated otherwise; base color textures are **sRGB**

---

## File Formats

| Format | Extension | MIME Type |
|--------|-----------|-----------|
| JSON glTF | `.gltf` | `model/gltf+json` |
| Binary container | `.glb` | `model/gltf-binary` |
| Binary buffer | `.bin` | `application/octet-stream` |
| PNG image | `.png` | `image/png` |
| JPEG image | `.jpg` / `.jpeg` | `image/jpeg` |

**URI types**: relative paths or data URIs (`data:application/octet-stream;base64,...` for buffers, `data:image/png;base64,...` for images).

---

## GLB Binary Container

All integers are **little-endian unsigned 32-bit**.

```
┌─────────────────────────── Header (12 bytes) ───────────────────────────┐
│ magic: 0x46546C67 ("glTF")  │ version: 2  │ length: total file bytes   │
├─────────────────────────── Chunk 0: JSON ───────────────────────────────┤
│ chunkLength: uint32  │ chunkType: 0x4E4F534A ("JSON")  │ data...       │
│ Padded with 0x20 (space) to 4-byte boundary                            │
├─────────────────────────── Chunk 1: BIN (optional) ─────────────────────┤
│ chunkLength: uint32  │ chunkType: 0x004E4942 ("BIN\0") │ data...       │
│ Padded with 0x00 to 4-byte boundary                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

- JSON chunk must come first, BIN chunk (if present) must come second
- `buffers[0]` with no `uri` references the GLB BIN chunk
- Chunk data must be 4-byte aligned

---

## Root Object

```
{
  asset              REQUIRED   Asset metadata
  scene              optional   Index of default scene
  scenes             optional   Scene[]
  nodes              optional   Node[]
  meshes             optional   Mesh[]
  accessors          optional   Accessor[]
  bufferViews        optional   BufferView[]
  buffers            optional   Buffer[]
  materials          optional   Material[]
  textures           optional   Texture[]
  samplers           optional   Sampler[]
  images             optional   Image[]
  cameras            optional   Camera[]
  skins              optional   Skin[]
  animations         optional   Animation[]
  extensionsUsed     optional   string[]
  extensionsRequired optional   string[]
  extensions         optional   object
  extras             optional   any
}
```

All arrays are zero-indexed. Objects reference each other by array index.

---

## Asset (required)

| Property | Type | Required | Notes |
|----------|------|----------|-------|
| version | string | **yes** | Must be `"2.0"` |
| minVersion | string | no | Minimum version needed to load |
| generator | string | no | Tool that generated the file |
| copyright | string | no | |

---

## Scene & Nodes

### Scene

| Property | Type | Default |
|----------|------|---------|
| nodes | int[] | `[]` |
| name | string | — |

### Node

| Property | Type | Default | Notes |
|----------|------|---------|-------|
| children | int[] | `[]` | Child node indices |
| mesh | int | — | Mesh index |
| skin | int | — | Skin index |
| camera | int | — | Camera index |
| translation | float[3] | `[0,0,0]` | TRS: mutually exclusive with `matrix` |
| rotation | float[4] | `[0,0,0,1]` | Quaternion [x,y,z,w] |
| scale | float[3] | `[1,1,1]` | |
| matrix | float[16] | identity | Column-major 4×4; mutually exclusive with TRS |
| weights | float[] | — | Morph target weights (overrides mesh weights) |

**Rules**: Use either `matrix` OR `translation`/`rotation`/`scale`, not both. When animated, only TRS properties can be targeted (not `matrix`).

---

## Binary Data Pipeline

```
Buffer ──→ BufferView ──→ Accessor ──→ Mesh attributes / indices / animation / skin
```

**Effective byte offset** into the raw buffer:
```
bufferView.byteOffset + accessor.byteOffset
```

### Buffer

| Property | Type | Required | Notes |
|----------|------|----------|-------|
| uri | string | no | Data URI or relative path. Omit for GLB BIN chunk (buffers[0]) |
| byteLength | int | **yes** | |

### BufferView

| Property | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| buffer | int | **yes** | — | Buffer index |
| byteOffset | int | no | `0` | |
| byteLength | int | **yes** | — | |
| byteStride | int | no | — | 4–252, must be multiple of component size. Absent = tightly packed |
| target | int | no | — | `34962` (ARRAY_BUFFER) or `34963` (ELEMENT_ARRAY_BUFFER) |

**byteStride** is used for interleaved vertex data. It defines the number of bytes between the start of consecutive elements. When absent, elements are tightly packed (stride = element size).

### Accessor

| Property | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| bufferView | int | no | — | Omit for zero-initialized sparse-only accessors |
| byteOffset | int | no | `0` | Offset within the bufferView |
| componentType | int | **yes** | — | See table below |
| type | string | **yes** | — | See table below |
| count | int | **yes** | — | Number of elements |
| normalized | bool | no | `false` | Integer → float normalization |
| min | float[] | no | — | Per-component minimum (required for POSITION) |
| max | float[] | no | — | Per-component maximum (required for POSITION) |
| sparse | object | no | — | Sparse encoding override |

**Component Types:**

| Value | Name | Bytes |
|-------|------|-------|
| 5120 | BYTE | 1 |
| 5121 | UNSIGNED_BYTE | 1 |
| 5122 | SHORT | 2 |
| 5123 | UNSIGNED_SHORT | 2 |
| 5125 | UNSIGNED_INT | 4 |
| 5126 | FLOAT | 4 |

**Accessor Types:**

| Type | Components |
|------|------------|
| SCALAR | 1 |
| VEC2 | 2 |
| VEC3 | 3 |
| VEC4 | 4 |
| MAT2 | 4 |
| MAT3 | 9 |
| MAT4 | 16 |

**Element byte size** = `componentSize × componentCount`

**Alignment**: `accessor.byteOffset` must be a multiple of the component size. When a bufferView is shared by multiple accessors, it must define `byteStride`.

### Normalized Integer Conversion

When `normalized: true`, integer values map to floats:

| Type | Formula |
|------|---------|
| BYTE | `max(value / 127.0, -1.0)` |
| UNSIGNED_BYTE | `value / 255.0` |
| SHORT | `max(value / 32767.0, -1.0)` |
| UNSIGNED_SHORT | `value / 65535.0` |

### Sparse Accessors

Override specific elements of an accessor without storing the full array:

```
sparse: {
  count: int,          // Number of overridden elements
  indices: {
    bufferView: int,   // REQUIRED
    byteOffset: int,   // Default: 0
    componentType: int  // 5121 (UNSIGNED_BYTE), 5123 (UNSIGNED_SHORT), or 5125 (UNSIGNED_INT)
  },
  values: {
    bufferView: int,   // REQUIRED
    byteOffset: int    // Default: 0
  }
}
```

**Process**: Read base data from the accessor's bufferView (or initialize to zeros if no bufferView), then overwrite elements at the specified sparse indices with the sparse values.

---

## Meshes

### Mesh

| Property | Type | Required |
|----------|------|----------|
| primitives | Primitive[] | **yes** |
| weights | float[] | no |

### Primitive

| Property | Type | Required | Default |
|----------|------|----------|---------|
| attributes | object | **yes** | — |
| indices | int | no | — |
| material | int | no | — |
| mode | int | no | `4` (TRIANGLES) |
| targets | object[] | no | — |

**Primitive Modes:**

| Value | Mode |
|-------|------|
| 0 | POINTS |
| 1 | LINES |
| 2 | LINE_LOOP |
| 3 | LINE_STRIP |
| 4 | TRIANGLES |
| 5 | TRIANGLE_STRIP |
| 6 | TRIANGLE_FAN |

### Vertex Attribute Semantics

Attributes map semantic names to accessor indices.

| Semantic | Type | Component Type | Notes |
|----------|------|----------------|-------|
| POSITION | VEC3 | FLOAT | Required. `min`/`max` required on accessor |
| NORMAL | VEC3 | FLOAT | Unit length |
| TANGENT | VEC4 | FLOAT | `xyz` = tangent direction, `w` = handedness (±1.0) |
| TEXCOORD_n | VEC2 | FLOAT, UNSIGNED_BYTE*, UNSIGNED_SHORT* | * = normalized |
| COLOR_n | VEC3/VEC4 | FLOAT, UNSIGNED_BYTE*, UNSIGNED_SHORT* | * = normalized |
| JOINTS_n | VEC4 | UNSIGNED_BYTE, UNSIGNED_SHORT | Joint indices (not normalized) |
| WEIGHTS_n | VEC4 | FLOAT, UNSIGNED_BYTE*, UNSIGNED_SHORT* | * = normalized. Must sum to 1.0 |

`_n` suffixes start at 0 and increment (e.g., `TEXCOORD_0`, `TEXCOORD_1`).

### Morph Targets

Each target in `targets[]` is an attribute map (same format as `attributes`) containing displacement data. Only `POSITION`, `NORMAL`, and `TANGENT` are valid in morph targets.

**Applied as**: `base + Σ(weight_i × target_i)` for each vertex attribute.

Weights come from `node.weights` (priority) or `mesh.weights` (fallback).

---

## Materials

### Material

| Property | Type | Default |
|----------|------|---------|
| pbrMetallicRoughness | object | — |
| normalTexture | NormalTextureInfo | — |
| occlusionTexture | OcclusionTextureInfo | — |
| emissiveTexture | TextureInfo | — |
| emissiveFactor | float[3] | `[0,0,0]` |
| alphaMode | string | `"OPAQUE"` |
| alphaCutoff | float | `0.5` |
| doubleSided | bool | `false` |

**Alpha Modes:**
- `"OPAQUE"` — alpha ignored, fully opaque
- `"MASK"` — alpha tested against `alphaCutoff`
- `"BLEND"` — standard alpha blending

### PBR Metallic-Roughness

| Property | Type | Default |
|----------|------|---------|
| baseColorFactor | float[4] | `[1,1,1,1]` |
| baseColorTexture | TextureInfo | — |
| metallicFactor | float | `1.0` |
| roughnessFactor | float | `1.0` |
| metallicRoughnessTexture | TextureInfo | — |

**Texture channels:**
- `baseColorTexture` — sRGB, RGBA
- `metallicRoughnessTexture` — linear, `B` = metallic, `G` = roughness (R and A unused)
- `normalTexture` — linear, RGB mapped to XYZ tangent-space normals
- `occlusionTexture` — linear, `R` channel = occlusion (0 = fully occluded, 1 = none)
- `emissiveTexture` — sRGB, RGB

### TextureInfo

| Property | Type | Default |
|----------|------|---------|
| index | int | **required** |
| texCoord | int | `0` |

Selects which `TEXCOORD_n` attribute set to use via the `texCoord` value.

### NormalTextureInfo (extends TextureInfo)

| Property | Type | Default |
|----------|------|---------|
| scale | float | `1.0` |

### OcclusionTextureInfo (extends TextureInfo)

| Property | Type | Default |
|----------|------|---------|
| strength | float | `1.0` |

---

## Textures, Samplers & Images

### Texture

| Property | Type | Notes |
|----------|------|-------|
| sampler | int | Sampler index. If absent, use implementation defaults |
| source | int | Image index |

### Sampler

| Property | Type | Default |
|----------|------|---------|
| magFilter | int | — (implementation-defined) |
| minFilter | int | — (implementation-defined) |
| wrapS | int | `10497` (REPEAT) |
| wrapT | int | `10497` (REPEAT) |

**Filter Values:**

| Value | Name | Used for |
|-------|------|----------|
| 9728 | NEAREST | mag/min |
| 9729 | LINEAR | mag/min |
| 9984 | NEAREST_MIPMAP_NEAREST | min only |
| 9985 | LINEAR_MIPMAP_NEAREST | min only |
| 9986 | NEAREST_MIPMAP_LINEAR | min only |
| 9987 | LINEAR_MIPMAP_LINEAR | min only |

**Wrap Values:**

| Value | Name |
|-------|------|
| 10497 | REPEAT |
| 33071 | CLAMP_TO_EDGE |
| 33648 | MIRRORED_REPEAT |

### Image

| Property | Type | Notes |
|----------|------|-------|
| uri | string | Data URI or relative path |
| mimeType | string | `"image/jpeg"` or `"image/png"` |
| bufferView | int | Alternative to `uri` (for GLB-embedded images) |

**Rule**: Exactly one of `uri` or `bufferView` must be present. When using `bufferView`, `mimeType` is required.

---

## Cameras

### Camera

| Property | Type | Required |
|----------|------|----------|
| type | string | **yes** |
| perspective | object | if type = `"perspective"` |
| orthographic | object | if type = `"orthographic"` |

### Perspective

| Property | Type | Required | Notes |
|----------|------|----------|-------|
| yfov | float | **yes** | Vertical FOV in radians |
| znear | float | **yes** | Must be > 0 |
| aspectRatio | float | no | Use viewport ratio if absent |
| zfar | float | no | Infinite projection if absent |

### Orthographic

| Property | Type | Required |
|----------|------|----------|
| xmag | float | **yes** |
| ymag | float | **yes** |
| znear | float | **yes** |
| zfar | float | **yes** |

---

## Skins (Skeletal Animation)

| Property | Type | Required | Notes |
|----------|------|----------|-------|
| joints | int[] | **yes** | Node indices for each joint |
| inverseBindMatrices | int | no | Accessor index (MAT4 FLOAT), one per joint |
| skeleton | int | no | Root joint node index |

**Joint matrix computation**:
```
jointMatrix[i] = globalTransform(joints[i]) × inverseBindMatrices[i]
```

Each vertex references joints via `JOINTS_n` (indices into the `joints` array) and `WEIGHTS_n` (blend weights). Max 4 joint influences per set.

---

## Animations

### Animation

| Property | Type | Required |
|----------|------|----------|
| channels | Channel[] | **yes** |
| samplers | AnimSampler[] | **yes** |

### Channel

| Property | Type | Required |
|----------|------|----------|
| sampler | int | **yes** |
| target.node | int | no |
| target.path | string | **yes** |

**Target paths**: `"translation"`, `"rotation"`, `"scale"`, `"weights"`

### AnimationSampler

| Property | Type | Required | Default |
|----------|------|----------|---------|
| input | int | **yes** | — |
| output | int | **yes** | — |
| interpolation | string | no | `"LINEAR"` |

- `input` — accessor of type SCALAR FLOAT, monotonically increasing time values (seconds)
- `output` — accessor with values matching the target path type

**Interpolation Modes:**

| Mode | Description |
|------|-------------|
| `STEP` | Constant value until next keyframe |
| `LINEAR` | Linear interpolation (SLERP for quaternion rotations) |
| `CUBICSPLINE` | Cubic spline with tangents |

**CUBICSPLINE**: Each keyframe in the output accessor is a triple of `[in-tangent, value, out-tangent]`. So the output accessor has `3 × keyframeCount` elements. The cubic Hermite formula:

```
p(t) = (2t³ - 3t² + 1)p₀ + (t³ - 2t² + t)m₀Δt + (-2t³ + 3t²)p₁ + (t³ - t²)m₁Δt
```

Where `t` = normalized time, `Δt` = time delta between keyframes, `p₀`/`p₁` = values, `m₀`/`m₁` = tangents.

---

## Extensions

| Array | Purpose |
|-------|---------|
| `extensionsUsed` | Extensions present in the file (loader may ignore) |
| `extensionsRequired` | Extensions the loader **must** support to correctly parse |

Extension data appears in `extensions` objects at any level. Unknown extensions can be safely ignored unless listed in `extensionsRequired`.

`extras` objects at any level hold arbitrary application-specific data.

---

## Implementation Notes

### Parsing Order
1. Detect format: check first 4 bytes for GLB magic (`0x46546C67`) or parse as JSON
2. For GLB: read header → extract JSON chunk → extract BIN chunk
3. Validate `asset.version` is `"2.0"`
4. Load external buffers (fetch .bin URIs, decode data URIs)
5. Resolve accessor pipeline: buffer → bufferView → accessor → typed array
6. Build scene graph from nodes with transforms
7. Extract geometry from mesh primitives via accessors
8. Load and decode images (external files, data URIs, or bufferView references)
9. Apply materials and textures
10. Process animations and skins if needed

### Creating Typed Arrays from Accessors

```
offset = bufferView.byteOffset + accessor.byteOffset
stride = bufferView.byteStride  (or element byte size if absent)

For each element i in [0, accessor.count):
  elementOffset = offset + (i * stride)
  Read componentCount values of componentType at elementOffset
```

For tightly packed data without byteStride, use a single typed array view:
```
new Float32Array(buffer, offset, accessor.count * componentCount)
```

### Key Pitfalls
- **Byte alignment**: `accessor.byteOffset` must be a multiple of its component type size
- **Accessor offsets stack**: `bufferView.byteOffset + accessor.byteOffset` gives position in buffer
- **Quaternion order**: `[x, y, z, w]` not `[w, x, y, z]`
- **GLB padding**: JSON chunk → `0x20` (space), BIN chunk → `0x00` (null)
- **Matrix storage**: Column-major (same as WebGPU/OpenGL)
- **Metallic-roughness texture**: metallic in **B**, roughness in **G** channel
- **Default material**: primitives without `material` use a default (white, fully metallic, fully rough)
- **Shared bufferViews**: Multiple accessors can share a bufferView; `byteStride` is then required
- **Sparse accessor without bufferView**: Initialize all values to zero before applying sparse overrides
- **Animation CUBICSPLINE output**: 3× elements per keyframe (in-tangent, value, out-tangent)
- **Normalized integers**: `JOINTS_n` are never normalized; `WEIGHTS_n` and `TEXCOORD_n` may be
