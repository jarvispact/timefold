import { it, describe, expect, expectTypeOf } from 'vitest';
import * as Wgsl from './wgsl';

describe('Wgsl.type', () => {
    it('should return the correct tuple type', () => {
        {
            const { view } = Wgsl.type('i32').create({ mode: 'number-tuple' });
            expectTypeOf(view).toExtend<number>();
        }
        {
            const { view } = Wgsl.type('vec2<f32>').create({ mode: 'number-tuple' });
            expectTypeOf(view).toExtend<[number, number]>();
        }
        {
            const { view } = Wgsl.type('vec3<u32>').create({ mode: 'number-tuple' });
            expectTypeOf(view).toExtend<[number, number, number]>();
        }
        {
            const { view } = Wgsl.type('vec4<f32>').create({ mode: 'number-tuple' });
            expectTypeOf(view).toExtend<[number, number, number, number]>();
        }
    });

    it.each([
        {
            type: Wgsl.type('i32'),
            expectedBufferSize: 4,
            expectedWgsl: 'i32',
            expectedBuffer: new ArrayBuffer(4),
            expectedView: new Int32Array([0]),
            expectedSharedBuffer: new SharedArrayBuffer(4),
            expectedSharedView: new Int32Array([0]),
            expectedTuple: 0,
        },
        {
            type: Wgsl.type('vec2<i32>'),
            expectedBufferSize: 8,
            expectedWgsl: 'vec2<i32>',
            expectedBuffer: new ArrayBuffer(8),
            expectedView: new Int32Array([0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(8),
            expectedSharedView: new Int32Array([0, 0]),
            expectedTuple: [0, 0],
        },
        {
            type: Wgsl.type('vec3<i32>'),
            expectedBufferSize: 12,
            expectedWgsl: 'vec3<i32>',
            expectedBuffer: new ArrayBuffer(12),
            expectedView: new Int32Array([0, 0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(12),
            expectedSharedView: new Int32Array([0, 0, 0]),
            expectedTuple: [0, 0, 0],
        },
        {
            type: Wgsl.type('vec4<i32>'),
            expectedBufferSize: 16,
            expectedWgsl: 'vec4<i32>',
            expectedBuffer: new ArrayBuffer(16),
            expectedView: new Int32Array([0, 0, 0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(16),
            expectedSharedView: new Int32Array([0, 0, 0, 0]),
            expectedTuple: [0, 0, 0, 0],
        },
    ])(
        '[i32] should return the correct data',
        ({
            type,
            expectedBufferSize,
            expectedWgsl,
            expectedBuffer,
            expectedView,
            expectedSharedBuffer,
            expectedSharedView,
            expectedTuple,
        }) => {
            expect(type.bufferSize).toEqual(expectedBufferSize);
            expect(type.wgsl.type).toEqual(expectedWgsl);

            {
                const { buffer, view } = type.create();
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(view).toExtend<Int32Array>();
                expect(buffer).toEqual(expectedBuffer);
                expect(view).toEqual(expectedView);
            }
            {
                const { buffer, view } = type.create({ mode: 'array-buffer' });
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(view).toExtend<Int32Array>();
                expect(buffer).toEqual(expectedBuffer);
                expect(view).toEqual(expectedView);
            }
            {
                const { buffer, view } = type.create({ mode: 'shared-array-buffer' });
                expectTypeOf(buffer).toExtend<SharedArrayBuffer>();
                expectTypeOf(view).toExtend<Int32Array>();
                expect(buffer).toEqual(expectedSharedBuffer);
                expect(view).toEqual(expectedSharedView);
            }
            {
                const { view } = type.create({ mode: 'number-tuple' });
                expect(view).toEqual(expectedTuple);
            }
        },
    );

    it.each([
        {
            type: Wgsl.type('u32'),
            expectedBufferSize: 4,
            expectedWgsl: 'u32',
            expectedBuffer: new ArrayBuffer(4),
            expectedView: new Uint32Array([0]),
            expectedSharedBuffer: new SharedArrayBuffer(4),
            expectedSharedView: new Uint32Array([0]),
            expectedTuple: 0,
        },
        {
            type: Wgsl.type('vec2<u32>'),
            expectedBufferSize: 8,
            expectedWgsl: 'vec2<u32>',
            expectedBuffer: new ArrayBuffer(8),
            expectedView: new Uint32Array([0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(8),
            expectedSharedView: new Uint32Array([0, 0]),
            expectedTuple: [0, 0],
        },
        {
            type: Wgsl.type('vec3<u32>'),
            expectedBufferSize: 12,
            expectedWgsl: 'vec3<u32>',
            expectedBuffer: new ArrayBuffer(12),
            expectedView: new Uint32Array([0, 0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(12),
            expectedSharedView: new Uint32Array([0, 0, 0]),
            expectedTuple: [0, 0, 0],
        },
        {
            type: Wgsl.type('vec4<u32>'),
            expectedBufferSize: 16,
            expectedWgsl: 'vec4<u32>',
            expectedBuffer: new ArrayBuffer(16),
            expectedView: new Uint32Array([0, 0, 0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(16),
            expectedSharedView: new Uint32Array([0, 0, 0, 0]),
            expectedTuple: [0, 0, 0, 0],
        },
    ])(
        '[u32] should return the correct data',
        ({
            type,
            expectedBufferSize,
            expectedWgsl,
            expectedBuffer,
            expectedView,
            expectedSharedBuffer,
            expectedSharedView,
            expectedTuple,
        }) => {
            expect(type.bufferSize).toEqual(expectedBufferSize);
            expect(type.wgsl.type).toEqual(expectedWgsl);

            {
                const { buffer, view } = type.create();
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(view).toExtend<Uint32Array>();
                expect(buffer).toEqual(expectedBuffer);
                expect(view).toEqual(expectedView);
            }
            {
                const { buffer, view } = type.create({ mode: 'array-buffer' });
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(view).toExtend<Uint32Array>();
                expect(buffer).toEqual(expectedBuffer);
                expect(view).toEqual(expectedView);
            }
            {
                const { buffer, view } = type.create({ mode: 'shared-array-buffer' });
                expectTypeOf(buffer).toExtend<SharedArrayBuffer>();
                expectTypeOf(view).toExtend<Uint32Array>();
                expect(buffer).toEqual(expectedSharedBuffer);
                expect(view).toEqual(expectedSharedView);
            }
            {
                const { view } = type.create({ mode: 'number-tuple' });
                expect(view).toEqual(expectedTuple);
            }
        },
    );

    it.each([
        {
            type: Wgsl.type('f32'),
            expectedBufferSize: 4,
            expectedWgsl: 'f32',
            expectedBuffer: new ArrayBuffer(4),
            expectedView: new Float32Array([0]),
            expectedSharedBuffer: new SharedArrayBuffer(4),
            expectedSharedView: new Float32Array([0]),
            expectedTuple: 0,
        },
        {
            type: Wgsl.type('vec2<f32>'),
            expectedBufferSize: 8,
            expectedWgsl: 'vec2<f32>',
            expectedBuffer: new ArrayBuffer(8),
            expectedView: new Float32Array([0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(8),
            expectedSharedView: new Float32Array([0, 0]),
            expectedTuple: [0, 0],
        },
        {
            type: Wgsl.type('vec3<f32>'),
            expectedBufferSize: 12,
            expectedWgsl: 'vec3<f32>',
            expectedBuffer: new ArrayBuffer(12),
            expectedView: new Float32Array([0, 0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(12),
            expectedSharedView: new Float32Array([0, 0, 0]),
            expectedTuple: [0, 0, 0],
        },
        {
            type: Wgsl.type('vec4<f32>'),
            expectedBufferSize: 16,
            expectedWgsl: 'vec4<f32>',
            expectedBuffer: new ArrayBuffer(16),
            expectedView: new Float32Array([0, 0, 0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(16),
            expectedSharedView: new Float32Array([0, 0, 0, 0]),
            expectedTuple: [0, 0, 0, 0],
        },
        {
            type: Wgsl.type('mat4x4<f32>'),
            expectedBufferSize: 64,
            expectedWgsl: 'mat4x4<f32>',
            expectedBuffer: new ArrayBuffer(64),
            expectedView: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            expectedSharedBuffer: new SharedArrayBuffer(64),
            expectedSharedView: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            expectedTuple: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
    ])(
        '[f32] should return the correct data',
        ({
            type,
            expectedBufferSize,
            expectedWgsl,
            expectedBuffer,
            expectedView,
            expectedSharedBuffer,
            expectedSharedView,
            expectedTuple,
        }) => {
            expect(type.bufferSize).toEqual(expectedBufferSize);
            expect(type.wgsl.type).toEqual(expectedWgsl);

            {
                const { buffer, view } = type.create();
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(view).toExtend<Float32Array>();
                expect(buffer).toEqual(expectedBuffer);
                expect(view).toEqual(expectedView);
            }
            {
                const { buffer, view } = type.create({ mode: 'array-buffer' });
                expectTypeOf(buffer).toExtend<ArrayBuffer>();
                expectTypeOf(view).toExtend<Float32Array>();
                expect(buffer).toEqual(expectedBuffer);
                expect(view).toEqual(expectedView);
            }
            {
                const { buffer, view } = type.create({ mode: 'shared-array-buffer' });
                expectTypeOf(buffer).toExtend<SharedArrayBuffer>();
                expectTypeOf(view).toExtend<Float32Array>();
                expect(buffer).toEqual(expectedSharedBuffer);
                expect(view).toEqual(expectedSharedView);
            }
            {
                const { view } = type.create({ mode: 'number-tuple' });
                expect(view).toEqual(expectedTuple);
            }
        },
    );

    it.each([
        // scalar
        {
            type: Wgsl.type('i32'),
            expectedViewConfig: {
                type: 'i32',
                scalar: 'i32',
                byteOffset: 0,
                elements: 1,
            },
        },
        {
            type: Wgsl.type('u32'),
            expectedViewConfig: {
                type: 'u32',
                scalar: 'u32',
                byteOffset: 0,
                elements: 1,
            },
        },
        {
            type: Wgsl.type('f32'),
            expectedViewConfig: {
                type: 'f32',
                scalar: 'f32',
                byteOffset: 0,
                elements: 1,
            },
        },

        // vec2
        {
            type: Wgsl.type('vec2<i32>'),
            expectedViewConfig: {
                type: 'vec2<i32>',
                scalar: 'i32',
                byteOffset: 0,
                elements: 2,
            },
        },
        {
            type: Wgsl.type('vec2<u32>'),
            expectedViewConfig: {
                type: 'vec2<u32>',
                scalar: 'u32',
                byteOffset: 0,
                elements: 2,
            },
        },
        {
            type: Wgsl.type('vec2<f32>'),
            expectedViewConfig: {
                type: 'vec2<f32>',
                scalar: 'f32',
                byteOffset: 0,
                elements: 2,
            },
        },

        // vec3
        {
            type: Wgsl.type('vec3<i32>'),
            expectedViewConfig: {
                type: 'vec3<i32>',
                scalar: 'i32',
                byteOffset: 0,
                elements: 3,
            },
        },
        {
            type: Wgsl.type('vec3<u32>'),
            expectedViewConfig: {
                type: 'vec3<u32>',
                scalar: 'u32',
                byteOffset: 0,
                elements: 3,
            },
        },
        {
            type: Wgsl.type('vec3<f32>'),
            expectedViewConfig: {
                type: 'vec3<f32>',
                scalar: 'f32',
                byteOffset: 0,
                elements: 3,
            },
        },

        // vec4
        {
            type: Wgsl.type('vec4<i32>'),
            expectedViewConfig: {
                type: 'vec4<i32>',
                scalar: 'i32',
                byteOffset: 0,
                elements: 4,
            },
        },
        {
            type: Wgsl.type('vec4<u32>'),
            expectedViewConfig: {
                type: 'vec4<u32>',
                scalar: 'u32',
                byteOffset: 0,
                elements: 4,
            },
        },
        {
            type: Wgsl.type('vec4<f32>'),
            expectedViewConfig: {
                type: 'vec4<f32>',
                scalar: 'f32',
                byteOffset: 0,
                elements: 4,
            },
        },

        // matCxR<f32>
        {
            type: Wgsl.type('mat2x2<f32>'),
            expectedViewConfig: {
                type: 'mat2x2<f32>',
                scalar: 'f32',
                byteOffset: 0,
                elements: 4,
            },
        },
        {
            type: Wgsl.type('mat3x3<f32>'),
            expectedViewConfig: {
                type: 'mat3x3<f32>',
                scalar: 'f32',
                byteOffset: 0,
                elements: 12,
            },
        },
        {
            type: Wgsl.type('mat4x4<f32>'),
            expectedViewConfig: {
                type: 'mat4x4<f32>',
                scalar: 'f32',
                byteOffset: 0,
                elements: 16,
            },
        },
    ])('should return the correct view config', ({ type, expectedViewConfig }) => {
        expect(type.viewConfig).toEqual(expectedViewConfig);
    });
});
