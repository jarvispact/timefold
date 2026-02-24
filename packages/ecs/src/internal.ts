/* eslint-disable @typescript-eslint/no-explicit-any */

import { GenericCompiledPlugin } from './plugin';
import { GenericCompiledQuery } from './query';

export type Prettify<T extends Record<string, unknown>> = { [K in keyof T]: T[K] } & {};

export type RemoveReadonly<T> = { -readonly [K in keyof T]: T[K] };

export type Reverse<T extends unknown[], Result extends unknown[] = []> = T extends [infer Head, ...infer Tail]
    ? Reverse<Tail, [Head, ...Result]>
    : Result;

export type Schema<Uri extends string, Type> = {
    uri: Uri;
    is: (data: unknown) => data is Type;
    serialize: (data: Type) => string;
    deserialize: (data: string) => Type;
};

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

export type GetQueryTuplesFromPlugins<
    Plugins extends GenericCompiledPlugin[],
    Queries extends GenericCompiledQuery[] = [],
> = Plugins extends [infer Head extends GenericCompiledPlugin, ...infer Tail extends GenericCompiledPlugin[]]
    ? GetQueryTuplesFromPlugins<Tail, [...Queries, ...Head['queries']]>
    : Queries;
