import { it, describe, expect, expectTypeOf } from 'vitest';
import * as Wgsl from './wgsl';

describe('Wgsl.array(Wgsl.type, number)', () => {
    it('should return the correct tuple type', () => {
        {
            const { views } = Wgsl.array(Wgsl.type('vec3<u32>'), 2).create({ mode: 'number-tuple' });
            expectTypeOf(views).toExtend<[[number, number, number], [number, number, number]]>();
        }
        {
            const { views } = Wgsl.array(Wgsl.type('vec4<f32>'), 2).create({ mode: 'number-tuple' });
            expectTypeOf(views).toExtend<[[number, number, number, number], [number, number, number, number]]>();
        }
    });

    it.each([
        {
            type: Wgsl.array(Wgsl.type('vec3<i32>'), 2),
            expectedBufferSize: 32,
            expectedWgsl: 'array<vec3<i32>, 2>',
            expectedBuffer: new ArrayBuffer(32),
            expectedViews: [new Int32Array([0, 0, 0]), new Int32Array([0, 0, 0])],
            expectedSharedBuffer: new SharedArrayBuffer(32),
            expectedSharedViews: [new Int32Array([0, 0, 0]), new Int32Array([0, 0, 0])],
            expectedTuples: [
                [0, 0, 0],
                [0, 0, 0],
            ],
        },
        {
            type: Wgsl.array(Wgsl.type('vec4<i32>'), 2),
            expectedBufferSize: 32,
            expectedWgsl: 'array<vec4<i32>, 2>',
            expectedBuffer: new ArrayBuffer(32),
            expectedViews: [new Int32Array([0, 0, 0, 0]), new Int32Array([0, 0, 0, 0])],
            expectedSharedBuffer: new SharedArrayBuffer(32),
            expectedSharedViews: [new Int32Array([0, 0, 0, 0]), new Int32Array([0, 0, 0, 0])],
            expectedTuples: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
        },
    ])(
        '[i32] should return the correct data',
        ({
            type,
            expectedBufferSize,
            expectedWgsl,
            expectedBuffer,
            expectedViews,
            expectedSharedBuffer,
            expectedSharedViews,
            expectedTuples,
        }) => {
            expect(type.bufferSize).toEqual(expectedBufferSize);
            expect(type.wgsl.type).toEqual(expectedWgsl);

            {
                const { buffer, views } = type.create();
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(views).toExtend<[Int32Array, Int32Array]>();
                expect(buffer).toEqual(expectedBuffer);
                expect(views).toEqual(expectedViews);
            }
            {
                const { buffer, views } = type.create({ mode: 'array-buffer' });
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(views).toExtend<[Int32Array, Int32Array]>();
                expect(buffer).toEqual(expectedBuffer);
                expect(views).toEqual(expectedViews);
            }
            {
                const { buffer, views } = type.create({ mode: 'shared-array-buffer' });
                expectTypeOf(buffer).toExtend<SharedArrayBuffer>();
                expectTypeOf(views).toExtend<[Int32Array, Int32Array]>();
                expect(buffer).toEqual(expectedSharedBuffer);
                expect(views).toEqual(expectedSharedViews);
            }
            {
                const { views } = type.create({ mode: 'number-tuple' });
                expect(views).toEqual(expectedTuples);
            }
        },
    );

    it.each([
        {
            type: Wgsl.array(Wgsl.type('vec3<u32>'), 2),
            expectedBufferSize: 32,
            expectedWgsl: 'array<vec3<u32>, 2>',
            expectedBuffer: new ArrayBuffer(32),
            expectedViews: [new Uint32Array([0, 0, 0]), new Uint32Array([0, 0, 0])],
            expectedSharedBuffer: new SharedArrayBuffer(32),
            expectedSharedViews: [new Uint32Array([0, 0, 0]), new Uint32Array([0, 0, 0])],
            expectedTuples: [
                [0, 0, 0],
                [0, 0, 0],
            ],
        },
        {
            type: Wgsl.array(Wgsl.type('vec4<u32>'), 2),
            expectedBufferSize: 32,
            expectedWgsl: 'array<vec4<u32>, 2>',
            expectedBuffer: new ArrayBuffer(32),
            expectedViews: [new Uint32Array([0, 0, 0, 0]), new Uint32Array([0, 0, 0, 0])],
            expectedSharedBuffer: new SharedArrayBuffer(32),
            expectedSharedViews: [new Uint32Array([0, 0, 0, 0]), new Uint32Array([0, 0, 0, 0])],
            expectedTuples: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
        },
    ])(
        '[u32] should return the correct data',
        ({
            type,
            expectedBufferSize,
            expectedWgsl,
            expectedBuffer,
            expectedViews,
            expectedSharedBuffer,
            expectedSharedViews,
            expectedTuples,
        }) => {
            expect(type.bufferSize).toEqual(expectedBufferSize);
            expect(type.wgsl.type).toEqual(expectedWgsl);

            {
                const { buffer, views } = type.create();
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(views).toExtend<[Uint32Array, Uint32Array]>();
                expect(buffer).toEqual(expectedBuffer);
                expect(views).toEqual(expectedViews);
            }
            {
                const { buffer, views } = type.create({ mode: 'array-buffer' });
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(views).toExtend<[Uint32Array, Uint32Array]>();
                expect(buffer).toEqual(expectedBuffer);
                expect(views).toEqual(expectedViews);
            }
            {
                const { buffer, views } = type.create({ mode: 'shared-array-buffer' });
                expectTypeOf(buffer).toExtend<SharedArrayBuffer>();
                expectTypeOf(views).toExtend<[Uint32Array, Uint32Array]>();
                expect(buffer).toEqual(expectedSharedBuffer);
                expect(views).toEqual(expectedSharedViews);
            }
            {
                const { views } = type.create({ mode: 'number-tuple' });
                expect(views).toEqual(expectedTuples);
            }
        },
    );

    it.each([
        {
            type: Wgsl.array(Wgsl.type('vec3<f32>'), 2),
            expectedBufferSize: 32,
            expectedWgsl: 'array<vec3<f32>, 2>',
            expectedBuffer: new ArrayBuffer(32),
            expectedViews: [new Float32Array([0, 0, 0]), new Float32Array([0, 0, 0])],
            expectedSharedBuffer: new SharedArrayBuffer(32),
            expectedSharedViews: [new Float32Array([0, 0, 0]), new Float32Array([0, 0, 0])],
            expectedTuples: [
                [0, 0, 0],
                [0, 0, 0],
            ],
        },
        {
            type: Wgsl.array(Wgsl.type('vec4<f32>'), 2),
            expectedBufferSize: 32,
            expectedWgsl: 'array<vec4<f32>, 2>',
            expectedBuffer: new ArrayBuffer(32),
            expectedViews: [new Float32Array([0, 0, 0, 0]), new Float32Array([0, 0, 0, 0])],
            expectedSharedBuffer: new SharedArrayBuffer(32),
            expectedSharedViews: [new Float32Array([0, 0, 0, 0]), new Float32Array([0, 0, 0, 0])],
            expectedTuples: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
        },
        {
            type: Wgsl.array(Wgsl.type('mat4x4<f32>'), 2),
            expectedBufferSize: 128,
            expectedWgsl: 'array<mat4x4<f32>, 2>',
            expectedBuffer: new ArrayBuffer(128),
            expectedViews: [
                new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            ],
            expectedSharedBuffer: new SharedArrayBuffer(128),
            expectedSharedViews: [
                new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            ],
            expectedTuples: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
        },
    ])(
        '[f32] should return the correct data',
        ({
            type,
            expectedBufferSize,
            expectedWgsl,
            expectedBuffer,
            expectedViews,
            expectedSharedBuffer,
            expectedSharedViews,
            expectedTuples,
        }) => {
            expect(type.bufferSize).toEqual(expectedBufferSize);
            expect(type.wgsl.type).toEqual(expectedWgsl);

            {
                const { buffer, views } = type.create();
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(views).toExtend<[Float32Array, Float32Array]>();
                expect(buffer).toEqual(expectedBuffer);
                expect(views).toEqual(expectedViews);
            }
            {
                const { buffer, views } = type.create({ mode: 'array-buffer' });
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(views).toExtend<[Float32Array, Float32Array]>();
                expect(buffer).toEqual(expectedBuffer);
                expect(views).toEqual(expectedViews);
            }
            {
                const { buffer, views } = type.create({ mode: 'shared-array-buffer' });
                expectTypeOf(buffer).toExtend<SharedArrayBuffer>();
                expectTypeOf(views).toExtend<[Float32Array, Float32Array]>();
                expect(buffer).toEqual(expectedSharedBuffer);
                expect(views).toEqual(expectedSharedViews);
            }
            {
                const { views } = type.create({ mode: 'number-tuple' });
                expect(views).toEqual(expectedTuples);
            }
        },
    );

    it.each([
        {
            type: Wgsl.array(Wgsl.type('vec3<f32>'), 2),
            expectedViewConfig: [
                {
                    type: 'vec3<f32>',
                    scalar: 'f32',
                    byteOffset: 0,
                    elements: 3,
                },
                {
                    type: 'vec3<f32>',
                    scalar: 'f32',
                    byteOffset: 16,
                    elements: 3,
                },
            ],
        },
        {
            type: Wgsl.array(Wgsl.type('mat4x4<f32>'), 2),
            expectedViewConfig: [
                {
                    type: 'mat4x4<f32>',
                    scalar: 'f32',
                    byteOffset: 0,
                    elements: 16,
                },
                {
                    type: 'mat4x4<f32>',
                    scalar: 'f32',
                    byteOffset: 64,
                    elements: 16,
                },
            ],
        },
        {
            type: Wgsl.array(
                Wgsl.struct('Test', {
                    one: Wgsl.type('u32'),
                    two: Wgsl.type('vec2<i32>'),
                    three: Wgsl.type('mat4x4<f32>'),
                }),
                2,
            ),
            expectedViewConfig: [
                {
                    one: {
                        type: 'u32',
                        scalar: 'u32',
                        byteOffset: 0,
                        elements: 1,
                    },
                    two: {
                        type: 'vec2<i32>',
                        scalar: 'i32',
                        byteOffset: 8,
                        elements: 2,
                    },
                    three: {
                        type: 'mat4x4<f32>',
                        scalar: 'f32',
                        byteOffset: 16,
                        elements: 16,
                    },
                },
                {
                    one: {
                        type: 'u32',
                        scalar: 'u32',
                        byteOffset: 80,
                        elements: 1,
                    },
                    two: {
                        type: 'vec2<i32>',
                        scalar: 'i32',
                        byteOffset: 88,
                        elements: 2,
                    },
                    three: {
                        type: 'mat4x4<f32>',
                        scalar: 'f32',
                        byteOffset: 96,
                        elements: 16,
                    },
                },
            ],
        },
    ])('should return the correct view config', ({ type, expectedViewConfig }) => {
        expect(type.viewConfig).toEqual(expectedViewConfig);
    });
});
