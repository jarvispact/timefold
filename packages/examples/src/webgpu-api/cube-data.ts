// --- Cube geometry ----------------------------------------------------------
// Abstraction idea: `defineGeometry({ layout: [pos: vec3f, normal: vec3f], data })` that
// auto-computes arrayStride, attribute offsets/formats, and returns typed GPUVertexBufferLayout + GPUBuffer.

// prettier-ignore
export const cubeVertices = new Float32Array([
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

export const VERTEX_STRIDE = 6 * 4; // 6 floats × 4 bytes

// --- De-interleaved arrays (positions only / normals only) ------------------

// prettier-ignore
export const cubePositions = new Float32Array([
  // 3 floats per vertex, 36 vertices (no index buffer)
  // Face -Z (front, facing camera)
  -1, -1, -1,
   1, -1, -1,
   1,  1, -1,
  -1, -1, -1,
   1,  1, -1,
  -1,  1, -1,
  // Face +Z (back)
  -1, -1,  1,
   1,  1,  1,
   1, -1,  1,
  -1, -1,  1,
  -1,  1,  1,
   1,  1,  1,
  // Face +X (right)
   1, -1, -1,
   1, -1,  1,
   1,  1,  1,
   1, -1, -1,
   1,  1,  1,
   1,  1, -1,
  // Face -X (left)
  -1, -1, -1,
  -1,  1,  1,
  -1, -1,  1,
  -1, -1, -1,
  -1,  1, -1,
  -1,  1,  1,
  // Face +Y (top)
  -1,  1, -1,
   1,  1, -1,
   1,  1,  1,
  -1,  1, -1,
   1,  1,  1,
  -1,  1,  1,
  // Face -Y (bottom)
  -1, -1, -1,
   1, -1,  1,
   1, -1, -1,
  -1, -1, -1,
  -1, -1,  1,
   1, -1,  1,
]);

// prettier-ignore
export const cubeNormals = new Float32Array([
  // 3 floats per vertex, 36 vertices
  // Face -Z
   0,  0, -1,
   0,  0, -1,
   0,  0, -1,
   0,  0, -1,
   0,  0, -1,
   0,  0, -1,
  // Face +Z
   0,  0,  1,
   0,  0,  1,
   0,  0,  1,
   0,  0,  1,
   0,  0,  1,
   0,  0,  1,
  // Face +X
   1,  0,  0,
   1,  0,  0,
   1,  0,  0,
   1,  0,  0,
   1,  0,  0,
   1,  0,  0,
  // Face -X
  -1,  0,  0,
  -1,  0,  0,
  -1,  0,  0,
  -1,  0,  0,
  -1,  0,  0,
  -1,  0,  0,
  // Face +Y
   0,  1,  0,
   0,  1,  0,
   0,  1,  0,
   0,  1,  0,
   0,  1,  0,
   0,  1,  0,
  // Face -Y
   0, -1,  0,
   0, -1,  0,
   0, -1,  0,
   0, -1,  0,
   0, -1,  0,
   0, -1,  0,
]);
