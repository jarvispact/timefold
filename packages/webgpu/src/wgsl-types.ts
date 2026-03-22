/* eslint-disable @typescript-eslint/no-explicit-any */

import { InvalidArrayType, Prettify, ViewConfig, Views, WGSL_LOOKUP_TABLE } from './internal';
import { BufferMode, CreateModeToBufferInstance } from './wgsl-helpers';

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

export type WgslStructCreateResult<
    Struct extends WgslStruct<string, WgslStructDefinitionGeneric>,
    Mode extends BufferMode,
> = {
    data: CreateModeToBufferInstance[Mode];
    views: Views<Struct, Mode>;
};

export type WgslStruct<Name extends string, Definition extends WgslStructDefinitionGeneric> = {
    type: 'struct';
    name: Name;
    definition: Definition;

    bufferSize: number;
    viewConfig: ViewConfig<WgslStruct<Name, Definition>>;

    wgsl: string;

    create: <Mode extends BufferMode = 'array-buffer'>(
        mode?: Mode,
    ) => Prettify<WgslStructCreateResult<WgslStruct<Name, Definition>, Mode>>;
};

// sized array

export type WgslSizedArrayCreateResult<
    SizedArray extends WgslSizedArray<WgslArrayElementGeneric, number>,
    Mode extends BufferMode,
> = {
    data: CreateModeToBufferInstance[Mode];
    views: Views<SizedArray, Mode>;
};

export type WgslArrayElementGeneric = WgslArrayPrimitive | WgslSizedArray<any, any> | WgslStruct<string, any>;

export type WgslSizedArray<Element extends WgslArrayElementGeneric, Size extends number> = {
    type: 'sized-array';
    element: Element;
    size: Size;

    bufferSize: number;
    viewConfig: ViewConfig<WgslSizedArray<Element, Size>>;

    create: <Mode extends BufferMode = 'array-buffer'>(
        mode?: Mode,
    ) => Prettify<WgslSizedArrayCreateResult<WgslSizedArray<Element, Size>, Mode>>;
};

// runtime array

export type WgslRuntimeArrayCreateResult<RuntimeArray extends WgslRuntimeArray<any>, Mode extends BufferMode> = {
    data: CreateModeToBufferInstance[Mode];
    views: Views<RuntimeArray, Mode>;
};

export type WgslRuntimeArray<Element extends WgslArrayElementGeneric> = {
    type: 'runtime-array';
    element: Element;
    maxSize: number;

    bufferSize: number;
    viewConfig: ViewConfig<WgslRuntimeArray<Element>>;

    create: <Mode extends BufferMode = 'array-buffer'>(
        mode?: Mode,
    ) => Prettify<WgslRuntimeArrayCreateResult<WgslRuntimeArray<Element>, Mode>>;
};

// misc

export type GenericWgslType =
    | WgslPrimitive
    | WgslSizedArray<WgslArrayElementGeneric, number>
    | WgslStruct<string, WgslStructDefinitionGeneric>
    | WgslRuntimeArray<WgslArrayElementGeneric>;
