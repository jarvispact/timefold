import { it, describe, expect, expectTypeOf } from 'vitest';
import * as Wgsl from './wgsl';

describe('Wgsl.type', () => {
    it('should return the correct tuple type', () => {
        {
            const { views } = Wgsl.struct('Test', {
                one: Wgsl.type('i32'),
                two: Wgsl.type('vec2<i32>'),
            }).create({ mode: 'number-tuple' });

            expectTypeOf(views).toMatchTypeOf<{ one: number; two: [number, number] }>();
        }
        {
            const { views } = Wgsl.struct('Test', {
                one: Wgsl.type('vec2<f32>'),
                two: Wgsl.type('vec3<f32>'),
            }).create({ mode: 'number-tuple' });

            expectTypeOf(views).toMatchTypeOf<{ one: [number, number]; two: [number, number, number] }>();
        }
        {
            const { views } = Wgsl.struct('Test', {
                one: Wgsl.type('vec3<u32>'),
                two: Wgsl.type('mat2x2<f32>'),
            }).create({ mode: 'number-tuple' });

            expectTypeOf(views).toMatchTypeOf<{
                one: [number, number, number];
                two: [number, number, number, number];
            }>();
        }
        {
            const { views } = Wgsl.struct('Test', {
                one: Wgsl.type('vec3<u32>'),
                two: Wgsl.type('mat2x2<f32>'),
                three: Wgsl.struct('Test2', {
                    four: Wgsl.type('f32'),
                    five: Wgsl.type('vec2<i32>'),
                    six: Wgsl.struct('Test3', {
                        seven: Wgsl.type('mat2x2<f32>'),
                        eight: Wgsl.type('mat4x4<f32>'),
                    }),
                }),
            }).create({ mode: 'number-tuple' });

            expectTypeOf(views).toMatchTypeOf<{
                one: [number, number, number];
                two: [number, number, number, number];
                three: {
                    four: number;
                    five: [number, number];
                    six: {
                        seven: [number, number, number, number];
                        eight: [
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                            number,
                        ];
                    };
                };
            }>();
        }
    });

    it.each([
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('mat4x4<f32>'),
                two: Wgsl.type('vec4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 16, byteOffset: 0, scalar: 'f32', type: 'mat4x4<f32>' },
                    two: { elements: 4, byteOffset: 64, scalar: 'f32', type: 'vec4<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('vec4<f32>'),
                two: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 4, byteOffset: 0, scalar: 'f32', type: 'vec4<f32>' },
                    two: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('f32'),
                three: Wgsl.type('f32'),
                four: Wgsl.type('f32'),
                five: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 1, byteOffset: 4, scalar: 'f32', type: 'f32' },
                    three: { elements: 1, byteOffset: 8, scalar: 'f32', type: 'f32' },
                    four: { elements: 1, byteOffset: 12, scalar: 'f32', type: 'f32' },
                    five: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('f32'),
                three: Wgsl.type('f32'),
                four: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 1, byteOffset: 4, scalar: 'f32', type: 'f32' },
                    three: { elements: 1, byteOffset: 8, scalar: 'f32', type: 'f32' },
                    four: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('f32'),
                three: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 1, byteOffset: 4, scalar: 'f32', type: 'f32' },
                    three: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('vec2<f32>'),
                two: Wgsl.type('vec2<f32>'),
                three: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 2, byteOffset: 0, scalar: 'f32', type: 'vec2<f32>' },
                    two: { elements: 2, byteOffset: 8, scalar: 'f32', type: 'vec2<f32>' },
                    three: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('vec2<f32>'),
                two: Wgsl.type('mat4x4<f32>'),
                three: Wgsl.type('vec2<f32>'),
            }),
            expectedOutput: {
                bufferSize: 96,
                viewConfig: {
                    one: { elements: 2, byteOffset: 0, scalar: 'f32', type: 'vec2<f32>' },
                    two: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                    three: { elements: 2, byteOffset: 80, scalar: 'f32', type: 'vec2<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('mat4x4<f32>'),
                three: Wgsl.type('vec3<f32>'),
            }),
            expectedOutput: {
                bufferSize: 96,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                    three: { elements: 3, byteOffset: 80, scalar: 'f32', type: 'vec3<f32>' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('mat4x4<f32>'),
                three: Wgsl.type('vec2<f32>'),
                four: Wgsl.type('f32'),
            }),
            expectedOutput: {
                bufferSize: 96,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                    three: { elements: 2, byteOffset: 80, scalar: 'f32', type: 'vec2<f32>' },
                    four: { elements: 1, byteOffset: 88, scalar: 'f32', type: 'f32' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('vec2<f32>'),
                three: Wgsl.type('mat4x4<f32>'),
                four: Wgsl.type('f32'),
            }),
            expectedOutput: {
                bufferSize: 96,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 2, byteOffset: 8, scalar: 'f32', type: 'vec2<f32>' },
                    three: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                    four: { elements: 1, byteOffset: 80, scalar: 'f32', type: 'f32' },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('f32'),
                two: Wgsl.type('vec2<f32>'),
                three: Wgsl.type('f32'),
                four: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 96,
                viewConfig: {
                    one: { elements: 1, byteOffset: 0, scalar: 'f32', type: 'f32' },
                    two: { elements: 2, byteOffset: 8, scalar: 'f32', type: 'vec2<f32>' },
                    three: { elements: 1, byteOffset: 16, scalar: 'f32', type: 'f32' },
                    four: { elements: 16, byteOffset: 32, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        // nested structs
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.type('mat4x4<f32>'),
                two: Wgsl.struct('NestedTestStruct', {
                    three: Wgsl.type('vec4<f32>'),
                }),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: { elements: 16, byteOffset: 0, scalar: 'f32', type: 'mat4x4<f32>' },
                    two: {
                        three: { elements: 4, byteOffset: 64, scalar: 'f32', type: 'vec4<f32>' },
                    },
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.struct('NestedTestStruct', {
                    two: Wgsl.type('vec4<f32>'),
                }),
                three: Wgsl.type('mat4x4<f32>'),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: {
                        two: { elements: 4, byteOffset: 0, scalar: 'f32', type: 'vec4<f32>' },
                    },
                    three: { elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' },
                },
            },
        },
        // arrays in structs
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.array(Wgsl.type('vec4<f32>'), 1),
                two: Wgsl.array(Wgsl.type('mat4x4<f32>'), 1),
            }),
            expectedOutput: {
                bufferSize: 80,
                viewConfig: {
                    one: [{ elements: 4, byteOffset: 0, scalar: 'f32', type: 'vec4<f32>' }],
                    two: [{ elements: 16, byteOffset: 16, scalar: 'f32', type: 'mat4x4<f32>' }],
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.array(Wgsl.type('vec4<f32>'), 2),
                two: Wgsl.array(Wgsl.type('mat4x4<f32>'), 2),
            }),
            expectedOutput: {
                bufferSize: 160,
                viewConfig: {
                    one: [
                        { elements: 4, byteOffset: 0, scalar: 'f32', type: 'vec4<f32>' },
                        { elements: 4, byteOffset: 16, scalar: 'f32', type: 'vec4<f32>' },
                    ],
                    two: [
                        { elements: 16, byteOffset: 32, scalar: 'f32', type: 'mat4x4<f32>' },
                        { elements: 16, byteOffset: 96, scalar: 'f32', type: 'mat4x4<f32>' },
                    ],
                },
            },
        },
        {
            struct: Wgsl.struct('TestStruct', {
                one: Wgsl.array(Wgsl.type('vec3<f32>'), 2),
                two: Wgsl.array(Wgsl.type('mat4x4<f32>'), 2),
            }),
            expectedOutput: {
                bufferSize: 160,
                viewConfig: {
                    one: [
                        { elements: 3, byteOffset: 0, scalar: 'f32', type: 'vec3<f32>' },
                        { elements: 3, byteOffset: 16, scalar: 'f32', type: 'vec3<f32>' },
                    ],
                    two: [
                        { elements: 16, byteOffset: 32, scalar: 'f32', type: 'mat4x4<f32>' },
                        { elements: 16, byteOffset: 96, scalar: 'f32', type: 'mat4x4<f32>' },
                    ],
                },
            },
        },
    ])('should return the correct view config', ({ struct, expectedOutput }) => {
        expect(struct.bufferSize).toEqual(expectedOutput.bufferSize);
        expect(struct.viewConfig).toEqual(expectedOutput.viewConfig);
    });
});
