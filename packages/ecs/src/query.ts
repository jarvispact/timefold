import { Component } from './component';
import { Prettify } from './internal';

export type WithOptions = { include: false };

export type With<T extends number, O extends WithOptions | undefined = undefined> = O extends undefined
    ? { with: T }
    : Prettify<{ with: T } & O>;

export type Without<T extends number> = Prettify<{ without: T }>;

export type SupportedQuery<T extends number, O extends WithOptions | undefined> = With<T, O> | Without<T>;

export type GenericCompiledQuery = CompiledQuery<string, SupportedQuery<number, WithOptions | undefined>[]>;

export type CompiledQuery<N extends string, Q extends SupportedQuery<number, WithOptions | undefined>[]> = {
    name: N;
    types: Q;
};

type GetUsedComponentType<
    Q extends CompiledQuery<string, SupportedQuery<number, WithOptions | undefined>[]>,
    Used extends number = never,
> = Q['types'] extends [
    infer First extends SupportedQuery<number, WithOptions | undefined>,
    ...infer Rest extends SupportedQuery<number, WithOptions | undefined>[],
]
    ? First extends With<infer Type>
        ? GetUsedComponentType<CompiledQuery<Q['name'], Rest>, Used | Type>
        : First extends Without<infer Type>
          ? GetUsedComponentType<CompiledQuery<Q['name'], Rest>, Used | Type>
          : GetUsedComponentType<CompiledQuery<Q['name'], Rest>, Used>
    : Used;

type QueryBuilderApi<
    C extends Component = Component,
    Q extends CompiledQuery<string, SupportedQuery<C['type'], WithOptions | undefined>[]> = CompiledQuery<string, []>,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        name: <Name extends string>(
            name: Name,
        ) => QueryBuilderApi<C, CompiledQuery<Name, Q['types']>, 'name' | 'without' | 'compile'>; // must start with at least one `with` after `name`.
        with: <
            Type extends Exclude<C['type'], GetUsedComponentType<Q>>,
            Options extends WithOptions | undefined = undefined,
        >(
            type: Type,
            options?: Options,
        ) => QueryBuilderApi<C, CompiledQuery<Q['name'], [...Q['types'], With<Type, Options>]>, 'name'>; // `name` can only be set once so its not allowed after the first `with`.
        without: <Type extends Exclude<C['type'], GetUsedComponentType<Q>>>(
            type: Type,
        ) => QueryBuilderApi<C, CompiledQuery<Q['name'], [...Q['types'], Without<Type>]>, 'name' | 'with'>; // After the first `without` both `name` and `with` are not allowed anymore.
        compile: () => Q;
    },
    ForbiddenMethod
>;

export const query = <C extends Component>() => {
    const qry: CompiledQuery<string, SupportedQuery<C['type'], WithOptions | undefined>[]> = {
        name: '',
        types: [],
    };

    const name = (name: string) => {
        qry.name = name;
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
        with: withType,
        without: withoutType,
        compile,
    };

    return api as unknown as QueryBuilderApi<C, CompiledQuery<string, []>, 'with' | 'without' | 'compile'>;
};
