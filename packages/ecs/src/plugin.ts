import { Component } from './component';
import { IndexTupleByName } from './internal';
import { CompiledQuery, GenericCompiledQuery, SupportedQuery, WithOptions } from './query';

export type GenericCompiledPlugin = CompiledPlugin<
    string,
    GenericCompiledQuery[],
    Record<string, GenericCompiledQuery>
>;

export type CompiledPlugin<
    Name extends string,
    Queries extends GenericCompiledQuery[],
    QueriesByName extends Record<string, GenericCompiledQuery> = IndexTupleByName<Queries>,
> = {
    name: Name;
    queries: Queries;
    getQuery: <QueryName extends Queries[number]['name']>(queryName: QueryName) => QueriesByName[QueryName];
};

type PluginBuilderApi<
    C extends Component,
    P extends GenericCompiledPlugin,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        name: <Name extends string>(name: Name) => PluginBuilderApi<C, CompiledPlugin<Name, []>, 'name'>;
        withQueries: <Q extends CompiledQuery<string, SupportedQuery<C['type'], WithOptions | undefined>[]>[]>(
            ...queries: Q
        ) => PluginBuilderApi<C, CompiledPlugin<P['name'], Q>, 'name' | 'withQueries'>;
        compile: () => P;
    },
    ForbiddenMethod
>;

export const plugin = <C extends Component>() => {
    const queryTuple: GenericCompiledQuery[] = [];
    const queriesByName: Record<string, GenericCompiledQuery> = {};

    const plugin: GenericCompiledPlugin = {
        name: '',
        queries: queryTuple,
        getQuery: (name) => queriesByName[name],
    };

    const name = (name: string) => {
        plugin.name = name;
        return api;
    };

    const withQueries = (...queries: GenericCompiledQuery[]) => {
        for (const qry of queries) {
            queryTuple.push(qry);
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

    return api as unknown as PluginBuilderApi<C, CompiledPlugin<string, []>, 'withQueries' | 'compile'>;
};
