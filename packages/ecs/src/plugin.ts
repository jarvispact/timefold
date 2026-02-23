import { Component } from './component';
import { IndexTupleByName } from './internal';
import { CompiledQuery, GenericCompiledQuery, SupportedQuery, WithOptions } from './query';

export type GenericCompiledPlugin = CompiledPlugin<string, Record<string, GenericCompiledQuery>>;

export type CompiledPlugin<Name extends string, QueriesByName extends Record<string, GenericCompiledQuery>> = {
    name: Name;
    getQuery: <QueryName extends keyof QueriesByName>(queryName: QueryName) => QueriesByName[QueryName];
};

type PluginBuilderApi<
    C extends Component,
    P extends GenericCompiledPlugin,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        name: <Name extends string>(
            name: Name,
        ) => PluginBuilderApi<C, CompiledPlugin<Name, NonNullable<unknown>>, 'name'>;
        withQueries: <Q extends CompiledQuery<string, SupportedQuery<C['type'], WithOptions | undefined>[]>[]>(
            ...queries: Q
        ) => PluginBuilderApi<C, CompiledPlugin<P['name'], IndexTupleByName<Q>>, 'name' | 'withQueries'>;
        compile: () => P;
    },
    ForbiddenMethod
>;

export const plugin = <C extends Component>() => {
    const queriesByName: Record<string, GenericCompiledQuery> = {};

    const plugin: GenericCompiledPlugin = {
        name: '',
        getQuery: (name) => queriesByName[name],
    };

    const name = (name: string) => {
        plugin.name = name;
        return api;
    };

    const withQueries = (...queries: GenericCompiledQuery[]) => {
        for (const qry of queries) {
            queriesByName[qry.name] = qry;
        }

        return api;
    };

    const compile = () => plugin;

    const api = {
        name,
        withQueries,
        compile,
    };

    return api as unknown as PluginBuilderApi<
        C,
        CompiledPlugin<string, NonNullable<unknown>>,
        'withQueries' | 'compile'
    >;
};
