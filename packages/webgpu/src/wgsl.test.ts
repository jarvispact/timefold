import { it, describe, expectTypeOf } from 'vitest';
import * as Wgsl from './wgsl';

describe('wgsl create args and result', () => {
    describe("Wgsl.type('f32')", () => {
        it('[create] should return the correct view type depending on the `mode` parameter', () => {
            const Test = Wgsl.type('f32');

            const result1 = Test.create();
            expectTypeOf(result1).toMatchObjectType<{
                buffer: ArrayBuffer;
                view: Float32Array<ArrayBuffer>;
            }>();

            const result2 = Test.create({ mode: 'array-buffer' });
            expectTypeOf(result2).toMatchObjectType<{
                buffer: ArrayBuffer;
                view: Float32Array<ArrayBuffer>;
            }>();

            const result3 = Test.create({ mode: 'shared-array-buffer' });
            expectTypeOf(result3).toMatchObjectType<{
                buffer: SharedArrayBuffer;
                view: Float32Array<SharedArrayBuffer>;
            }>();

            const result4 = Test.create({ mode: 'number-tuple' });
            expectTypeOf(result4).toMatchObjectType<{
                view: number;
            }>();
        });

        it('[fromBuffer] should return the correct view type', () => {
            const Test = Wgsl.type('f32');

            const result1 = Test.fromBuffer(new ArrayBuffer(Test.bufferSize));
            expectTypeOf(result1).toExtend<Float32Array<ArrayBuffer>>();

            const result2 = Test.fromBuffer(new SharedArrayBuffer(Test.bufferSize));
            expectTypeOf(result2).toExtend<Float32Array<SharedArrayBuffer>>();
        });
    });

    describe("Wgsl.type('vec3<f32>')", () => {
        it('should return the correct view type depending on the `mode` parameter', () => {
            const Test = Wgsl.type('vec3<f32>');

            const result1 = Test.create();
            expectTypeOf(result1).toExtend<{
                buffer: ArrayBuffer;
                view: Float32Array<ArrayBuffer>;
            }>();

            const result2 = Test.create({ mode: 'array-buffer' });
            expectTypeOf(result2).toExtend<{
                buffer: ArrayBuffer;
                view: Float32Array<ArrayBuffer>;
            }>();

            const result3 = Test.create({ mode: 'shared-array-buffer' });
            expectTypeOf(result3).toExtend<{
                buffer: SharedArrayBuffer;
                view: Float32Array<SharedArrayBuffer>;
            }>();

            const result4 = Test.create({ mode: 'number-tuple' });
            expectTypeOf(result4).toExtend<{
                view: [number, number, number];
            }>();
        });
    });

    describe("Wgsl.array(type('vec3<f32>'), 2)", () => {
        it('[create] should return the correct view type depending on the `mode` parameter', () => {
            const Test = Wgsl.array(Wgsl.type('vec3<f32>'), 2);

            const result1 = Test.create();
            expectTypeOf(result1).toExtend<{
                buffer: ArrayBuffer;
                views: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];
            }>();

            const result2 = Test.create({ mode: 'array-buffer' });
            expectTypeOf(result2).toExtend<{
                buffer: ArrayBuffer;
                views: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];
            }>();

            const result3 = Test.create({ mode: 'shared-array-buffer' });
            expectTypeOf(result3).toExtend<{
                buffer: SharedArrayBuffer;
                views: [Float32Array<SharedArrayBuffer>, Float32Array<SharedArrayBuffer>];
            }>();

            const result4 = Test.create({ mode: 'number-tuple' });
            expectTypeOf(result4).toExtend<{
                views: [[number, number, number], [number, number, number]];
            }>();
        });

        it('[fromBuffer] should return the correct view type', () => {
            const Test = Wgsl.array(Wgsl.type('vec3<f32>'), 2);

            const result1 = Test.fromBuffer(new ArrayBuffer(Test.bufferSize));
            expectTypeOf(result1).toExtend<[Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>]>();

            const result2 = Test.fromBuffer(new SharedArrayBuffer(Test.bufferSize));
            expectTypeOf(result2).toExtend<[Float32Array<SharedArrayBuffer>, Float32Array<SharedArrayBuffer>]>();
        });
    });

    describe('Wgsl.struct', () => {
        it('[create] should return the correct view type depending on the `mode` parameter', () => {
            const TestStruct = Wgsl.struct('TestStruct', {
                one: Wgsl.type('vec3<f32>'),
                two: Wgsl.type('vec2<i32>'),
                three: Wgsl.type('u32'),
                four: Wgsl.type('mat2x2<f32>'),
            });

            const result1 = TestStruct.create();
            expectTypeOf(result1).toMatchObjectType<{
                buffer: ArrayBuffer;
                views: {
                    one: Float32Array<ArrayBuffer>;
                    two: Int32Array<ArrayBuffer>;
                    three: Uint32Array<ArrayBuffer>;
                    four: Float32Array<ArrayBuffer>;
                };
            }>();

            const result2 = TestStruct.create({ mode: 'array-buffer' });
            expectTypeOf(result2).toMatchObjectType<{
                buffer: ArrayBuffer;
                views: {
                    one: Float32Array<ArrayBuffer>;
                    two: Int32Array<ArrayBuffer>;
                    three: Uint32Array<ArrayBuffer>;
                    four: Float32Array<ArrayBuffer>;
                };
            }>();

            const result3 = TestStruct.create({ mode: 'shared-array-buffer' });
            expectTypeOf(result3).toMatchObjectType<{
                buffer: SharedArrayBuffer;
                views: {
                    one: Float32Array<SharedArrayBuffer>;
                    two: Int32Array<SharedArrayBuffer>;
                    three: Uint32Array<SharedArrayBuffer>;
                    four: Float32Array<SharedArrayBuffer>;
                };
            }>();

            const result4 = TestStruct.create({ mode: 'number-tuple' });
            expectTypeOf(result4).toMatchObjectType<{
                views: {
                    one: [number, number, number];
                    two: [number, number];
                    three: number;
                    four: [number, number, number, number];
                };
            }>();
        });

        it('[fromBuffer] should return the correct view type', () => {
            const TestStruct = Wgsl.struct('TestStruct', {
                one: Wgsl.type('vec3<f32>'),
                two: Wgsl.type('vec2<i32>'),
                three: Wgsl.type('u32'),
                four: Wgsl.type('mat2x2<f32>'),
            });

            const result1 = TestStruct.fromBuffer(new ArrayBuffer(TestStruct.bufferSize));
            expectTypeOf(result1).toMatchObjectType<{
                one: Float32Array<ArrayBuffer>;
                two: Int32Array<ArrayBuffer>;
                three: Uint32Array<ArrayBuffer>;
                four: Float32Array<ArrayBuffer>;
            }>();

            const result2 = TestStruct.fromBuffer(new SharedArrayBuffer(TestStruct.bufferSize));
            expectTypeOf(result2).toMatchObjectType<{
                one: Float32Array<SharedArrayBuffer>;
                two: Int32Array<SharedArrayBuffer>;
                three: Uint32Array<SharedArrayBuffer>;
                four: Float32Array<SharedArrayBuffer>;
            }>();
        });
    });
});
