import { expect, it, describe, expectTypeOf } from 'vitest';
import { createParser } from './obj-parser';

const positionUvNormalPlane = `
# Blender 3.4.0
# www.blender.org
o Plane
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
f 1/1/1 2/2/1 4/4/1 3/3/1
`;

const positionUvPlane = `
# Blender 3.4.0
# www.blender.org
o Plane
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
f 1/1 2/2 4/4 3/3
`;

const positionNormalPlane = `
# Blender 3.4.0
# www.blender.org
o Plane
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
vn -0.0000 1.0000 -0.0000
s 0
f 1//1 2//1 4//1 3//1
`;

const positionPlane = `
# Blender 3.4.0
# www.blender.org
o Plane
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
s 0
f 1 2 4 3
`;

const planeWithUseMtl = `
# Blender 3.4.0
# www.blender.org
mtllib plane-use-mtl.mtl
o Plane
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
usemtl Material
f 1/1/1 2/2/1 4/4/1 3/3/1
`;

const multiplePlanes = `
# Blender 3.4.0
# www.blender.org
o Plane.000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
v -1.000000 0.000000 -3.000000
v 1.000000 0.000000 -3.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
f 1/1/1 2/2/1 4/4/1 3/3/1
o Plane.001
v -1.000000 0.000000 3.000000
v 1.000000 0.000000 3.000000
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
f 5/5/2 6/6/2 8/8/2 7/7/2
o Plane.002
v 1.000000 0.000000 1.000000
v 3.000000 0.000000 1.000000
v 1.000000 0.000000 -1.000000
v 3.000000 0.000000 -1.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
f 9/9/3 10/10/3 12/12/3 11/11/3
o Plane.003
v -3.000000 0.000000 1.000000
v -1.000000 0.000000 1.000000
v -3.000000 0.000000 -1.000000
v -1.000000 0.000000 -1.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
f 13/13/4 14/14/4 16/16/4 15/15/4

`;

const multiplePrimitives = `
# Blender 3.4.0
# www.blender.org
mtllib multiple-primitives-with-materials.mtl
o Plane
v -1.000000 0.000000 3.000000
v 1.000000 0.000000 3.000000
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
v -1.000000 0.000000 -3.000000
v 1.000000 0.000000 -3.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
usemtl Material.001
f 5/5/1 6/6/1 8/8/1 7/7/1
usemtl Material.002
f 1/1/1 2/2/1 4/4/1 3/3/1
`;

const groups = `
# Blender 3.4.0
# www.blender.org
mtllib plane-group.mtl
g Plane_Plane
v -1.000000 0.000000 1.000000
v 1.000000 0.000000 1.000000
v -1.000000 0.000000 -1.000000
v 1.000000 0.000000 -1.000000
vn -0.0000 1.0000 -0.0000
vt 0.000000 0.000000
vt 1.000000 0.000000
vt 0.000000 1.000000
vt 1.000000 1.000000
s 0
f 1/1/1 2/2/1 4/4/1 3/3/1
`;

describe('obj-parser', () => {
    describe('return type', () => {
        it('should return a interleaved and indexed primitive type without any options', () => {
            const parse = createParser();
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                vertices: Float32Array;
                                indices: Uint32Array;
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a interleaved and indexed primitive type with a empty options object', () => {
            const parse = createParser({});
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                vertices: Float32Array;
                                indices: Uint32Array;
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a interleaved and indexed primitive type with mode: "interleaved-typed-array-indexed"', () => {
            const parse = createParser({ mode: 'interleaved-typed-array-indexed' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                vertices: Float32Array;
                                indices: Uint32Array;
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a interleaved primitive type with mode: "interleaved-number-array"', () => {
            const parse = createParser({ mode: 'interleaved-number-array' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                vertices: number[];
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a interleaved and indexed primitive type with mode: "interleaved-number-array-indexed"', () => {
            const parse = createParser({ mode: 'interleaved-number-array-indexed' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                vertices: number[];
                                indices: number[];
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a interleaved primitive type with mode: "interleaved-typed-array"', () => {
            const parse = createParser({ mode: 'interleaved-typed-array' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                vertices: Float32Array;
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a interleaved and indexed primitive type with mode: "interleaved-typed-array-indexed"', () => {
            const parse = createParser({ mode: 'interleaved-typed-array-indexed' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                vertices: Float32Array;
                                indices: Uint32Array;
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a non-interleaved primitive type with mode: "non-interleaved-number-array"', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                positions: number[];
                                uvs: number[];
                                normals: number[];
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a non-interleaved and indexed primitive type with mode: "non-interleaved-number-array-indexed"', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array-indexed' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                positions: number[];
                                uvs: number[];
                                normals: number[];
                                indices: number[];
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a non-interleaved and indexed primitive type with mode: "non-interleaved-typed-array"', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                positions: Float32Array;
                                uvs: Float32Array;
                                normals: Float32Array;
                            }
                        >;
                    }
                >;
            }>();
        });

        it('should return a non-interleaved and indexed primitive type with mode: "non-interleaved-typed-array-indexed"', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array-indexed' });
            const result = parse('');

            expectTypeOf(result).toMatchTypeOf<{
                objects: Record<
                    string,
                    {
                        name: string;
                        primitives: Record<
                            string,
                            {
                                name: string;
                                positions: Float32Array;
                                uvs: Float32Array;
                                normals: Float32Array;
                                indices: Uint32Array;
                            }
                        >;
                    }
                >;
            }>();
        });
    });

    describe('mode: "interleaved-number-array"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'interleaved-number-array' });
            const { objects, info } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [
                    -1, 0, 1, 0, 0, -0, 1, -0, 1, 0, 1, 1, 0, -0, 1, -0, 1, 0, -1, 1, 1, -0, 1, -0, -1, 0, 1, 0, 0, -0,
                    1, -0, 1, 0, -1, 1, 1, -0, 1, -0, -1, 0, -1, 0, 1, -0, 1, -0,
                ],
            });

            expect(info).toEqual({
                stride: 8,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: 5,
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'interleaved-number-array' });
            const { objects, info } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [
                    -1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, -1, 1, 1, -1, 0, 1, 0, 0, 1, 0, -1, 1, 1, -1, 0, -1, 0, 1,
                ],
            });

            expect(info).toEqual({
                stride: 5,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: -1,
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'interleaved-number-array' });
            const { objects, info } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [
                    -1, 0, 1, -0, 1, -0, 1, 0, 1, -0, 1, -0, 1, 0, -1, -0, 1, -0, -1, 0, 1, -0, 1, -0, 1, 0, -1, -0, 1,
                    -0, -1, 0, -1, -0, 1, -0,
                ],
            });

            expect(info).toEqual({
                stride: 6,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: 3,
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'interleaved-number-array' });
            const { objects, info } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1],
            });

            expect(info).toEqual({
                stride: 3,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: -1,
            });
        });
    });

    describe('mode: "interleaved-typed-array"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'interleaved-typed-array' });
            const { objects, info } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([
                    -1, 0, 1, 0, 0, -0, 1, -0, 1, 0, 1, 1, 0, -0, 1, -0, 1, 0, -1, 1, 1, -0, 1, -0, -1, 0, 1, 0, 0, -0,
                    1, -0, 1, 0, -1, 1, 1, -0, 1, -0, -1, 0, -1, 0, 1, -0, 1, -0,
                ]),
            });

            expect(info).toEqual({
                stride: 8,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: 5,
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'interleaved-typed-array' });
            const { objects, info } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([
                    -1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, -1, 1, 1, -1, 0, 1, 0, 0, 1, 0, -1, 1, 1, -1, 0, -1, 0, 1,
                ]),
            });

            expect(info).toEqual({
                stride: 5,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: -1,
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'interleaved-typed-array' });
            const { objects, info } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([
                    -1, 0, 1, -0, 1, -0, 1, 0, 1, -0, 1, -0, 1, 0, -1, -0, 1, -0, -1, 0, 1, -0, 1, -0, 1, 0, -1, -0, 1,
                    -0, -1, 0, -1, -0, 1, -0,
                ]),
            });

            expect(info).toEqual({
                stride: 6,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: 3,
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'interleaved-typed-array' });
            const { objects, info } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1]),
            });

            expect(info).toEqual({
                stride: 3,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: -1,
            });
        });
    });

    describe('mode: "interleaved-number-array-indexed"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'interleaved-number-array-indexed' });
            const { objects, info } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [
                    -1, 0, 1, 0, 0, -0, 1, -0, 1, 0, 1, 1, 0, -0, 1, -0, 1, 0, -1, 1, 1, -0, 1, -0, -1, 0, 1, 0, 0, -0,
                    1, -0, -1, 0, -1, 0, 1, -0, 1, -0,
                ],
                indices: [0, 1, 2, 3, 2, 4],
            });

            expect(info).toEqual({
                stride: 8,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: 5,
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'interleaved-number-array-indexed' });
            const { objects, info } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [-1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, -1, 1, 1, -1, 0, 1, 0, 0, -1, 0, -1, 0, 1],
                indices: [0, 1, 2, 3, 2, 4],
            });

            expect(info).toEqual({
                stride: 5,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: -1,
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'interleaved-number-array-indexed' });
            const { objects, info } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [
                    -1, 0, 1, -0, 1, -0, 1, 0, 1, -0, 1, -0, 1, 0, -1, -0, 1, -0, -1, 0, 1, -0, 1, -0, -1, 0, -1, -0, 1,
                    -0,
                ],
                indices: [0, 1, 2, 3, 2, 4],
            });

            expect(info).toEqual({
                stride: 6,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: 3,
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'interleaved-number-array-indexed' });
            const { objects, info } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1],
                indices: [0, 1, 2, 3, 2, 4],
            });

            expect(info).toEqual({
                stride: 3,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: -1,
            });
        });
    });

    describe('mode: "interleaved-typed-array-indexed"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'interleaved-typed-array-indexed' });
            const { objects, info } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([
                    -1, 0, 1, 0, 0, -0, 1, -0, 1, 0, 1, 1, 0, -0, 1, -0, 1, 0, -1, 1, 1, -0, 1, -0, -1, 0, 1, 0, 0, -0,
                    1, -0, -1, 0, -1, 0, 1, -0, 1, -0,
                ]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });

            expect(info).toEqual({
                stride: 8,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: 5,
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'interleaved-typed-array-indexed' });
            const { objects, info } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([
                    -1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, -1, 1, 1, -1, 0, 1, 0, 0, -1, 0, -1, 0, 1,
                ]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });

            expect(info).toEqual({
                stride: 5,
                positionOffset: 0,
                uvOffset: 3,
                normalOffset: -1,
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'interleaved-typed-array-indexed' });
            const { objects, info } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([
                    -1, 0, 1, -0, 1, -0, 1, 0, 1, -0, 1, -0, 1, 0, -1, -0, 1, -0, -1, 0, 1, -0, 1, -0, -1, 0, -1, -0, 1,
                    -0,
                ]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });

            expect(info).toEqual({
                stride: 6,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: 3,
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'interleaved-typed-array-indexed' });
            const { objects, info } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                vertices: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });

            expect(info).toEqual({
                stride: 3,
                positionOffset: 0,
                uvOffset: -1,
                normalOffset: -1,
            });
        });
    });

    describe('mode: "non-interleaved-number-array"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const { objects } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1],
                uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const { objects } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1],
                uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                normals: [],
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const { objects } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1],
                uvs: [],
                normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const { objects } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1],
                uvs: [],
                normals: [],
            });
        });
    });

    describe('mode: "non-interleaved-typed-array"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array' });
            const { objects } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1]),
                uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]),
                normals: new Float32Array([-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0]),
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array' });
            const { objects } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1]),
                uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]),
                normals: new Float32Array([]),
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array' });
            const { objects } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1]),
                uvs: new Float32Array([]),
                normals: new Float32Array([-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0]),
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array' });
            const { objects } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1]),
                uvs: new Float32Array([]),
                normals: new Float32Array([]),
            });
        });
    });

    describe('mode: "non-interleaved-number-array-indexed"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array-indexed' });
            const { objects } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1],
                uvs: [0, 0, 1, 0, 1, 1, 0, 0, 0, 1],
                normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                indices: [0, 1, 2, 3, 2, 4],
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array-indexed' });
            const { objects } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1],
                uvs: [0, 0, 1, 0, 1, 1, 0, 0, 0, 1],
                normals: [],
                indices: [0, 1, 2, 3, 2, 4],
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array-indexed' });
            const { objects } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1],
                uvs: [],
                normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                indices: [0, 1, 2, 3, 2, 4],
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array-indexed' });
            const { objects } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1],
                uvs: [],
                normals: [],
                indices: [0, 1, 2, 3, 2, 4],
            });
        });
    });

    describe('mode: "non-interleaved-typed-array-indexed"', () => {
        it('should parse the "position/uv/normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array-indexed' });
            const { objects } = parse(positionUvNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1]),
                uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 0, 1]),
                normals: new Float32Array([-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });
        });

        it('should parse the "position/uv" format ', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array-indexed' });
            const { objects } = parse(positionUvPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1]),
                uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 0, 1]),
                normals: new Float32Array([]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });
        });

        it('should parse the "position//normal" format', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array-indexed' });
            const { objects } = parse(positionNormalPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1]),
                uvs: new Float32Array([]),
                normals: new Float32Array([-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });
        });

        it('should parse the "position" format', () => {
            const parse = createParser({ mode: 'non-interleaved-typed-array-indexed' });
            const { objects } = parse(positionPlane);

            expect(objects.Plane.primitives.default).toEqual({
                name: 'default',
                positions: new Float32Array([-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1]),
                uvs: new Float32Array([]),
                normals: new Float32Array([]),
                indices: new Uint32Array([0, 1, 2, 3, 2, 4]),
            });
        });
    });

    describe('usemtl', () => {
        it('should set the correct name for the primitive', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const { objects } = parse(planeWithUseMtl);
            expect(objects.Plane.primitives.Material.name).toEqual('Material');
        });

        it('should parse it into 2 primitives with the correct material', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const { objects } = parse(multiplePrimitives);
            expect(objects).toEqual({
                Plane: {
                    name: 'Plane',
                    primitives: {
                        'Material.001': {
                            name: 'Material.001',
                            positions: [-1, 0, -1, 1, 0, -1, 1, 0, -3, -1, 0, -1, 1, 0, -3, -1, 0, -3],
                            uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                            normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                        },
                        'Material.002': {
                            name: 'Material.002',
                            positions: [-1, 0, 3, 1, 0, 3, 1, 0, 1, -1, 0, 3, 1, 0, 1, -1, 0, 1],
                            uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                            normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                        },
                    },
                },
            });
        });
    });

    describe('multiple objects', () => {
        it('should parse multiple objects correctly', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array' });
            const { objects } = parse(multiplePlanes);
            expect(objects).toEqual({
                'Plane.000': {
                    name: 'Plane.000',
                    primitives: {
                        default: {
                            name: 'default',
                            positions: [-1, 0, -1, 1, 0, -1, 1, 0, -3, -1, 0, -1, 1, 0, -3, -1, 0, -3],
                            uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                            normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                        },
                    },
                },
                'Plane.001': {
                    name: 'Plane.001',
                    primitives: {
                        default: {
                            name: 'default',
                            positions: [-1, 0, 3, 1, 0, 3, 1, 0, 1, -1, 0, 3, 1, 0, 1, -1, 0, 1],
                            uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                            normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                        },
                    },
                },
                'Plane.002': {
                    name: 'Plane.002',
                    primitives: {
                        default: {
                            name: 'default',
                            positions: [1, 0, 1, 3, 0, 1, 3, 0, -1, 1, 0, 1, 3, 0, -1, 1, 0, -1],
                            uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                            normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                        },
                    },
                },
                'Plane.003': {
                    name: 'Plane.003',
                    primitives: {
                        default: {
                            name: 'default',
                            positions: [-3, 0, 1, -1, 0, 1, -1, 0, -1, -3, 0, 1, -1, 0, -1, -3, 0, -1],
                            uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                            normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
                        },
                    },
                },
            });
        });
    });

    describe('groups', () => {
        it('should parse objects with "g" instead of "o"', () => {
            const parse = createParser({ mode: 'non-interleaved-number-array', splitObjectMode: 'group' });
            const { objects } = parse(groups);
            expect(objects['Plane_Plane'].primitives.default).toEqual({
                name: 'default',
                positions: [-1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, -1],
                uvs: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1],
                normals: [-0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0, -0, 1, -0],
            });
        });
    });
});
