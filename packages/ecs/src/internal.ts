/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema } from './schema';

export type Prettify<T extends Record<string, unknown>> = { [K in keyof T]: T[K] } & {};

export type RemoveReadonly<T> = { -readonly [K in keyof T]: T[K] };

export type Reverse<T extends unknown[], Result extends unknown[] = []> = T extends [infer Head, ...infer Tail]
    ? Reverse<Tail, [Head, ...Result]>
    : Result;

export type GenericComponentDefinition = { name: string; definition?: Schema<string, any> };

export type IndexTupleByName<
    T extends { name: string }[],
    ByName extends Record<string, unknown> = NonNullable<unknown>,
> = T extends [infer First extends { name: string }, ...infer Rest extends { name: string }[]]
    ? IndexTupleByName<Rest, ByName & Record<First['name'], First>>
    : ByName;

export const indexTupleByName = (tuple: { name: string }[]) => {
    const result: Record<string, unknown> = {};

    for (const item of tuple) {
        result[item.name] = item;
    }

    return result;
};

export type TupleOfLength<Length extends number, Type, Result extends Type[] = []> = Length extends Result['length']
    ? Result
    : TupleOfLength<Length, Type, [...Result, Type]>;
