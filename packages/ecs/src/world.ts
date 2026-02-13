import { Component } from './component';
import { IndexTupleByName } from './internal-utils';
import { GenericCompiledPlugin } from './plugin';
import { CompiledQuery, GenericCompiledQuery, QueryTypeOptions, SupportedQuery } from './query';

export type CompiledWorld<
    C extends Component,
    PluginsByName extends Record<string, GenericCompiledPlugin>,
    QueriesByName extends Record<string, GenericCompiledQuery>,
> = {
    plugins: PluginsByName;
    queries: QueriesByName;
    createEntity: () => number;
    spawn: (entity: number, components: C[]) => void;
    getComponent: <T extends C['type']>(entity: number, type: T) => Extract<C, { type: T }> | undefined;
};

type CreateWorldArgs<PluginsByName, QueriesByName> = {
    plugins: PluginsByName;
    queries: QueriesByName;
};

const createWorld = <
    C extends Component,
    PluginsByName extends Record<string, GenericCompiledPlugin>,
    QueriesByName extends Record<string, GenericCompiledQuery>,
>(
    args: CreateWorldArgs<PluginsByName, QueriesByName>,
): CompiledWorld<C, PluginsByName, QueriesByName> => {
    let entityCounter = 0;
    const componentsByEntity = new Map<number, Map<number, C | undefined> | undefined>();

    const createEntity = () => entityCounter++;

    const spawn = (entity: number, components: Component[]) => {
        if (!componentsByEntity.has(entity)) {
            componentsByEntity.set(entity, new Map());
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const entityComponents = componentsByEntity.get(entity)!;
        for (const component of components) {
            entityComponents.set(component.type, component as C);
        }
    };

    const getComponent = (entity: number, type: Component['type']) => {
        const components = componentsByEntity.get(entity);
        if (!components) return undefined;
        return components.get(type) as Extract<C, { type: typeof type }> | undefined;
    };

    return {
        plugins: args.plugins,
        queries: args.queries,
        createEntity,
        spawn,
        getComponent,
    } as CompiledWorld<C, PluginsByName, QueriesByName>;
};

type WorldBuilderApi<
    C extends Component,
    PluginsByName extends Record<string, GenericCompiledPlugin>,
    QueriesByName extends Record<string, GenericCompiledQuery>,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        withPlugins: <P extends GenericCompiledPlugin[]>(
            ...plugins: P
        ) => WorldBuilderApi<C, IndexTupleByName<P>, QueriesByName, 'withPlugins'>;
        withQueries: <Q extends CompiledQuery<string, SupportedQuery<C['type'], QueryTypeOptions | undefined>[]>[]>(
            ...queries: Q
        ) => WorldBuilderApi<C, PluginsByName, IndexTupleByName<Q>, 'withQueries'>;
        compile: () => CompiledWorld<C, PluginsByName, QueriesByName>;
    },
    ForbiddenMethod
>;

export const WorldBuilder = <C extends Component>() => {
    const args: CreateWorldArgs<Record<string, GenericCompiledPlugin>, Record<string, GenericCompiledQuery>> = {
        plugins: {},
        queries: {},
    };

    const withQueries = (...queries: GenericCompiledQuery[]) => {
        for (const query of queries) {
            args.queries[query.name] = query;
        }
        return api;
    };

    const compile = () =>
        createWorld<C, Record<string, GenericCompiledPlugin>, Record<string, GenericCompiledQuery>>(args);

    const api = {
        withQueries,
        compile,
    } as unknown as WorldBuilderApi<C, NonNullable<unknown>, NonNullable<unknown>, 'compile'>;

    return api;
};
