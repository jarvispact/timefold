import { addComponentToEntityBitmask, Bitmask, createBitmask, removeComponentFromEntityBitmask } from './bitmask';
import { Component, InferComponents } from './component';
import { Entity } from './entity';
import {
    GenericComponentDefinition,
    IndexTupleByName,
    TupleOfLength,
    createEntityManager,
    createQueryManager,
} from './internal';
import { GenericCompiledQuery, InferQueryResultTuple } from './query';

type WorldBuilderContext = {
    components: GenericComponentDefinition[];
    queries: GenericCompiledQuery[];
};

type World<
    C extends Component = Component,
    Q extends Record<string, GenericCompiledQuery> = Record<string, GenericCompiledQuery>,
> = {
    createEntity: () => Entity;
    createEntities: <Count extends number>(count: Count) => TupleOfLength<Count, Entity>;

    spawn: (...args: [Entity, C[]] | [C[]]) => Entity;
    despawn: (...entities: Entity[]) => void;

    addComponent: (entity: Entity, component: C) => void;
    removeComponent: (entity: Entity, componentType: C['type']) => void;
    getComponent: <T extends C['type']>(entity: Entity, type: T) => Extract<C, { type: T }> | undefined;

    updateQueries: () => void;
    getQueryResults: <QueryName extends keyof Q>(name: QueryName) => InferQueryResultTuple<C, Q[QueryName]>;
};

const createWorld = (args: WorldBuilderContext) => {
    const MAX_COMPONENT_TYPE = args.components.length;
    const em = createEntityManager();
    const entityMap = new Map<Entity, { bitmask: Bitmask; components: Map<Component['type'], Component> }>();
    const qm = createQueryManager(MAX_COMPONENT_TYPE, args.queries, entityMap);

    const spawn = (...spawnArgs: [Entity, Component[]] | [Component[]]): Entity => {
        const entity = spawnArgs.length === 1 ? em.createEntity() : spawnArgs[0];
        const components = spawnArgs.length === 1 ? spawnArgs[0] : spawnArgs[1];

        if (entityMap.has(entity)) return entity;

        const entry = {
            bitmask: createBitmask(MAX_COMPONENT_TYPE),
            components: new Map(),
        };

        for (const component of components) {
            entry.components.set(component.type, component);
            addComponentToEntityBitmask(entry.bitmask, 'with', component.type);
        }

        entityMap.set(entity, entry);
        qm.queueStructuralChange({ type: 'spawn', entity });
        return entity;
    };

    const despawn = (...entities: Entity[]) => {
        for (let i = 0; i < entities.length; i++) {
            qm.queueStructuralChange({ type: 'despawn', entity: entities[i] });
            em.recycleEntity(entities[i]);
            entityMap.delete(entities[i]);
        }
    };

    const addComponent = (entity: Entity, component: Component) => {
        const entry = entityMap.get(entity);
        if (!entry) return;

        entry.components.set(component.type, component);
        addComponentToEntityBitmask(entry.bitmask, 'with', component.type);
        qm.queueStructuralChange({ type: 'addComponent', entity });
    };

    const removeComponent = (entity: Entity, componentType: Component['type']) => {
        const entry = entityMap.get(entity);
        if (!entry) return;

        entry.components.delete(componentType);
        removeComponentFromEntityBitmask(entry.bitmask, 'with', componentType);
        qm.queueStructuralChange({ type: 'removeComponent', entity });
    };

    const getComponent = (entity: Entity, type: Component['type']): Component | undefined => {
        const entry = entityMap.get(entity);
        if (!entry) return undefined;

        return entry.components.get(type);
    };

    return {
        createEntity: em.createEntity,
        createEntities: em.createEntities,

        spawn,
        despawn,

        addComponent,
        removeComponent,
        getComponent,

        updateQueries: qm.flushQueue,
        getQueryResults: qm.getQueryResults,
    } as unknown as World;
};

type WorldBuilderApi<
    ComponentDefinitions extends GenericComponentDefinition[],
    QueryDefinitions extends GenericCompiledQuery[],
    ForbiddenMethod extends string = never,
> = Omit<
    {
        withComponents: <C extends GenericComponentDefinition[]>(
            components: C,
        ) => WorldBuilderApi<C, QueryDefinitions, 'withComponents' | 'compile'>;
        withQueries: <Q extends GenericCompiledQuery[]>(
            ...queries: Q
        ) => WorldBuilderApi<ComponentDefinitions, Q, 'withComponents' | 'withQueries'>;
        compile: () => World<InferComponents<ComponentDefinitions>, IndexTupleByName<QueryDefinitions>>;
    },
    ForbiddenMethod
>;

export const worldBuilder = () => {
    const ctx: WorldBuilderContext = {
        components: [],
        queries: [],
    };

    const withComponents = (components: GenericComponentDefinition[]) => {
        ctx.components = components;
        return api;
    };

    const withQueries = (...queries: GenericCompiledQuery[]) => {
        ctx.queries = queries;
        return api;
    };

    const compile = () => createWorld(ctx);

    const api = {
        withComponents,
        withQueries,
        compile,
    };

    return api as WorldBuilderApi<GenericComponentDefinition[], GenericCompiledQuery[], 'withQueries' | 'compile'>;
};
