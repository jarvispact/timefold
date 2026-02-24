import { Component, InferComponents } from './component';
import { Entity } from './entity';
import {
    GenericComponentDefinition,
    GetQueryTuplesFromPlugins,
    indexTupleByName,
    IndexTupleByName,
    TupleOfLength,
} from './internal';
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
    createEntity: () => Entity;
    createEntities: <Count extends number>(count: Count) => TupleOfLength<Count, Entity>;
    spawn: (...args: [Entity, C[]] | [C[]]) => Entity;
    despawn: (...entities: Entity[]) => void;
    getComponent: <T extends C['type']>(entity: Entity, type: T) => Extract<C, { type: T }> | undefined;
};

export const createWorld = <const Args extends CreateWorldArgs>(args: Args) => {
    const pluginsByName = indexTupleByName(args.plugins);
    const queriesByName = indexTupleByName([...args.queries, ...args.plugins.flatMap((p) => p.queries)]);

    const getPlugin = (name: keyof typeof pluginsByName) => pluginsByName[name];
    const getQuery = (name: keyof typeof queriesByName) => queriesByName[name];

    type C = InferComponents<Args['components']>;

    let entityCounter = 0;
    const entityRecycleBin: Entity[] = [];

    const componentsByEntity = new Map<Entity, Map<number, C | undefined> | undefined>();

    const createEntity = (): Entity => {
        if (entityRecycleBin.length > 0) {
            const entity = entityRecycleBin.pop() as Entity;
            return entity;
        }

        return entityCounter++;
    };

    const createEntities = (count: number) => {
        const entities: Entity[] = [];

        for (let i = 0; i < count; i++) {
            entities.push(createEntity());
        }

        return entities;
    };

    const spawn = (...args: [Entity, C[]] | [C[]]): Entity => {
        const entity = args.length === 1 ? createEntity() : args[0];
        const components = args.length === 1 ? args[0] : args[1];

        if (!componentsByEntity.has(entity)) {
            componentsByEntity.set(entity, new Map());
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const entityComponents = componentsByEntity.get(entity)!;
        for (const component of components) {
            entityComponents.set(component.type, component);
        }

        return entity;
    };

    const despawn = (...entities: Entity[]) => {
        entityRecycleBin.push(...entities);
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
        createEntities,
        spawn,
        despawn,
        getComponent,
    } as unknown as World<
        InferComponents<Args['components']>,
        IndexTupleByName<Args['plugins']>,
        IndexTupleByName<Args['queries']> & IndexTupleByName<GetQueryTuplesFromPlugins<Args['plugins']>>
    >;
};
