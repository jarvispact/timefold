/* eslint-disable prettier/prettier */
export const quadInterleavedIndexed = new Float32Array([
  -1.0,  1.0, 0.0,   0.0, 0.0,  // top-left
   1.0,  1.0, 0.0,   1.0, 0.0,  // top-right
  -1.0, -1.0, 0.0,   0.0, 1.0,  // bottom-left
   1.0, -1.0, 0.0,   1.0, 1.0,  // bottom-right
]);

export const quadIndices = new Uint16Array([
  0, 2, 1,  // first triangle: top-left → bottom-left → top-right
  1, 2, 3,  // second triangle: top-right → bottom-left → bottom-right
]);
/* eslint-enable prettier/prettier */
