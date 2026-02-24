import { Component, InferComponents } from './component';
import { GenericComponentDefinition, GetQueryTuplesFromPlugins, indexTupleByName, IndexTupleByName } from './internal';
import { GenericCompiledPlugin } from './plugin';
import { GenericCompiledQuery } from './query';

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
    const queriesByName = indexTupleByName([...args.queries, ...args.plugins.flatMap((p) => p.queries)]);

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
        IndexTupleByName<Args['queries']> & IndexTupleByName<GetQueryTuplesFromPlugins<Args['plugins']>>
    >;
};
