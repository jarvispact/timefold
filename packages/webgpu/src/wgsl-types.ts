/* eslint-disable @typescript-eslint/no-explicit-any */

import { InvalidArrayType, WGSL_LOOKUP_TABLE } from './internal';

// primitive

type WgslLookupTable = typeof WGSL_LOOKUP_TABLE;
export type WgslPrimitive = keyof WgslLookupTable;
export type WgslArrayPrimitive = Exclude<WgslPrimitive, InvalidArrayType>;

// struct

type StructDefinitionValueGeneric =
    | WgslPrimitive
    | WgslSizedArray<WgslArrayElementGeneric, any>
    | WgslStruct<string, any>;

export type WgslStructDefinitionGeneric = Record<string, StructDefinitionValueGeneric>;

export type WgslGetWgslParam = 'uniform-declaration' | 'struct-declaration';

export type WgslStruct<Name extends string, Definition extends WgslStructDefinitionGeneric> = {
    type: 'struct';
    name: Name;
    definition: Definition;
    byteSize: number;
    getWgsl: (which: WgslGetWgslParam) => string;
};

// sized array

export type WgslArrayElementGeneric = WgslArrayPrimitive | WgslSizedArray<any, any> | WgslStruct<string, any>;

export type WgslSizedArray<Element extends WgslArrayElementGeneric, Size extends number> = {
    type: 'sized-array';
    element: Element;
    size: Size;
    byteSize: number;
    getWgsl: (which: WgslGetWgslParam) => string;
};

// runtime array

export type WgslRuntimeArray<Element extends WgslArrayElementGeneric> = {
    type: 'runtime-array';
    element: Element;
    maxSize: number;
    byteSize: number;
    getWgsl: (which: WgslGetWgslParam) => string;
};
