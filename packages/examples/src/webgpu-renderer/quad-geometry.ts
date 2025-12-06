/* eslint-disable prettier/prettier */
export const quadInterleavedIndexed = new Float32Array([
  -1.0,  1.0, 0.0,   0.0, 0.0,    0, 0, 1,  // top-left
   1.0,  1.0, 0.0,   1.0, 0.0,    0, 0, 1,  // top-right
  -1.0, -1.0, 0.0,   0.0, 1.0,    0, 0, 1,  // bottom-left
   1.0, -1.0, 0.0,   1.0, 1.0,    0, 0, 1,  // bottom-right
]);

export const quadPositions = new Float32Array([
  -1.0,  1.0, 0.0,  // top-left
   1.0,  1.0, 0.0,  // top-right
  -1.0, -1.0, 0.0,  // bottom-left
   1.0, -1.0, 0.0,  // bottom-right
]);

export const quadUvs = new Float32Array([
  0.0, 0.0,  // top-left
  1.0, 0.0,  // top-right
  0.0, 1.0,  // bottom-left
  1.0, 1.0,  // bottom-right
]);

export const quadNormals = new Float32Array([
  0, 0, 1,  // top-left
  0, 0, 1,  // top-right
  0, 0, 1,  // bottom-left
  0, 0, 1,  // bottom-right
]);

export const quadIndices = new Uint16Array([
  0, 2, 1,  // first triangle: top-left → bottom-left → top-right
  1, 2, 3,  // second triangle: top-right → bottom-left → bottom-right
]);
/* eslint-enable prettier/prettier */
