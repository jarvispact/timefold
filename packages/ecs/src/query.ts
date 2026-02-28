/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component } from './component';
import { Entity } from './entity';
import { Prettify } from './internal';

export type WithOptions = { include: false };

export type With<T extends number, O extends WithOptions | undefined = undefined> = O extends undefined
    ? { with: T }
    : Prettify<{ with: T } & O>;

export type Without<T extends number> = Prettify<{ without: T }>;

export type GenericSupportedQuery = SupportedQuery<number, WithOptions | undefined>[];

export type SupportedQuery<T extends number, O extends WithOptions | undefined> = With<T, O> | Without<T>;

export type GenericCompiledQuery = CompiledQuery<string, boolean, GenericSupportedQuery, any>;

export type CompiledQuery<
    N extends string,
    IncludeEntity extends boolean,
    Q extends GenericSupportedQuery,
    MappedResult = undefined,
> = {
    name: N;
    includeEntity: IncludeEntity;
    types: Q;
    mapFn: (tuple: any) => MappedResult;
};

type GetUsedComponentType<
    Q extends CompiledQuery<string, boolean, GenericSupportedQuery, any>,
    Used extends number = never,
> = Q['types'] extends [
    infer First extends SupportedQuery<number, WithOptions | undefined>,
    ...infer Rest extends GenericSupportedQuery,
]
    ? First extends With<infer Type>
        ? GetUsedComponentType<CompiledQuery<Q['name'], Q['includeEntity'], Rest>, Used | Type>
        : First extends Without<infer Type>
          ? GetUsedComponentType<CompiledQuery<Q['name'], Q['includeEntity'], Rest>, Used | Type>
          : GetUsedComponentType<CompiledQuery<Q['name'], Q['includeEntity'], Rest>, Used>
    : Used;

type QueryBuilderApi<
    C extends Component = Component,
    Q extends CompiledQuery<string, boolean, SupportedQuery<C['type'], WithOptions | undefined>[], any> = CompiledQuery<
        string,
        boolean,
        []
    >,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        name: <Name extends string>(
            name: Name,
        ) => QueryBuilderApi<
            C,
            CompiledQuery<Name, Q['includeEntity'], Q['types']>,
            'name' | 'without' | 'compile' | 'map'
        >; // must start with at least one `with` or `includeEntity` after `name`.
        includeEntity: () => QueryBuilderApi<
            C,
            CompiledQuery<Q['name'], true, Q['types']>,
            'name' | 'includeEntity' // After `includeEntity` you can only use `with`, `without`, `map` or `compile`
        >;
        with: <
            Type extends Exclude<C['type'], GetUsedComponentType<Q>>,
            Options extends WithOptions | undefined = undefined,
        >(
            type: Type,
            options?: Options,
        ) => QueryBuilderApi<
            C,
            CompiledQuery<Q['name'], Q['includeEntity'], [...Q['types'], With<Type, Options>]>,
            'name' | 'includeEntity' // `name` can only be set once so its not allowed after the first `with`.
        >;
        without: <Type extends Exclude<C['type'], GetUsedComponentType<Q>>>(
            type: Type,
        ) => QueryBuilderApi<
            C,
            CompiledQuery<Q['name'], Q['includeEntity'], [...Q['types'], Without<Type>]>,
            'name' | 'with' | 'includeEntity' // After the first `without` both `name` and `with` are not allowed anymore.
        >;
        map: <R>(
            fn: (tuple: InferRawResultTuple<C, Q>) => R,
        ) => QueryBuilderApi<
            C,
            CompiledQuery<Q['name'], Q['includeEntity'], Q['types'], R>,
            'name' | 'includeEntity' | 'with' | 'without' | 'map'
        >;
        compile: () => Q;
    },
    ForbiddenMethod
>;

const identity = (x: any) => x;

export const query = <C extends Component>() => {
    const qry: CompiledQuery<string, boolean, SupportedQuery<C['type'], WithOptions | undefined>[]> = {
        name: '',
        includeEntity: false,
        types: [],
        mapFn: identity,
    };

    const name = (name: string) => {
        qry.name = name;
        return api;
    };

    const includeEntity = () => {
        qry.includeEntity = true;
        return api;
    };

    const withType = (type: number, options?: WithOptions) => {
        qry.types.push({ with: type, ...options });
        return api;
    };

    const withoutType = (type: number) => {
        qry.types.push({ without: type });
        return api;
    };

    const map = (fn: (tuple: any) => any) => {
        qry.mapFn = fn;
        return api;
    };

    const compile = () => qry;

    const api = {
        name,
        includeEntity,
        with: withType,
        without: withoutType,
        map,
        compile,
    };

    return api as unknown as QueryBuilderApi<
        C,
        CompiledQuery<string, boolean, []>,
        'includeEntity' | 'with' | 'without' | 'compile' | 'map' // must start with `name`
    >;
};

type InferRawResultTuple<
    C extends Component,
    Q extends GenericCompiledQuery,
    ResultTuple extends unknown[] = [],
> = Q['types'] extends [infer Head, ...infer Tail extends GenericSupportedQuery]
    ? Head extends With<infer Type>
        ? Head extends { include: false }
            ? InferRawResultTuple<C, CompiledQuery<Q['name'], Q['includeEntity'], Tail>, ResultTuple>
            : InferRawResultTuple<
                  C,
                  CompiledQuery<Q['name'], Q['includeEntity'], Tail>,
                  [...ResultTuple, Extract<C, { type: Type }>]
              >
        : InferRawResultTuple<C, CompiledQuery<Q['name'], Q['includeEntity'], Tail>, ResultTuple>
    : Q['includeEntity'] extends true
      ? [Entity, ...ResultTuple]
      : ResultTuple;

export type InferQueryResultTuple<C extends Component, Q extends GenericCompiledQuery> =
    Q extends CompiledQuery<string, boolean, GenericSupportedQuery, infer MR>
        ? [MR] extends [undefined]
            ? InferRawResultTuple<C, Q>
            : MR
        : never;
