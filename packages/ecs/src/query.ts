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

export type GenericCompiledQuery = CompiledQuery<string, boolean, GenericSupportedQuery>;

export type CompiledQuery<N extends string, IncludeEntity extends boolean, Q extends GenericSupportedQuery> = {
    name: N;
    includeEntity: IncludeEntity;
    types: Q;
};

type GetUsedComponentType<
    Q extends CompiledQuery<string, boolean, GenericSupportedQuery>,
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
    Q extends CompiledQuery<string, boolean, SupportedQuery<C['type'], WithOptions | undefined>[]> = CompiledQuery<
        string,
        boolean,
        []
    >,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        name: <Name extends string>(
            name: Name,
        ) => QueryBuilderApi<C, CompiledQuery<Name, Q['includeEntity'], Q['types']>, 'name' | 'without' | 'compile'>; // must start with at least one `with` or `includeEntity` after `name`.
        includeEntity: () => QueryBuilderApi<
            C,
            CompiledQuery<Q['name'], true, Q['types']>,
            'name' | 'includeEntity' | 'without' // After `includeEntity` you can only use `with` or `compile`
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
        compile: () => Q;
    },
    ForbiddenMethod
>;

export const query = <C extends Component>() => {
    const qry: CompiledQuery<string, boolean, SupportedQuery<C['type'], WithOptions | undefined>[]> = {
        name: '',
        includeEntity: false,
        types: [],
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

    const compile = () => qry;

    const api = {
        name,
        includeEntity,
        with: withType,
        without: withoutType,
        compile,
    };

    return api as unknown as QueryBuilderApi<
        C,
        CompiledQuery<string, boolean, []>,
        'includeEntity' | 'with' | 'without' | 'compile' // must start with `name`
    >;
};

export type InferQueryResultTuple<
    C extends Component,
    Q extends GenericCompiledQuery,
    ResultTuple extends unknown[] = [],
> = Q['types'] extends [infer Head, ...infer Tail extends GenericSupportedQuery]
    ? Head extends With<infer Type>
        ? Head extends { include: false }
            ? InferQueryResultTuple<C, CompiledQuery<Q['name'], Q['includeEntity'], Tail>, ResultTuple>
            : InferQueryResultTuple<
                  C,
                  CompiledQuery<Q['name'], Q['includeEntity'], Tail>,
                  [...ResultTuple, Extract<C, { type: Type }>]
              >
        : InferQueryResultTuple<C, CompiledQuery<Q['name'], Q['includeEntity'], Tail>, ResultTuple>
    : Q['includeEntity'] extends true
      ? [Entity, ...ResultTuple]
      : ResultTuple;
