/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prettify, RemoveReadonly, Schema } from './internal';

// primitive

const uriToPrimitiveDeserialize = {
    number: (data: string) => Number.parseFloat(data),
    string: (data: string) => data,
    boolean: (data: string) => data === 'true',
};

type StringToPrimitiveDeserialize = typeof uriToPrimitiveDeserialize;

const primitiveSchema = <Uri extends keyof StringToPrimitiveDeserialize>(
    uri: Uri,
): Schema<Uri, ReturnType<StringToPrimitiveDeserialize[Uri]>> => {
    return {
        uri,
        is: (data): data is ReturnType<StringToPrimitiveDeserialize[Uri]> => typeof data === uri,
        serialize: (data) => data.toString(),
        deserialize: (data: string) =>
            uriToPrimitiveDeserialize[uri](data) as ReturnType<StringToPrimitiveDeserialize[Uri]>,
    };
};

export type NumberSchema = Schema<'number', number>;
export const number = primitiveSchema('number');

export type StringSchema = Schema<'string', string>;
export const string = primitiveSchema('string');

export type BooleanSchema = Schema<'boolean', boolean>;
export const boolean = primitiveSchema('boolean');

// typed arrays

const uriToTypedArrayConstructors = {
    Uint8ClampedArray: Uint8ClampedArray<ArrayBufferLike>,
    Uint8Array: Uint8Array<ArrayBufferLike>,
    Int8Array: Int8Array<ArrayBufferLike>,
    Uint16Array: Uint16Array<ArrayBufferLike>,
    Int16Array: Int16Array<ArrayBufferLike>,
    Uint32Array: Uint32Array<ArrayBufferLike>,
    Int32Array: Int32Array<ArrayBufferLike>,
    Float32Array: Float32Array<ArrayBufferLike>,
    Float64Array: Float64Array<ArrayBufferLike>,
};

const typedArraySchema = <Uri extends keyof typeof uriToTypedArrayConstructors>(
    uri: Uri,
): Schema<Uri, InstanceType<(typeof uriToTypedArrayConstructors)[Uri]>> => {
    return {
        uri,
        is: (data): data is InstanceType<(typeof uriToTypedArrayConstructors)[Uri]> =>
            data instanceof uriToTypedArrayConstructors[uri],
        serialize: (data) => `${uri}(${JSON.stringify(Array.from(data))})`,
        deserialize: (data) =>
            new uriToTypedArrayConstructors[uri](
                JSON.parse(data.replace(`${uri}(`, '').replace(')', '')) as never,
            ) as InstanceType<(typeof uriToTypedArrayConstructors)[Uri]>,
    };
};

export type Uint8ClampedArraySchema = Schema<'Uint8ClampedArray', Uint8ClampedArray>;
export const uint8ClampedArray = typedArraySchema('Uint8ClampedArray');

export type Uint8ArraySchema = Schema<'Uint8Array', Uint8Array>;
export const uint8Array = typedArraySchema('Uint8Array');

export type Int8ArraySchema = Schema<'Int8Array', Int8Array>;
export const int8Array = typedArraySchema('Int8Array');

export type Uint16ArraySchema = Schema<'Uint16Array', Uint16Array>;
export const uint16Array = typedArraySchema('Uint16Array');

export type Int16ArraySchema = Schema<'Int16Array', Int16Array>;
export const int16Array = typedArraySchema('Int16Array');

export type Uint32ArraySchema = Schema<'Uint32Array', Uint32Array>;
export const uint32Array = typedArraySchema('Uint32Array');

export type Int32ArraySchema = Schema<'Int32Array', Int32Array>;
export const int32Array = typedArraySchema('Int32Array');

export type Float32ArraySchema = Schema<'Float32Array', Float32Array>;
export const float32Array = typedArraySchema('Float32Array');

export type Float64ArraySchema = Schema<'Float64Array', Float64Array>;
export const float64Array = typedArraySchema('Float64Array');

// tuple

type GenericTupleItems = Schema<string, any>[];
type InferItemType<Item> = Item extends Schema<string, infer Type> ? Type : never;

export type TupleSchema<Items extends GenericTupleItems> = Schema<
    'tuple',
    { [K in keyof Items]: InferItemType<Items[K]> }
>;

export const tuple = <const Items extends GenericTupleItems>(...items: Items): TupleSchema<Items> => {
    return {
        uri: 'tuple',
        is: (data): data is { [K in keyof Items]: InferItemType<Items[K]> } => {
            if (!Array.isArray(data) || data.length !== items.length) {
                return false;
            }

            for (let i = 0; i < items.length; i++) {
                if (!items[i].is(data[i])) {
                    return false;
                }
            }

            return true;
        },
        serialize: (data) => {
            const serializedItems = items.map((item, index) => item.serialize(data[index]));
            return JSON.stringify(serializedItems);
        },
        deserialize: (data) => {
            const deserializedData = JSON.parse(data) as string[];
            return deserializedData.map((item, index) => items[index].deserialize(item) as unknown) as {
                [K in keyof Items]: InferItemType<Items[K]>;
            };
        },
    };
};

// union

type GenericUnionItems = Schema<string, any>[];
export type UnionSchema<Options extends GenericUnionItems> = Schema<'union', InferItemType<Options[number]>>;

export const union = <const Options extends GenericUnionItems>(...options: Options): UnionSchema<Options> => {
    return {
        uri: 'union',
        is: (data): data is InferItemType<Options[number]> => {
            for (const option of options) {
                if (option.is(data)) {
                    return true;
                }
            }
            return false;
        },
        serialize: (data) => {
            for (const option of options) {
                if (option.is(data)) {
                    return option.serialize(data);
                }
            }

            return '<invalid data>';
        },
        deserialize: (data) => {
            for (const option of options) {
                if (option.is(data)) {
                    return option.deserialize(data) as unknown as InferItemType<Options[number]>;
                }
            }

            return '<invalid data>' as unknown as InferItemType<Options[number]>;
        },
    };
};

// typedArray

export type TypedArraySchema = UnionSchema<
    [
        Uint8ClampedArraySchema,
        Uint8ArraySchema,
        Int8ArraySchema,
        Uint16ArraySchema,
        Int16ArraySchema,
        Uint32ArraySchema,
        Int32ArraySchema,
        Float32ArraySchema,
        Float64ArraySchema,
    ]
>;

export const typedArray: TypedArraySchema = union(
    uint8ClampedArray,
    uint8Array,
    int8Array,
    uint16Array,
    int16Array,
    uint32Array,
    int32Array,
    float32Array,
    float64Array,
);

// struct

type GenericStructFields = Record<string, Schema<string, any>>;
type InferFieldValue<Field> = Field extends Schema<string, infer Type> ? Type : never;

export type StructSchema<Uri extends string, Fields extends GenericStructFields> = Schema<
    Uri,
    { [K in keyof Fields]: InferFieldValue<Fields[K]> }
>;

export const struct = <Uri extends string, const Fields extends GenericStructFields>(
    uri: Uri,
    fields: Fields,
): StructSchema<Uri, Fields> => {
    return {
        uri,
        is: (data): data is { [K in keyof Fields]: InferFieldValue<Fields[K]> } => {
            if (typeof data !== 'object' || data === null) {
                return false;
            }

            for (const key in fields) {
                if (!fields[key].is((data as Record<string, unknown>)[key])) {
                    return false;
                }
            }

            return true;
        },
        serialize: (data) => {
            const serializedFields: Record<string, string> = {};

            for (const key in fields) {
                serializedFields[key] = fields[key].serialize(data[key]);
            }

            return JSON.stringify(serializedFields);
        },
        deserialize: (data) => {
            const deserializedData = JSON.parse(data) as Record<string, string>;
            const result: Record<string, unknown> = {};

            for (const key in fields) {
                result[key] = fields[key].deserialize(deserializedData[key]);
            }

            return result as { [K in keyof Fields]: InferFieldValue<Fields[K]> };
        },
    };
};

export type InferSchemaType<S> = S extends Schema<string, infer Type> ? Prettify<RemoveReadonly<Type>> : never;
