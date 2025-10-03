/* eslint-disable prettier/prettier */
export const cubeVertices = new Float32Array([
    // Front face
    -0.5, -0.5,  0.5,   0,  0,  1,   0,  0, // Bottom-left
     0.5, -0.5,  0.5,   0,  0,  1,   1,  0, // Bottom-right
     0.5,  0.5,  0.5,   0,  0,  1,   1,  1, // Top-right
    -0.5, -0.5,  0.5,   0,  0,  1,   0,  0, // Bottom-left
     0.5,  0.5,  0.5,   0,  0,  1,   1,  1, // Top-right
    -0.5,  0.5,  0.5,   0,  0,  1,   0,  1, // Top-left

    // Back face
    -0.5, -0.5, -0.5,   0,  0, -1,   1,  0, // Bottom-left
     0.5,  0.5, -0.5,   0,  0, -1,   0,  1, // Top-right
     0.5, -0.5, -0.5,   0,  0, -1,   0,  0, // Bottom-right
    -0.5, -0.5, -0.5,   0,  0, -1,   1,  0, // Bottom-left
    -0.5,  0.5, -0.5,   0,  0, -1,   1,  1, // Top-left
     0.5,  0.5, -0.5,   0,  0, -1,   0,  1, // Top-right

    // Left face
    -0.5, -0.5, -0.5,  -1,  0,  0,   0,  0, // Bottom-left
    -0.5, -0.5,  0.5,  -1,  0,  0,   1,  0, // Bottom-right
    -0.5,  0.5,  0.5,  -1,  0,  0,   1,  1, // Top-right
    -0.5, -0.5, -0.5,  -1,  0,  0,   0,  0, // Bottom-left
    -0.5,  0.5,  0.5,  -1,  0,  0,   1,  1, // Top-right
    -0.5,  0.5, -0.5,  -1,  0,  0,   0,  1, // Top-left

    // Right face
     0.5, -0.5, -0.5,   1,  0,  0,   1,  0, // Bottom-left
     0.5,  0.5,  0.5,   1,  0,  0,   0,  1, // Top-right
     0.5, -0.5,  0.5,   1,  0,  0,   0,  0, // Bottom-right
     0.5, -0.5, -0.5,   1,  0,  0,   1,  0, // Bottom-left
     0.5,  0.5, -0.5,   1,  0,  0,   1,  1, // Top-left
     0.5,  0.5,  0.5,   1,  0,  0,   0,  1, // Top-right

    // Top face
    -0.5,  0.5, -0.5,   0,  1,  0,   0,  0, // Bottom-left
    -0.5,  0.5,  0.5,   0,  1,  0,   0,  1, // Bottom-right
     0.5,  0.5,  0.5,   0,  1,  0,   1,  1, // Top-right
    -0.5,  0.5, -0.5,   0,  1,  0,   0,  0, // Bottom-left
     0.5,  0.5,  0.5,   0,  1,  0,   1,  1, // Top-right
     0.5,  0.5, -0.5,   0,  1,  0,   1,  0, // Top-left

    // Bottom face
    -0.5, -0.5, -0.5,   0, -1,  0,   1,  1, // Bottom-left
     0.5, -0.5,  0.5,   0, -1,  0,   0,  0, // Top-right
    -0.5, -0.5,  0.5,   0, -1,  0,   1,  0, // Bottom-right
    -0.5, -0.5, -0.5,   0, -1,  0,   1,  1, // Bottom-left
     0.5, -0.5, -0.5,   0, -1,  0,   0,  1, // Top-left
     0.5, -0.5,  0.5,   0, -1,  0,   0,  0, // Top-right
]);
/* eslint-enable prettier/prettier */

// Each vertex has 6 components: 3 for position and 3 for normal
export const stride = 8;
