import { expect, it, describe, expectTypeOf } from 'vitest';
import { struct, sizedArray, runtimeArray } from './wgsl';

describe('wgsl', () => {
    describe('struct bufferSize and view config', () => {
        it('should return the correct bufferSize and viewConfig 1', () => {
            const Test = struct('Test', {
                model_matrix: 'mat4x4<f32>',
            });

            expect(Test.bufferSize).toEqual(64);
            expect(Test.viewConfig).toEqual({ model_matrix: { scalar: 'f32', byteOffset: 0, componentCount: 16 } });

            expectTypeOf<typeof Test.viewConfig>().toEqualTypeOf<{
                model_matrix: { scalar: 'f32'; byteOffset: number; componentCount: number };
            }>();
        });

        it('should apply vec3 alignment padding', () => {
            const s = struct('PaddedStruct', {
                a: 'f32',
                b: 'vec3<f32>',
                c: 'f32',
            });

            // a: offset 0 (align 4, size 4), 12 bytes padding, b: offset 16 (align 16, size 12), c: offset 28 (align 4, size 4)
            // struct align = 16, size = roundUp(16, 32) = 32
            expect(s.bufferSize).toEqual(32);
            expect(s.viewConfig).toEqual({
                a: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
                b: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                c: { scalar: 'f32', byteOffset: 28, componentCount: 1 },
            });

            expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
                a: { scalar: 'f32'; byteOffset: number; componentCount: number };
                b: { scalar: 'f32'; byteOffset: number; componentCount: number };
                c: { scalar: 'f32'; byteOffset: number; componentCount: number };
            }>();
        });

        it('should handle multiple vec3 fields', () => {
            const s = struct('Light', {
                position: 'vec3<f32>',
                color: 'vec3<f32>',
                intensity: 'f32',
            });

            // position: offset 0 (align 16, size 12), color: offset 16 (align 16, size 12), intensity: offset 28 (align 4, size 4)
            // struct align = 16, size = roundUp(16, 32) = 32
            expect(s.bufferSize).toEqual(32);
            expect(s.viewConfig).toEqual({
                position: { scalar: 'f32', byteOffset: 0, componentCount: 3 },
                color: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                intensity: { scalar: 'f32', byteOffset: 28, componentCount: 1 },
            });

            expectTypeOf<typeof s.viewConfig>().toEqualTypeOf<{
                position: { scalar: 'f32'; byteOffset: number; componentCount: number };
                color: { scalar: 'f32'; byteOffset: number; componentCount: number };
                intensity: { scalar: 'f32'; byteOffset: number; componentCount: number };
            }>();
        });

        it('should handle nested struct with correct offsets', () => {
            const inner = struct('Inner', { value: 'vec4<f32>' });
            const outer = struct('Outer', { scale: 'f32', inner });

            // scale: offset 0 (align 4, size 4), inner: offset 16 (align 16, size 16)
            // struct align = 16, size = roundUp(16, 32) = 32
            expect(outer.bufferSize).toEqual(32);
            expect(outer.viewConfig).toEqual({
                scale: { scalar: 'f32', byteOffset: 0, componentCount: 1 },
                inner: { value: { scalar: 'f32', byteOffset: 16, componentCount: 4 } },
            });

            expectTypeOf<typeof outer.viewConfig>().toEqualTypeOf<{
                scale: { scalar: 'f32'; byteOffset: number; componentCount: number };
                inner: {
                    value: { scalar: 'f32'; byteOffset: number; componentCount: number };
                };
            }>();
        });
    });

    describe('sizedArray.bufferSize', () => {
        it('should compute buffer size for array of vec4', () => {
            const a = sizedArray('vec4<f32>', 4);

            // stride = roundUp(16, 16) = 16, bufferSize = 4 * 16 = 64
            expect(a.bufferSize).toEqual(64);
            expect(a.viewConfig).toEqual([
                { scalar: 'f32', byteOffset: 0, componentCount: 4 },
                { scalar: 'f32', byteOffset: 16, componentCount: 4 },
                { scalar: 'f32', byteOffset: 32, componentCount: 4 },
                { scalar: 'f32', byteOffset: 48, componentCount: 4 },
            ]);

            type VCE = { scalar: 'f32'; byteOffset: number; componentCount: number };
            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<[VCE, VCE, VCE, VCE]>();
        });

        it('should handle vec3 stride padding in arrays', () => {
            const a = sizedArray('vec3<f32>', 2);

            // vec3<f32>: align 16, size 12, stride = roundUp(16, 12) = 16
            // bufferSize = 2 * 16 = 32
            expect(a.bufferSize).toEqual(32);
            expect(a.viewConfig).toEqual([
                { scalar: 'f32', byteOffset: 0, componentCount: 3 },
                { scalar: 'f32', byteOffset: 16, componentCount: 3 },
            ]);

            type VCE = { scalar: 'f32'; byteOffset: number; componentCount: number };
            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<[VCE, VCE]>();
        });

        it('should handle array of structs', () => {
            const s = struct('Particle', {
                position: 'vec3<f32>',
                radius: 'f32',
            });
            const a = sizedArray(s, 2);

            // Particle: position at 0 (size 12), radius at 12 (size 4), align 16, size = roundUp(16, 16) = 16
            // stride = roundUp(16, 16) = 16, bufferSize = 2 * 16 = 32
            expect(a.bufferSize).toEqual(32);
            expect(a.viewConfig).toEqual([
                {
                    position: { scalar: 'f32', byteOffset: 0, componentCount: 3 },
                    radius: { scalar: 'f32', byteOffset: 12, componentCount: 1 },
                },
                {
                    position: { scalar: 'f32', byteOffset: 16, componentCount: 3 },
                    radius: { scalar: 'f32', byteOffset: 28, componentCount: 1 },
                },
            ]);

            type VCE = { scalar: 'f32'; byteOffset: number; componentCount: number };
            type ParticleVC = { position: VCE; radius: VCE };
            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<[ParticleVC, ParticleVC]>();
        });
    });

    describe('runtimeArray.bufferSize', () => {
        it('should compute buffer size for runtime array of vec4', () => {
            const a = runtimeArray('vec4<f32>', 3);

            expect(a.bufferSize).toEqual(48);
            expect(a.viewConfig).toEqual([
                { scalar: 'f32', byteOffset: 0, componentCount: 4 },
                { scalar: 'f32', byteOffset: 16, componentCount: 4 },
                { scalar: 'f32', byteOffset: 32, componentCount: 4 },
            ]);

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                { scalar: 'f32'; byteOffset: number; componentCount: number }[]
            >();
        });

        it('should handle runtime array of mat4x4', () => {
            const a = runtimeArray('mat4x4<f32>', 2);

            // mat4x4<f32>: align 16, size 64, stride = 64
            expect(a.bufferSize).toEqual(128);
            expect(a.viewConfig).toEqual([
                { scalar: 'f32', byteOffset: 0, componentCount: 16 },
                { scalar: 'f32', byteOffset: 64, componentCount: 16 },
            ]);

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                { scalar: 'f32'; byteOffset: number; componentCount: number }[]
            >();
        });

        it('should handle runtime array of structs', () => {
            const s = struct('LightData', {
                color: 'vec4<f32>',
                intensity: 'f32',
            });
            const a = runtimeArray(s, 2);

            // LightData: color at 0 (align 16, size 16), intensity at 16 (align 4, size 4)
            // struct align = 16, size = roundUp(16, 20) = 32, stride = 32
            expect(a.bufferSize).toEqual(64);
            expect(a.viewConfig).toEqual([
                {
                    color: { scalar: 'f32', byteOffset: 0, componentCount: 4 },
                    intensity: { scalar: 'f32', byteOffset: 16, componentCount: 1 },
                },
                {
                    color: { scalar: 'f32', byteOffset: 32, componentCount: 4 },
                    intensity: { scalar: 'f32', byteOffset: 48, componentCount: 1 },
                },
            ]);

            expectTypeOf<typeof a.viewConfig>().toEqualTypeOf<
                {
                    color: { scalar: 'f32'; byteOffset: number; componentCount: number };
                    intensity: { scalar: 'f32'; byteOffset: number; componentCount: number };
                }[]
            >();
        });
    });

    describe('struct.getWgsl()', () => {
        it('should generate a struct declaration with primitive fields', () => {
            const s = struct('PointLight', {
                position: 'vec3<f32>',
                color: 'vec3<f32>',
                intensity: 'f32',
            });

            expect(s.getWgsl()).toEqual(
                `
struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32,
}
`.trim(),
            );
        });

        it('should generate a struct declaration without expanding nested structs by default', () => {
            const material = struct('Material', {
                color: 'vec4<f32>',
                roughness: 'f32',
            });

            const s = struct('Mesh', {
                modelMatrix: 'mat4x4<f32>',
                material,
            });

            expect(s.getWgsl()).toEqual(
                `
struct Mesh {
    modelMatrix: mat4x4<f32>,
    material: Material,
}
`.trim(),
            );
        });

        it('should recursively expand nested struct declarations when enabled', () => {
            const material = struct('Material', {
                color: 'vec4<f32>',
                roughness: 'f32',
            });

            const s = struct('Mesh', {
                modelMatrix: 'mat4x4<f32>',
                material,
            });

            expect(s.getWgsl({ expandNested: true })).toEqual(
                `
struct Material {
    color: vec4<f32>,
    roughness: f32,
}

struct Mesh {
    modelMatrix: mat4x4<f32>,
    material: Material,
}
`.trim(),
            );
        });
    });
});
