/* eslint-disable @typescript-eslint/no-explicit-any */

import { InvalidArrayType, ViewConfig, WGSL_LOOKUP_TABLE } from './internal';

// primitive

type WgslLookupTable = typeof WGSL_LOOKUP_TABLE;
export type WgslPrimitive = keyof WgslLookupTable;
export type WgslArrayPrimitive = Exclude<WgslPrimitive, InvalidArrayType>;
export type WgslScalar = 'f32' | 'i32' | 'u32';

// struct

export type StructDefinitionValueGeneric =
    | WgslPrimitive
    | WgslSizedArray<WgslArrayElementGeneric, any>
    | WgslStruct<string, any>;

export type WgslStructDefinitionGeneric = Record<string, StructDefinitionValueGeneric>;

export type WgslStructGetWgslOptions = { expandNested?: boolean };

export type WgslStruct<Name extends string, Definition extends WgslStructDefinitionGeneric> = {
    type: 'struct';
    name: Name;
    definition: Definition;

    bufferSize: number;
    viewConfig: ViewConfig<WgslStruct<Name, Definition>>;

    getWgsl: (options?: WgslStructGetWgslOptions) => string;
};

// sized array

export type WgslArrayElementGeneric = WgslArrayPrimitive | WgslSizedArray<any, any> | WgslStruct<string, any>;

export type WgslSizedArray<Element extends WgslArrayElementGeneric, Size extends number> = {
    type: 'sized-array';
    element: Element;
    size: Size;

    bufferSize: number;
    viewConfig: ViewConfig<WgslSizedArray<Element, Size>>;
};

// runtime array

export type WgslRuntimeArray<Element extends WgslArrayElementGeneric> = {
    type: 'runtime-array';
    element: Element;
    maxSize: number;

    bufferSize: number;
    viewConfig: ViewConfig<WgslRuntimeArray<Element>>;
};

// misc

export type GenericWgslType =
    | WgslPrimitive
    | WgslSizedArray<WgslArrayElementGeneric, any>
    | WgslStruct<string, any>
    | WgslRuntimeArray<WgslArrayElementGeneric>;
