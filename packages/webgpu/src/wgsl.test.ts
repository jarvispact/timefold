/* eslint-disable @typescript-eslint/no-unused-vars */

import { expect, expectTypeOf, it, describe } from 'vitest';
import { struct, sizedArray, runtimeArray } from './wgsl';

describe('wgsl', () => {
    describe('struct.wgsl', () => {
        it('should generate a struct declaration with primitive fields', () => {
            const S = struct('PointLight', {
                position: 'vec3<f32>',
                color: 'vec3<f32>',
                intensity: 'f32',
            });

            expect(S.wgsl).toEqual(
                `
struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32
}
`.trim(),
            );
        });

        it('should generate a struct declaration with a reference to a nested struct', () => {
            const Material = struct('Material', {
                color: 'vec4<f32>',
                roughness: 'f32',
            });

            const S = struct('Mesh', {
                modelMatrix: 'mat4x4<f32>',
                material: Material,
            });

            expect(S.wgsl).toEqual(
                `
struct Mesh {
    modelMatrix: mat4x4<f32>,
    material: Material
}
`.trim(),
            );
        });

        it('should generate a struct with a sized array referencing another struct', () => {
            const Joint = struct('Joint', {
                transform: 'mat4x4<f32>',
                parentIndex: 'i32',
            });

            const Skeleton = struct('Skeleton', {
                joints: sizedArray(Joint, 64),
                jointCount: 'u32',
            });

            expect(Skeleton.wgsl).toEqual(
                `
struct Skeleton {
    joints: array<Joint, 64>,
    jointCount: u32
}
`.trim(),
            );
        });

        it('should generate a struct with a sized array of primitives', () => {
            const S = struct('Weights', {
                values: sizedArray('vec4<f32>', 16),
                count: 'u32',
            });

            expect(S.wgsl).toEqual(
                `
struct Weights {
    values: array<vec4<f32>, 16>,
    count: u32
}
`.trim(),
            );
        });

        it('should generate a struct with a single field', () => {
            const S = struct('Index', {
                value: 'u32',
            });

            expect(S.wgsl).toEqual(
                `
struct Index {
    value: u32
}
`.trim(),
            );
        });

        it('should generate a struct with a nested sized array', () => {
            const S = struct('Grid', {
                cells: sizedArray(sizedArray('vec4<f32>', 4), 8),
                count: 'u32',
            });

            expect(S.wgsl).toEqual(
                `
struct Grid {
    cells: array<array<vec4<f32>, 4>, 8>,
    count: u32
}
`.trim(),
            );
        });

        it('should generate a struct with mixed field types', () => {
            const Material = struct('Material', {
                color: 'vec4<f32>',
                roughness: 'f32',
            });

            const S = struct('DrawCall', {
                modelMatrix: 'mat4x4<f32>',
                material: Material,
                boneWeights: sizedArray('vec4<f32>', 4),
                instanceCount: 'u32',
            });

            expect(S.wgsl).toEqual(
                `
struct DrawCall {
    modelMatrix: mat4x4<f32>,
    material: Material,
    boneWeights: array<vec4<f32>, 4>,
    instanceCount: u32
}
`.trim(),
            );
        });
    });

    describe('struct.create', () => {
        it('should return the correct typescript type for all 3 buffer mode variants', () => {
            const S = struct('Test', {
                position: 'vec3<f32>',
                index: 'u32',
            });

            const noMode = S.create();
            expectTypeOf<typeof noMode>().toEqualTypeOf<{
                data: ArrayBuffer;
                views: {
                    position: Float32Array<ArrayBuffer>;
                    index: Uint32Array<ArrayBuffer>;
                };
            }>();

            const arrayBuffer = S.create('array-buffer');
            expectTypeOf<typeof arrayBuffer>().toEqualTypeOf<{
                data: ArrayBuffer;
                views: {
                    position: Float32Array<ArrayBuffer>;
                    index: Uint32Array<ArrayBuffer>;
                };
            }>();

            const sharedArrayBuffer = S.create('shared-array-buffer');
            expectTypeOf<typeof sharedArrayBuffer>().toEqualTypeOf<{
                data: SharedArrayBuffer;
                views: {
                    position: Float32Array<SharedArrayBuffer>;
                    index: Uint32Array<SharedArrayBuffer>;
                };
            }>();
        });

        it('should return the correct runtime type for all 3 buffer mode variants', () => {
            const S = struct('Test', {
                position: 'vec3<f32>',
                index: 'u32',
            });

            const noMode = S.create();
            expect(noMode.data).toBeInstanceOf(ArrayBuffer);
            expect(noMode.views.position).toBeInstanceOf(Float32Array);
            expect(noMode.views.index).toBeInstanceOf(Uint32Array);

            const arrayBuffer = S.create('array-buffer');
            expect(arrayBuffer.data).toBeInstanceOf(ArrayBuffer);
            expect(arrayBuffer.views.position).toBeInstanceOf(Float32Array);
            expect(arrayBuffer.views.index).toBeInstanceOf(Uint32Array);

            const sharedArrayBuffer = S.create('shared-array-buffer');
            expect(sharedArrayBuffer.data).toBeInstanceOf(SharedArrayBuffer);
            expect(sharedArrayBuffer.views.position).toBeInstanceOf(Float32Array);
            expect(sharedArrayBuffer.views.index).toBeInstanceOf(Uint32Array);
        });
    });

    describe('sizedArray.create', () => {
        it('should return the correct typescript type for all 3 buffer mode variants', () => {
            const S = sizedArray('vec3<f32>', 4);

            const noMode = S.create();
            expectTypeOf<typeof noMode>().toEqualTypeOf<{
                data: ArrayBuffer;
                views: Float32Array<ArrayBuffer>[];
            }>();

            const arrayBuffer = S.create('array-buffer');
            expectTypeOf<typeof arrayBuffer>().toEqualTypeOf<{
                data: ArrayBuffer;
                views: Float32Array<ArrayBuffer>[];
            }>();

            const sharedArrayBuffer = S.create('shared-array-buffer');
            expectTypeOf<typeof sharedArrayBuffer>().toEqualTypeOf<{
                data: SharedArrayBuffer;
                views: Float32Array<SharedArrayBuffer>[];
            }>();
        });

        it('should return the correct runtime type for all 3 buffer mode variants', () => {
            const S = sizedArray('vec3<f32>', 4);

            const noMode = S.create();
            expect(noMode.data).toBeInstanceOf(ArrayBuffer);
            expect(noMode.views).toBeInstanceOf(Array);

            const arrayBuffer = S.create('array-buffer');
            expect(arrayBuffer.data).toBeInstanceOf(ArrayBuffer);
            expect(arrayBuffer.views).toBeInstanceOf(Array);

            const sharedArrayBuffer = S.create('shared-array-buffer');
            expect(sharedArrayBuffer.data).toBeInstanceOf(SharedArrayBuffer);
            expect(sharedArrayBuffer.views).toBeInstanceOf(Array);
        });
    });

    describe('runtimeArray.create', () => {
        it('should return the correct typescript type for all 3 buffer mode variants', () => {
            const S = runtimeArray('vec3<f32>', 4);

            const noMode = S.create();
            expectTypeOf<typeof noMode>().toEqualTypeOf<{
                data: ArrayBuffer;
                views: Float32Array<ArrayBuffer>[];
            }>();

            const arrayBuffer = S.create('array-buffer');
            expectTypeOf<typeof arrayBuffer>().toEqualTypeOf<{
                data: ArrayBuffer;
                views: Float32Array<ArrayBuffer>[];
            }>();

            const sharedArrayBuffer = S.create('shared-array-buffer');
            expectTypeOf<typeof sharedArrayBuffer>().toEqualTypeOf<{
                data: SharedArrayBuffer;
                views: Float32Array<SharedArrayBuffer>[];
            }>();
        });

        it('should return the correct runtime type for all 3 buffer mode variants', () => {
            const S = runtimeArray('vec3<f32>', 4);

            const noMode = S.create();
            expect(noMode.data).toBeInstanceOf(ArrayBuffer);
            expect(noMode.views).toBeInstanceOf(Array);

            const arrayBuffer = S.create('array-buffer');
            expect(arrayBuffer.data).toBeInstanceOf(ArrayBuffer);
            expect(arrayBuffer.views).toBeInstanceOf(Array);

            const sharedArrayBuffer = S.create('shared-array-buffer');
            expect(sharedArrayBuffer.data).toBeInstanceOf(SharedArrayBuffer);
            expect(sharedArrayBuffer.views).toBeInstanceOf(Array);
        });
    });
});
