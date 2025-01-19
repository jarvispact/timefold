import { Mode, ModeMap } from './internal-utils';

export type MtlMaterial = {
    name: string;
    ambientColor: [number, number, number];
    diffuseColor: [number, number, number];
    specularColor: [number, number, number];
    specularExponent: number;
    ambientMapPath: string | undefined;
    diffuseMapPath: string | undefined;
    specularMapPath: string | undefined;
    normalMapPath: string | undefined;
};

export type MtlParserResult = { materials: Record<string, MtlMaterial> };

export type InterleavedInfo = {
    stride: number;
    positionOffset: number;
    uvOffset: number;
    normalOffset: number;
};

type GenericVertices = number[] | Float32Array;
type GenericIndices = number[] | Uint32Array;

export type InterleavedObjPrimitive<Vertices extends GenericVertices = GenericVertices> = {
    name: string;
    vertices: Vertices;
};

export type InterleavedObjPrimitiveIndexed<
    Vertices extends GenericVertices = GenericVertices,
    Indices extends GenericIndices = GenericIndices,
> = InterleavedObjPrimitive<Vertices> & {
    indices: Indices;
};

export type NonInterleavedObjPrimitive<Vertices extends GenericVertices = GenericVertices> = {
    name: string;
    positions: Vertices;
    uvs: Vertices;
    normals: Vertices;
};

export type NonInterleavedObjPrimitiveIndexed<
    Vertices extends GenericVertices = GenericVertices,
    Indices extends GenericIndices = GenericIndices,
> = NonInterleavedObjPrimitive<Vertices> & {
    indices: Indices;
};

type GenericPrimitive =
    | InterleavedObjPrimitive
    | InterleavedObjPrimitiveIndexed
    | NonInterleavedObjPrimitive
    | NonInterleavedObjPrimitiveIndexed;

export type ObjObject<Primitive extends GenericPrimitive = GenericPrimitive> = {
    name: string;
    primitives: Record<string, Primitive>;
};

export type ParserOptions = {
    mode: Mode;
    splitObjectMode: 'object' | 'group';
    flipUvX: boolean;
    flipUvY: boolean;
};

type DefaultMode = 'interleaved-typed-array-indexed';

export type ObjParserResult<Options extends Partial<ParserOptions>> =
    Partial<ParserOptions> extends Options
        ? ModeMap[DefaultMode]['ResultType']
        : ModeMap[Exclude<Options['mode'], undefined>]['ResultType'];
