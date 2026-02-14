/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    InterleavedInfo,
    InterleavedObjPrimitive,
    InterleavedObjPrimitiveIndexed,
    NonInterleavedObjPrimitive,
    NonInterleavedObjPrimitiveIndexed,
    ObjObject,
    ParserOptions,
} from './types';

const parseToInt = (n: string) => Number.parseInt(n, 10);

const getIndicesForSection = (section: string) => {
    const [p, u, n] = section.split('/').map(parseToInt) as [number, number | undefined, number | undefined];
    const pp = (p - 1) * 3;
    const uu = Number.isNaN(u) || u === undefined ? undefined : (u - 1) * 2;
    const nn = Number.isNaN(n) || n === undefined ? undefined : (n - 1) * 3;
    return [pp, uu, nn] as const;
};

const getMapKey = (
    px: number,
    py: number,
    pz: number,
    u: number | undefined,
    v: number | undefined,
    nx: number | undefined,
    ny: number | undefined,
    nz: number | undefined,
) => `${px}/${py}/${pz}/${nx}/${ny}/${nz}/${u}/${v}`;

const createInterleavedPrimitive = (name: string): InterleavedObjPrimitive<number[]> => {
    return {
        name: name,
        mode: 'interleaved',
        vertices: [],
    };
};

const createNonInterleavedPrimitive = (name: string): NonInterleavedObjPrimitive<number[]> => {
    return {
        name: name,
        mode: 'non-interleaved',
        positions: [],
        uvs: [],
        normals: [],
    };
};

export const convertInterleavedToTypedArray = <
    Primitive extends InterleavedObjPrimitive<number[]> | InterleavedObjPrimitiveIndexed<number[], number[]>,
>(
    primitive: Primitive,
): Primitive extends InterleavedObjPrimitiveIndexed<number[], number[]>
    ? InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>
    : InterleavedObjPrimitive<Float32Array> => {
    return {
        name: primitive.name,
        mode: 'interleaved',
        vertices: new Float32Array(primitive.vertices),
        ...('indices' in primitive ? { indices: new Uint32Array(primitive.indices) } : {}),
    } as never;
};

export const convertNonInterleavedToTypedArray = <
    Primitive extends NonInterleavedObjPrimitive<number[]> | NonInterleavedObjPrimitiveIndexed<number[], number[]>,
>(
    primitive: Primitive,
): Primitive extends NonInterleavedObjPrimitiveIndexed<number[], number[]>
    ? NonInterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>
    : NonInterleavedObjPrimitive<Float32Array> => {
    return {
        name: primitive.name,
        mode: 'non-interleaved',
        positions: new Float32Array(primitive.positions),
        uvs: new Float32Array(primitive.uvs),
        normals: new Float32Array(primitive.normals),
        ...('indices' in primitive ? { indices: new Uint32Array(primitive.indices) } : {}),
    } as never;
};

export const convertInterleavedToIndexed = (
    primitive: InterleavedObjPrimitive<number[]>,
    info: InterleavedInfo,
): InterleavedObjPrimitiveIndexed<number[], number[]> => {
    const map: Record<string, number> = {};
    const vertices: number[] = [];
    const indices: number[] = [];

    let index = 0;

    for (let i = 0; i < primitive.vertices.length; i += info.stride) {
        const px = primitive.vertices[i + 0];
        const py = primitive.vertices[i + 1];
        const pz = primitive.vertices[i + 2];

        const uv =
            info.uvOffset === -1
                ? []
                : [primitive.vertices[i + info.uvOffset + 0], primitive.vertices[i + info.uvOffset + 1]];

        const normal =
            info.normalOffset === -1
                ? []
                : [
                      primitive.vertices[i + info.normalOffset + 0],
                      primitive.vertices[i + info.normalOffset + 1],
                      primitive.vertices[i + info.normalOffset + 2],
                  ];

        const key = getMapKey(px, py, pz, uv[0], uv[1], normal[0], normal[1], normal[2]);

        if (key in map) {
            indices.push(map[key]);
        } else {
            vertices.push(px, py, pz);
            vertices.push(...uv);
            vertices.push(...normal);
            map[key] = index;
            indices.push(index);
            index++;
        }
    }

    return {
        name: primitive.name,
        mode: 'interleaved',
        vertices,
        indices,
    };
};

export const convertNonInterleavedToIndexed = (
    primitive: NonInterleavedObjPrimitive<number[]>,
): NonInterleavedObjPrimitiveIndexed<number[], number[]> => {
    const map: Record<string, number> = {};

    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    let index = 0;

    for (let i = 0; i < primitive.positions.length; i += 3) {
        const px = primitive.positions[i + 0];
        const py = primitive.positions[i + 1];
        const pz = primitive.positions[i + 2];

        const j = Math.floor(i / 3) * 2;
        const u = primitive.uvs[j + 0] as number | undefined;
        const v = primitive.uvs[j + 1] as number | undefined;

        const nx = primitive.normals[i + 0] as number | undefined;
        const ny = primitive.normals[i + 1] as number | undefined;
        const nz = primitive.normals[i + 2] as number | undefined;

        const key = getMapKey(px, py, pz, u, v, nx, ny, nz);

        if (key in map) {
            indices.push(map[key]);
        } else {
            positions.push(px, py, pz);
            if (u !== undefined && v !== undefined) uvs.push(u, v);
            if (nx !== undefined && ny !== undefined && nz !== undefined) normals.push(nx, ny, nz);
            map[key] = index;
            indices.push(index);
            index++;
        }
    }

    return {
        name: primitive.name,
        mode: 'non-interleaved',
        positions,
        uvs,
        normals,
        indices,
    };
};

export const parseInfo = (trimmedLine: string): InterleavedInfo => {
    const firstSection = trimmedLine.substring(2).split(' ')[0];
    const [, u, n] = getIndicesForSection(firstSection);
    const stride = 3;
    const uvCount = u === undefined ? 0 : 2;
    const normalCount = n === undefined ? 0 : 3;

    return {
        stride: stride + uvCount + normalCount,
        positionOffset: 0,
        uvOffset: uvCount === 0 ? -1 : 3,
        normalOffset: normalCount === 0 ? -1 : uvCount === 0 ? 3 : 5,
    };
};

type PipelineArgument = {
    trimmedLine: string;
    primitive: any;
    positions: number[];
    uvs: number[];
    normals: number[];
    opts: ParserOptions;
};

const handleInterleavedFace = ({ trimmedLine, primitive, positions, uvs, normals, opts }: PipelineArgument) => {
    const sections = trimmedLine.substring(2).split(' ');

    for (let s = 1; s < sections.length - 1; s++) {
        const [p1, u1, n1] = getIndicesForSection(sections[0]);
        primitive.vertices.push(positions[p1 + 0], positions[p1 + 1], positions[p1 + 2]);

        if (u1 !== undefined) {
            const flipX = opts.flipUvX;
            const flipY = opts.flipUvY;
            primitive.vertices.push(flipX ? 1 - uvs[u1 + 0] : uvs[u1 + 0], flipY ? 1 - uvs[u1 + 1] : uvs[u1 + 1]);
        }

        if (n1 !== undefined) {
            primitive.vertices.push(normals[n1 + 0], normals[n1 + 1], normals[n1 + 2]);
        }

        const [p2, u2, n2] = getIndicesForSection(sections[s]);
        primitive.vertices.push(positions[p2 + 0], positions[p2 + 1], positions[p2 + 2]);

        if (u2 !== undefined) {
            const flipX = opts.flipUvX;
            const flipY = opts.flipUvY;
            primitive.vertices.push(flipX ? 1 - uvs[u2 + 0] : uvs[u2 + 0], flipY ? 1 - uvs[u2 + 1] : uvs[u2 + 1]);
        }

        if (n2 !== undefined) {
            primitive.vertices.push(normals[n2 + 0], normals[n2 + 1], normals[n2 + 2]);
        }

        const [p3, u3, n3] = getIndicesForSection(sections[s + 1]);
        primitive.vertices.push(positions[p3 + 0], positions[p3 + 1], positions[p3 + 2]);

        if (u3 !== undefined) {
            const flipX = opts.flipUvX;
            const flipY = opts.flipUvY;
            primitive.vertices.push(flipX ? 1 - uvs[u3 + 0] : uvs[u3 + 0], flipY ? 1 - uvs[u3 + 1] : uvs[u3 + 1]);
        }

        if (n3 !== undefined) {
            primitive.vertices.push(normals[n3 + 0], normals[n3 + 1], normals[n3 + 2]);
        }
    }
};

const handleNonInterleavedFace = ({ trimmedLine, primitive, positions, uvs, normals, opts }: PipelineArgument) => {
    const sections = trimmedLine.substring(2).split(' ');

    for (let s = 1; s < sections.length - 1; s++) {
        const [p1, u1, n1] = getIndicesForSection(sections[0]);
        const [p2, u2, n2] = getIndicesForSection(sections[s]);
        const [p3, u3, n3] = getIndicesForSection(sections[s + 1]);

        primitive.positions.push(positions[p1 + 0], positions[p1 + 1], positions[p1 + 2]);
        primitive.positions.push(positions[p2 + 0], positions[p2 + 1], positions[p2 + 2]);
        primitive.positions.push(positions[p3 + 0], positions[p3 + 1], positions[p3 + 2]);

        if (u1 !== undefined && u2 !== undefined && u3 !== undefined) {
            const flipX = opts.flipUvX;
            const flipY = opts.flipUvY;
            primitive.uvs.push(flipX ? 1 - uvs[u1 + 0] : uvs[u1 + 0], flipY ? 1 - uvs[u1 + 1] : uvs[u1 + 1]);
            primitive.uvs.push(flipX ? 1 - uvs[u2 + 0] : uvs[u2 + 0], flipY ? 1 - uvs[u2 + 1] : uvs[u2 + 1]);
            primitive.uvs.push(flipX ? 1 - uvs[u3 + 0] : uvs[u3 + 0], flipY ? 1 - uvs[u3 + 1] : uvs[u3 + 1]);
        }

        if (n1 !== undefined && n2 !== undefined && n3 !== undefined) {
            primitive.normals.push(normals[n1 + 0], normals[n1 + 1], normals[n1 + 2]);
            primitive.normals.push(normals[n2 + 0], normals[n2 + 1], normals[n2 + 2]);
            primitive.normals.push(normals[n3 + 0], normals[n3 + 1], normals[n3 + 2]);
        }
    }
};

const identity = <Value>(value: Value) => value;

type ResultType<Primitive extends InterleavedObjPrimitive | NonInterleavedObjPrimitive> = {
    objects: Record<string, ObjObject<Primitive>>;
};

export const modeMap = {
    'interleaved-number-array': {
        createPrimitive: createInterleavedPrimitive,
        handleFace: handleInterleavedFace,
        convertPrimitive: identity,
        ResultType: null as unknown as ResultType<InterleavedObjPrimitive<number[]>> & { info: InterleavedInfo },
    },
    'interleaved-typed-array': {
        createPrimitive: createInterleavedPrimitive,
        handleFace: handleInterleavedFace,
        convertPrimitive: convertInterleavedToTypedArray,
        ResultType: null as unknown as ResultType<InterleavedObjPrimitive<Float32Array>> & {
            info: InterleavedInfo;
        },
    },
    'interleaved-number-array-indexed': {
        createPrimitive: createInterleavedPrimitive,
        handleFace: handleInterleavedFace,
        convertPrimitive: convertInterleavedToIndexed,
        ResultType: null as unknown as ResultType<InterleavedObjPrimitiveIndexed<number[], number[]>> & {
            info: InterleavedInfo;
        },
    },
    'interleaved-typed-array-indexed': {
        createPrimitive: createInterleavedPrimitive,
        handleFace: handleInterleavedFace,
        convertPrimitive: (primitive: InterleavedObjPrimitive<number[]>, info: InterleavedInfo) =>
            convertInterleavedToTypedArray(convertInterleavedToIndexed(primitive, info)),
        ResultType: null as unknown as ResultType<InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>> & {
            info: InterleavedInfo;
        },
    },

    'non-interleaved-number-array': {
        createPrimitive: createNonInterleavedPrimitive,
        handleFace: handleNonInterleavedFace,
        convertPrimitive: identity,
        ResultType: null as unknown as ResultType<NonInterleavedObjPrimitive<number[]>>,
    },
    'non-interleaved-typed-array': {
        createPrimitive: createNonInterleavedPrimitive,
        handleFace: handleNonInterleavedFace,
        convertPrimitive: convertNonInterleavedToTypedArray,
        ResultType: null as unknown as ResultType<NonInterleavedObjPrimitive<Float32Array>>,
    },
    'non-interleaved-number-array-indexed': {
        createPrimitive: createNonInterleavedPrimitive,
        handleFace: handleNonInterleavedFace,
        convertPrimitive: convertNonInterleavedToIndexed,
        ResultType: null as unknown as ResultType<NonInterleavedObjPrimitiveIndexed<number[], number[]>>,
    },
    'non-interleaved-typed-array-indexed': {
        createPrimitive: createNonInterleavedPrimitive,
        handleFace: handleNonInterleavedFace,
        convertPrimitive: (primitive: NonInterleavedObjPrimitive<number[]>) =>
            convertNonInterleavedToTypedArray(convertNonInterleavedToIndexed(primitive)),
        ResultType: null as unknown as ResultType<NonInterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>>,
    },
};

export type ModeMap = typeof modeMap;
export type Mode = keyof ModeMap;
