// import { Component } from './component';
// import { IndexTupleByName } from './internal';
// import { CompiledQuery, GenericCompiledQuery, WithOptions, SupportedQuery } from './query';

import { Component, InferComponents } from './component';
import { GenericComponentDefinition, indexTupleByName, IndexTupleByName } from './internal';
import { GenericCompiledPlugin } from './plugin';
import { GenericCompiledQuery } from './query';

// export type CompiledWorld<C extends Component, QueriesByName extends Record<string, GenericCompiledQuery>> = {
//     queries: QueriesByName;
//     createEntity: () => number;
//     spawn: (entity: number, components: C[]) => void;
//     getComponent: <T extends C['type']>(entity: number, type: T) => Extract<C, { type: T }> | undefined;
// };

// type CreateWorldArgs<QueriesByName> = {
//     queries: QueriesByName;
// };

// const createWorld = <C extends Component, QueriesByName extends Record<string, GenericCompiledQuery>>(
//     args: CreateWorldArgs<QueriesByName>,
// ): CompiledWorld<C, QueriesByName> => {
//     let entityCounter = 0;
//     const componentsByEntity = new Map<number, Map<number, C | undefined> | undefined>();

//     const createEntity = () => entityCounter++;

//     const spawn = (entity: number, components: Component[]) => {
//         if (!componentsByEntity.has(entity)) {
//             componentsByEntity.set(entity, new Map());
//         }

//         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//         const entityComponents = componentsByEntity.get(entity)!;
//         for (const component of components) {
//             entityComponents.set(component.type, component as C);
//         }
//     };

//     const getComponent = (entity: number, type: Component['type']) => {
//         const components = componentsByEntity.get(entity);
//         if (!components) return undefined;
//         return components.get(type) as Extract<C, { type: typeof type }> | undefined;
//     };

//     return {
//         queries: args.queries,
//         createEntity,
//         spawn,
//         getComponent,
//     } as CompiledWorld<C, QueriesByName>;
// };

// type WorldBuilderApi<
//     C extends Component,
//     QueriesByName extends Record<string, GenericCompiledQuery>,
//     ForbiddenMethod extends string = never,
// > = Omit<
//     {
//         withQueries: <Q extends CompiledQuery<string, SupportedQuery<C['type'], WithOptions | undefined>[]>[]>(
//             ...queries: Q
//         ) => WorldBuilderApi<C, IndexTupleByName<Q>, 'withQueries'>;
//         compile: () => CompiledWorld<C, QueriesByName>;
//     },
//     ForbiddenMethod
// >;

// export const WorldBuilder = <C extends Component>() => {
//     const args: CreateWorldArgs<Record<string, GenericCompiledQuery>> = {
//         queries: {},
//     };

//     const withQueries = (...queries: GenericCompiledQuery[]) => {
//         for (const query of queries) {
//             args.queries[query.name] = query;
//         }
//         return api;
//     };

//     const compile = () => createWorld<C, Record<string, GenericCompiledQuery>>(args);

//     const api = {
//         withQueries,
//         compile,
//     } as unknown as WorldBuilderApi<C, NonNullable<unknown>>;

//     return api;
// };

type CreateWorldArgs = {
    components: GenericComponentDefinition[];
    plugins: GenericCompiledPlugin[];
    queries: GenericCompiledQuery[];
};

export type World<
    C extends Component,
    PluginsByName extends Record<string, GenericCompiledPlugin>,
    QueriesByName extends Record<string, GenericCompiledQuery>,
> = {
    getPlugin: <PluginName extends keyof PluginsByName>(pluginName: PluginName) => PluginsByName[PluginName];
    getQuery: <QueryName extends keyof QueriesByName>(queryName: QueryName) => QueriesByName[QueryName];
    createEntity: () => number;
    spawn: (entity: number, components: C[]) => void;
    getComponent: <T extends C['type']>(entity: number, type: T) => Extract<C, { type: T }> | undefined;
};

export const createWorld = <const Args extends CreateWorldArgs>(args: Args) => {
    const pluginsByName = indexTupleByName(args.plugins);
    const queriesByName = indexTupleByName(args.queries);

    const getPlugin = (name: keyof typeof pluginsByName) => pluginsByName[name];

    const getQuery = (name: keyof typeof queriesByName) => queriesByName[name];

    type C = InferComponents<Args['components']>;

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
        return components.get(type);
    };

    return {
        getPlugin,
        getQuery,
        createEntity,
        spawn,
        getComponent,
    } as unknown as World<
        InferComponents<Args['components']>,
        IndexTupleByName<Args['plugins']>,
        IndexTupleByName<Args['queries']>
    >;
};
