/* eslint-disable @typescript-eslint/no-explicit-any */

import { WgslType } from './lookup-table';
import { ArrayElement } from './wgsl-array';
import { Type as _Type, type as _type, CreateResult as TypeCreateResult } from './wgsl-type';
import { Array as _Array, array as _array, CreateResult as ArrayCreateResult } from './wgsl-array';
// import { Builtin as _Builtin, builtin as _builtin, BuiltinName } from './wgsl-builtin';
import {
    Struct as _Struct,
    struct as _struct,
    GenericStructDefinition,
    CreateResult as StructCreateResult,
} from './wgsl-struct';
import { GenericMode } from './internal-utils';

// type

export type Type<T extends WgslType> = _Type<T>;

export type InferTypeResult<T extends _Type<WgslType>, Mode extends GenericMode = 'array-buffer'> =
    T extends _Type<infer WT> ? TypeCreateResult<Mode, WT>['view'] : never;

export const type = _type;

// array

export type Array<Element extends ArrayElement, Size extends number> = _Array<Element, Size>;

export type InferArrayResult<T extends _Array<ArrayElement, any>, Mode extends GenericMode = 'array-buffer'> =
    T extends _Array<infer Element, infer Size> ? ArrayCreateResult<Element, Size, Mode>['views'] : never;

export const array = _array;

// struct

export type Struct<Name extends string, Definition extends GenericStructDefinition> = _Struct<Name, Definition>;

export type InferStructResult<T extends _Struct<string, any>, Mode extends GenericMode = 'array-buffer'> =
    T extends _Struct<string, infer Definition> ? StructCreateResult<Definition, Mode>['views'] : never;

export const struct = _struct;

// builtin

// export type Builtin<Name extends BuiltinName> = _Builtin<Name>;

// export const builtin = _builtin;
