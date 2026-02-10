# glTF 2.0 Specification Summary

Condensed reference for implementing a glTF/GLB parser and loader.

## File Formats

**JSON (.gltf)**: Text file containing scene structure, references external .bin and image files
**Binary (.glb)**: Single file container with JSON + binary data chunks

## Core JSON Structure

Root object contains these optional arrays (all indices are zero-based):

```typescript
{
  asset: { version: "2.0", ... },     // REQUIRED
  scene?: number,                      // Default scene index
  scenes?: Scene[],
  nodes?: Node[],
  meshes?: Mesh[],
  materials?: Material[],
  textures?: Texture[],
  images?: Image[],
  samplers?: Sampler[],
  buffers?: Buffer[],
  bufferViews?: BufferView[],
  accessors?: Accessor[],
  animations?: Animation[],
  skins?: Skin[],
  cameras?: Camera[],
  extensions?: {},
  extensionsUsed?: string[],
  extensionsRequired?: string[]
}
```

## Binary Data Flow

**Buffer** → **BufferView** → **Accessor** → Mesh attributes/indices/animation data

### Buffer
```typescript
{
  uri?: string,        // Data URI or relative path; omit for GLB BIN chunk
  byteLength: number   // REQUIRED
}
```

### BufferView
```typescript
{
  buffer: number,      // REQUIRED: Buffer index
  byteOffset?: number, // Default: 0
  byteLength: number,  // REQUIRED
  byteStride?: number, // For interleaved data (4-252, multiple of 4)
  target?: number      // 34962 (ARRAY_BUFFER) or 34963 (ELEMENT_ARRAY_BUFFER)
}
```

### Accessor
```typescript
{
  bufferView?: number,    // Omit for sparse accessors
  byteOffset?: number,    // Default: 0, within bufferView
  componentType: number,  // REQUIRED: 5120-5126 (see table below)
  count: number,          // REQUIRED: Number of elements
  type: string,           // REQUIRED: "SCALAR", "VEC2", "VEC3", "VEC4", "MAT2", "MAT3", "MAT4"
  max?: number[],         // Bounding box hint
  min?: number[],
  sparse?: {...},         // Sparse encoding
  normalized?: boolean    // Default: false
}
```

**componentType values:**
- `5120`: BYTE (1)
- `5121`: UNSIGNED_BYTE (1)
- `5122`: SHORT (2)
- `5123`: UNSIGNED_SHORT (2)
- `5125`: UNSIGNED_INT (4)
- `5126`: FLOAT (4)

## Scenes & Nodes

### Scene
```typescript
{
  nodes?: number[]  // Root node indices
}
```

### Node
```typescript
{
  children?: number[],        // Child node indices
  mesh?: number,
  skin?: number,
  camera?: number,
  // Transform (TRS or matrix, mutually exclusive):
  translation?: [x, y, z],    // Default: [0, 0, 0]
  rotation?: [x, y, z, w],    // Quaternion, default: [0, 0, 0, 1]
  scale?: [x, y, z],          // Default: [1, 1, 1]
  matrix?: number[16],        // Column-major 4x4, default: identity
  weights?: number[]          // Morph target weights
}
```

## Meshes

### Mesh
```typescript
{
  primitives: Primitive[],  // REQUIRED
  weights?: number[]        // Morph target weights
}
```

### Primitive
```typescript
{
  attributes: {             // REQUIRED: "POSITION", "NORMAL", "TEXCOORD_0", etc.
    POSITION: number,       // Accessor index (VEC3 FLOAT)
    NORMAL?: number,        // VEC3 FLOAT
    TANGENT?: number,       // VEC4 FLOAT
    TEXCOORD_0?: number,    // VEC2 FLOAT/BYTE/SHORT
    COLOR_0?: number,       // VEC3/VEC4 FLOAT/BYTE/SHORT
    JOINTS_0?: number,      // VEC4 UNSIGNED_BYTE/SHORT
    WEIGHTS_0?: number      // VEC4 FLOAT/UNSIGNED_BYTE/SHORT
  },
  indices?: number,         // Accessor index (SCALAR UNSIGNED_BYTE/SHORT/INT)
  material?: number,
  mode?: number,            // 0-6, default: 4 (TRIANGLES)
  targets?: {...}[]         // Morph targets
}
```

**Primitive modes:**
- `0`: POINTS
- `1`: LINES
- `2`: LINE_LOOP
- `3`: LINE_STRIP
- `4`: TRIANGLES (default)
- `5`: TRIANGLE_STRIP
- `6`: TRIANGLE_FAN

## Materials (PBR Metallic-Roughness)

```typescript
{
  pbrMetallicRoughness?: {
    baseColorFactor?: [r, g, b, a],       // Default: [1, 1, 1, 1]
    baseColorTexture?: { index: number, texCoord?: number },
    metallicFactor?: number,              // Default: 1
    roughnessFactor?: number,             // Default: 1
    metallicRoughnessTexture?: { index: number, texCoord?: number }
  },
  normalTexture?: { index: number, scale?: number },
  occlusionTexture?: { index: number, strength?: number },
  emissiveTexture?: { index: number },
  emissiveFactor?: [r, g, b],            // Default: [0, 0, 0]
  alphaMode?: "OPAQUE" | "MASK" | "BLEND", // Default: "OPAQUE"
  alphaCutoff?: number,                  // Default: 0.5
  doubleSided?: boolean                  // Default: false
}
```

## Textures & Images

### Texture
```typescript
{
  sampler?: number,  // Sampler index
  source?: number    // Image index
}
```

### Image
```typescript
{
  uri?: string,          // Data URI or relative path
  mimeType?: string,     // "image/jpeg" or "image/png"
  bufferView?: number    // Alternative to uri
}
```

### Sampler
```typescript
{
  magFilter?: number,  // 9728 (NEAREST) or 9729 (LINEAR)
  minFilter?: number,  // 9728-9987 (NEAREST/LINEAR + mipmaps)
  wrapS?: number,      // 33071 (CLAMP), 33648 (MIRRORED), 10497 (REPEAT), default: 10497
  wrapT?: number       // Same as wrapS
}
```

## Animations

### Animation
```typescript
{
  channels: Channel[],   // REQUIRED
  samplers: AnimationSampler[]  // REQUIRED
}
```

### Channel
```typescript
{
  sampler: number,      // REQUIRED: AnimationSampler index
  target: {
    node?: number,
    path: string        // REQUIRED: "translation", "rotation", "scale", "weights"
  }
}
```

### AnimationSampler
```typescript
{
  input: number,        // REQUIRED: Accessor for keyframe times (SCALAR FLOAT)
  output: number,       // REQUIRED: Accessor for values
  interpolation?: "LINEAR" | "STEP" | "CUBICSPLINE"  // Default: "LINEAR"
}
```

## Skins

```typescript
{
  inverseBindMatrices?: number,  // Accessor (MAT4 FLOAT)
  skeleton?: number,             // Root node index
  joints: number[]               // REQUIRED: Joint node indices
}
```

## GLB Binary Format

```
[Header: 12 bytes]
  0x46546C67 (magic: "glTF")
  version: uint32 (2)
  length: uint32 (total file size)

[Chunk 0 - JSON: variable]
  chunkLength: uint32
  chunkType: 0x4E4F534A ("JSON")
  chunkData: UTF-8 JSON (padded with spaces to 4-byte boundary)

[Chunk 1 - BIN: optional]
  chunkLength: uint32
  chunkType: 0x004E4942 ("BIN")
  chunkData: binary buffer (padded with zeros to 4-byte boundary)
```

**GLB Notes:**
- JSON chunk references BIN via `buffers[0]` with no `uri` property
- All uint32 values are little-endian
- Chunks must be 4-byte aligned

## Implementation Checklist

1. **Parse format**: Detect GLB magic or parse JSON
2. **Load buffers**: Fetch external .bin files or extract GLB BIN chunk
3. **Resolve accessors**: Map buffer → bufferView → accessor → typed arrays
4. **Build scene graph**: Process nodes with transforms (TRS or matrix)
5. **Extract mesh data**: Read primitive attributes and indices via accessors
6. **Load textures**: Fetch images, create samplers
7. **Apply materials**: Map PBR properties to renderer
8. **Handle animations**: Parse channels/samplers, interpolate keyframes (optional)
9. **Process skins**: Compute joint matrices (optional)

## Coordinate System

- Right-handed coordinates
- Y-up orientation
- Transforms applied as: `Translation × Rotation × Scale`
- Matrix transforms are column-major 4×4

## Common Pitfalls

- **Byte alignment**: BufferViews must respect 4-byte alignment for `byteStride`
- **Accessor offsets**: Combine `bufferView.byteOffset + accessor.byteOffset`
- **Component sizes**: Use `componentType` to determine stride (FLOAT=4, SHORT=2, etc.)
- **Quaternion order**: [x, y, z, w] not [w, x, y, z]
- **GLB padding**: JSON padded with spaces (0x20), BIN with zeros (0x00)
- **Missing properties**: Most fields are optional; use spec defaults
