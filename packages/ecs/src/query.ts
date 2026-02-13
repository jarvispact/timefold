import { Component } from './component';

export type QueryTypeOptions = { include: false };

export type With<T extends number, O extends QueryTypeOptions | undefined = undefined> = O extends undefined
    ? { with: T }
    : { with: T; options: O };

export type Without<T extends number, O extends QueryTypeOptions | undefined = undefined> = O extends undefined
    ? { without: T }
    : { without: T; options: O };

export type SupportedQuery<T extends number, O extends QueryTypeOptions | undefined> = With<T, O> | Without<T, O>;

export type GenericCompiledQuery = CompiledQuery<string, SupportedQuery<number, QueryTypeOptions | undefined>[]>;

export type CompiledQuery<N extends string, Q extends SupportedQuery<number, QueryTypeOptions | undefined>[]> = {
    name: N;
    types: Q;
};

type GetUsedComponentType<
    Q extends CompiledQuery<string, SupportedQuery<number, QueryTypeOptions | undefined>[]>,
    Used extends number = never,
> = Q['types'] extends [
    infer First extends SupportedQuery<number, QueryTypeOptions | undefined>,
    ...infer Rest extends SupportedQuery<number, QueryTypeOptions | undefined>[],
]
    ? First extends With<infer Type>
        ? GetUsedComponentType<CompiledQuery<Q['name'], Rest>, Used | Type>
        : First extends Without<infer Type>
          ? GetUsedComponentType<CompiledQuery<Q['name'], Rest>, Used | Type>
          : GetUsedComponentType<CompiledQuery<Q['name'], Rest>, Used>
    : Used;

type QueryBuilderApi<
    C extends Component = Component,
    Q extends CompiledQuery<string, SupportedQuery<C['type'], QueryTypeOptions | undefined>[]> = CompiledQuery<
        string,
        []
    >,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        name: <Name extends string>(
            name: Name,
        ) => QueryBuilderApi<C, CompiledQuery<Name, Q['types']>, 'name' | 'without' | 'compile'>; // must start with at least one `with` after `name`.
        with: <
            Type extends Exclude<C['type'], GetUsedComponentType<Q>>,
            Options extends QueryTypeOptions | undefined = undefined,
        >(
            type: Type,
            options?: Options,
        ) => QueryBuilderApi<C, CompiledQuery<Q['name'], [...Q['types'], With<Type, Options>]>, 'name'>; // `name` can only be set once so its not allowed after the first `with`.
        without: <
            Type extends Exclude<C['type'], GetUsedComponentType<Q>>,
            Options extends QueryTypeOptions | undefined = undefined,
        >(
            type: Type,
            options?: Options,
        ) => QueryBuilderApi<C, CompiledQuery<Q['name'], [...Q['types'], Without<Type, Options>]>, 'name' | 'with'>; // After the first `without` both `name` and `with` are not allowed anymore.
        compile: () => Q;
    },
    ForbiddenMethod
>;

export const QueryBuilder = <C extends Component>() => {
    const query: CompiledQuery<string, SupportedQuery<C['type'], QueryTypeOptions | undefined>[]> = {
        name: '',
        types: [],
    };

    const name = (name: string) => {
        query.name = name;
        return api;
    };

    const withType = (type: number, options?: QueryTypeOptions) => {
        query.types.push({ with: type, options });
        return api;
    };

    const withoutType = (type: number, options?: QueryTypeOptions) => {
        query.types.push({ without: type, options });
        return api;
    };

    const compile = () => query;

    const api = {
        name,
        with: withType,
        without: withoutType,
        compile,
    };

    return api as unknown as QueryBuilderApi<C, CompiledQuery<string, []>, 'with' | 'without' | 'compile'>;
};
