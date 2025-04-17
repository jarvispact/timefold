import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { createRenderer } from './renderer';
import { ObjLoader } from '@timefold/obj';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const shaderCode = /* wgsl */ `
struct Vertex {
   @location(0) position: vec3<f32>,
}

struct Scene {
   view_projection_matrix: mat4x4<f32>,
}

struct Entity {
   model_matrix: mat4x4<f32>,
   color: vec3<f32>,
}

@group(0) @binding(0) var<uniform> scene: Scene;
@group(1) @binding(0) var<uniform> entity: Entity;

@vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
   return scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
   return vec4f(entity.color, 1.0);
}
`.trim();

const main = async () => {
    const interleavedTypedArrayLoader = ObjLoader.createLoader({ mode: 'interleaved-typed-array' });
    const interleavedTypedArrayIndexedLoader = ObjLoader.createLoader({ mode: 'interleaved-typed-array-indexed' });
    const nonInterleavedTypedArrayLoader = ObjLoader.createLoader({ mode: 'non-interleaved-typed-array' });
    const nonInterleavedTypedArrayIndexedLoader = ObjLoader.createLoader({
        mode: 'non-interleaved-typed-array-indexed',
    });

    const objResults = await Promise.all([
        interleavedTypedArrayLoader.load('./webgpu-plane-pos-only.obj'),
        interleavedTypedArrayIndexedLoader.load('./webgpu-plane-pos-only.obj'),
        nonInterleavedTypedArrayLoader.load('./webgpu-plane-pos-only.obj'),
        nonInterleavedTypedArrayIndexedLoader.load('./webgpu-plane-pos-only.obj'),
    ]);

    const renderer = await createRenderer({
        canvas,
        materials: {
            unlit: ({ device }) => {
                const module = device.createShaderModule({ code: shaderCode });

                const sceneLayout = device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                            buffer: { type: 'uniform' },
                        },
                    ],
                });

                const entityLayout = device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                            buffer: { type: 'uniform' },
                        },
                    ],
                });

                const layout = device.createPipelineLayout({
                    bindGroupLayouts: [sceneLayout, entityLayout],
                });

                const bufferLayout = [
                    {
                        stepMode: 'vertex' as const,
                        arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
                        attributes: [
                            {
                                format: 'float32x3' as const,
                                offset: 0,
                                shaderLocation: 0,
                            },
                        ],
                    },
                ];

                const sceneUniforms = new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT);
                const viewProjectionMatrix = new Float32Array(sceneUniforms, 0, 16);
                const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
                const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
                Mat4x4.multiplication(viewProjectionMatrix, proj, view);

                return {
                    module,
                    layout,
                    sceneLayout,
                    entityLayout,
                    bufferLayout,
                    sceneUniforms,
                };
            },
        },
    });

    renderer.registerPrimitive('unlit', 'test0', {
        type: 'interleaved',
        vertices: objResults[0].objects.Plane.primitives.default.vertices,
    });

    renderer.registerPrimitive('unlit', 'test1', {
        type: 'interleaved',
        vertices: objResults[1].objects.Plane.primitives.default.vertices,
        indices: objResults[1].objects.Plane.primitives.default.indices,
    });

    renderer.registerPrimitive('unlit', 'test2', {
        type: 'non-interleaved',
        position: objResults[2].objects.Plane.primitives.default.positions,
        attributes: {},
    });

    renderer.registerPrimitive('unlit', 'test3', {
        type: 'non-interleaved',
        position: objResults[3].objects.Plane.primitives.default.positions,
        indices: objResults[3].objects.Plane.primitives.default.indices,
        attributes: {},
    });

    const entity0 = new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT);
    {
        const modelMatrix = new Float32Array(entity0, 0, 16);
        const color = new Float32Array(entity0, 16 * Float32Array.BYTES_PER_ELEMENT, 3);
        Mat4x4.fromTranslation(modelMatrix, [-1, 0, -1]);
        Vec3.copy(color, [1, 0, 0]);
    }

    const entity1 = new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT);
    {
        const modelMatrix = new Float32Array(entity1, 0, 16);
        const color = new Float32Array(entity1, 16 * Float32Array.BYTES_PER_ELEMENT, 3);
        Mat4x4.fromTranslation(modelMatrix, [1, 0, -1]);
        Vec3.copy(color, [0, 1, 0]);
    }

    const entity2 = new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT);
    {
        const modelMatrix = new Float32Array(entity2, 0, 16);
        const color = new Float32Array(entity2, 16 * Float32Array.BYTES_PER_ELEMENT, 3);
        Mat4x4.fromTranslation(modelMatrix, [-1, 0, 1]);
        Vec3.copy(color, [0, 0, 1]);
    }

    const entity3 = new ArrayBuffer(16 * Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT);
    {
        const modelMatrix = new Float32Array(entity3, 0, 16);
        const color = new Float32Array(entity3, 16 * Float32Array.BYTES_PER_ELEMENT, 3);
        Mat4x4.fromTranslation(modelMatrix, [1, 0, 1]);
        Vec3.copy(color, [1, 1, 0]);
    }

    renderer.addEntity('unlit', 'test0', entity0);
    renderer.addEntity('unlit', 'test1', entity1);
    renderer.addEntity('unlit', 'test2', entity2);
    renderer.addEntity('unlit', 'test3', entity3);

    const tick = () => {
        renderer.render();
        requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
};

void main();
