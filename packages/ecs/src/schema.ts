/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prettify, RemoveReadonly, Schema } from './internal';

// primitive

export type NumberSchema = Schema<'number', number>;

export const number: NumberSchema = {
    uri: 'number',
    is: (data): data is number => typeof data === 'number',
    serialize: (data) => data.toString(),
    deserialize: (data) => Number.parseFloat(data),
};

export type StringSchema = Schema<'string', string>;

export const string: StringSchema = {
    uri: 'string',
    is: (data): data is string => typeof data === 'string',
    serialize: (data) => data,
    deserialize: (data) => data,
};

// typed arrays

export type Uint8ClampedArraySchema = Schema<'Uint8ClampedArray', Uint8ClampedArray>;

export const uint8ClampedArray: Uint8ClampedArraySchema = {
    uri: 'Uint8ClampedArray',
    is: (data): data is Uint8ClampedArray => data instanceof Uint8ClampedArray,
    serialize: (data) => `Uint8ClampedArray(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Uint8ClampedArray(JSON.parse(data.replace('Uint8ClampedArray(', '').replace(')', ''))),
};

export type Uint8ArraySchema = Schema<'Uint8Array', Uint8Array>;

export const uint8Array: Uint8ArraySchema = {
    uri: 'Uint8Array',
    is: (data): data is Uint8Array => data instanceof Uint8Array,
    serialize: (data) => `Uint8Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Uint8Array(JSON.parse(data.replace('Uint8Array(', '').replace(')', ''))),
};

export type Int8ArraySchema = Schema<'Int8Array', Int8Array>;

export const int8Array: Int8ArraySchema = {
    uri: 'Int8Array',
    is: (data): data is Int8Array => data instanceof Int8Array,
    serialize: (data) => `Int8Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Int8Array(JSON.parse(data.replace('Int8Array(', '').replace(')', ''))),
};

export type Uint16ArraySchema = Schema<'Uint16Array', Uint16Array>;

export const uint16Array: Uint16ArraySchema = {
    uri: 'Uint16Array',
    is: (data): data is Uint16Array => data instanceof Uint16Array,
    serialize: (data) => `Uint16Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Uint16Array(JSON.parse(data.replace('Uint16Array(', '').replace(')', ''))),
};

export type Int16ArraySchema = Schema<'Int16Array', Int16Array>;

export const int16Array: Int16ArraySchema = {
    uri: 'Int16Array',
    is: (data): data is Int16Array => data instanceof Int16Array,
    serialize: (data) => `Int16Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Int16Array(JSON.parse(data.replace('Int16Array(', '').replace(')', ''))),
};

export type Uint32ArraySchema = Schema<'Uint32Array', Uint32Array>;

export const uint32Array: Uint32ArraySchema = {
    uri: 'Uint32Array',
    is: (data): data is Uint32Array => data instanceof Uint32Array,
    serialize: (data) => `Uint32Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Uint32Array(JSON.parse(data.replace('Uint32Array(', '').replace(')', ''))),
};

export type Int32ArraySchema = Schema<'Int32Array', Int32Array>;

export const int32Array: Int32ArraySchema = {
    uri: 'Int32Array',
    is: (data): data is Int32Array => data instanceof Int32Array,
    serialize: (data) => `Int32Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Int32Array(JSON.parse(data.replace('Int32Array(', '').replace(')', ''))),
};

export type Float32ArraySchema = Schema<'Float32Array', Float32Array>;

export const float32Array: Float32ArraySchema = {
    uri: 'Float32Array',
    is: (data): data is Float32Array => data instanceof Float32Array,
    serialize: (data) => `Float32Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Float32Array(JSON.parse(data.replace('Float32Array(', '').replace(')', ''))),
};

export type Float64ArraySchema = Schema<'Float64Array', Float64Array>;

export const float64Array: Float64ArraySchema = {
    uri: 'Float64Array',
    is: (data): data is Float64Array => data instanceof Float64Array,
    serialize: (data) => `Float64Array(${JSON.stringify(Array.from(data))})`,
    deserialize: (data) => new Float64Array(JSON.parse(data.replace('Float64Array(', '').replace(')', ''))),
};

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

// typedarray

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
