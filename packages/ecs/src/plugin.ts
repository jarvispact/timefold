import { Component } from './component';
import { IndexTupleByName, Prettify } from './internal-utils';
import { CompiledQuery, GenericCompiledQuery, QueryTypeOptions, SupportedQuery } from './query';

export type CompiledPlugin<N extends string, QueriesByName extends Record<string, GenericCompiledQuery>> = {
    name: N;
    queries: QueriesByName;
    build: () => void;
};

export type GenericCompiledPlugin = CompiledPlugin<string, Record<string, GenericCompiledQuery>>;

type PluginBuilderApi<
    C extends Component,
    P extends CompiledPlugin<string, Record<string, GenericCompiledQuery>> = CompiledPlugin<
        string,
        NonNullable<unknown>
    >,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        name: <Name extends string>(
            name: Name,
        ) => PluginBuilderApi<C, CompiledPlugin<Name, NonNullable<unknown>>, 'name'>;
        withQueries: <Q extends CompiledQuery<string, SupportedQuery<C['type'], QueryTypeOptions | undefined>[]>[]>(
            ...queries: Q
        ) => PluginBuilderApi<C, CompiledPlugin<P['name'], IndexTupleByName<Q>>, 'name' | 'withQueries'>;
        compile: () => CompiledPlugin<P['name'], Prettify<P['queries']>>;
    },
    ForbiddenMethod
>;

export const PluginBuilder = <C extends Component>() => {
    const queries: Record<string, GenericCompiledQuery> = {};

    const plugin: CompiledPlugin<string, Record<string, GenericCompiledQuery>> = {
        name: '',
        queries,
        build: () => {},
    };

    const name = (name: string) => {
        plugin.name = name;
        return api;
    };

    const withQueries = (...queries: GenericCompiledQuery[]) => {
        for (const query of queries) {
            plugin.queries[query.name] = query;
        }
        return api;
    };

    const compile = () => plugin;

    const api = {
        name,
        withQueries,
        compile,
    };

    return api as unknown as PluginBuilderApi<C, CompiledPlugin<string, NonNullable<unknown>>, 'compile'>;
};
