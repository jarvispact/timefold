/* eslint-disable @typescript-eslint/no-explicit-any */

import { addComponentToEntityBitmask, Bitmask, createBitmask, removeComponentFromEntityBitmask } from './bitmask';
import { Component, InferComponents } from './component';
import { Entity } from './entity';
import { IndexTupleByName, TupleOfLength, createEntityManager, createQueryManager } from './internal';
import { GenericCompiledQuery, InferQueryResultTuple } from './query';
import { Schema } from './schema';

type WorldBuilderContext = {
    components: Record<string, Schema<string, any> | undefined>;
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
    const componentKeys = Object.keys(args.components);
    const MAX_COMPONENT_TYPE = componentKeys.length;
    const componentTypeMap = new Map<string, number>();

    for (let i = 0; i < componentKeys.length; i++) {
        componentTypeMap.set(componentKeys[i], i);
    }

    const em = createEntityManager();
    const entityMap = new Map<Entity, { bitmask: Bitmask; components: Map<string, Component> }>();
    const qm = createQueryManager(MAX_COMPONENT_TYPE, args.queries, entityMap, componentTypeMap);

    const spawn = (...spawnArgs: [Entity, Component[]] | [Component[]]): Entity => {
        const entity = spawnArgs.length === 1 ? em.createEntity() : spawnArgs[0];
        const components = spawnArgs.length === 1 ? spawnArgs[0] : spawnArgs[1];

        if (entityMap.has(entity)) return entity;

        const entry = {
            bitmask: createBitmask(MAX_COMPONENT_TYPE),
            components: new Map<string, Component>(),
        };

        for (const component of components) {
            entry.components.set(component.type, component);
            const numericType = componentTypeMap.get(component.type);
            if (numericType !== undefined) {
                addComponentToEntityBitmask(entry.bitmask, 'with', numericType);
            }
        }

        entityMap.set(entity, entry);
        qm.queueStructuralChange(entity);
        return entity;
    };

    const despawn = (...entities: Entity[]) => {
        for (let i = 0; i < entities.length; i++) {
            qm.queueStructuralChange(entities[i]);
            em.recycleEntity(entities[i]);
            entityMap.delete(entities[i]);
        }
    };

    const addComponent = (entity: Entity, component: Component) => {
        const entry = entityMap.get(entity);
        if (!entry) return;

        entry.components.set(component.type, component);
        const numericType = componentTypeMap.get(component.type);
        if (numericType !== undefined) {
            addComponentToEntityBitmask(entry.bitmask, 'with', numericType);
        }
        qm.queueStructuralChange(entity);
    };

    const removeComponent = (entity: Entity, componentType: string) => {
        const entry = entityMap.get(entity);
        if (!entry) return;

        entry.components.delete(componentType);
        const numericType = componentTypeMap.get(componentType);
        if (numericType !== undefined) {
            removeComponentFromEntityBitmask(entry.bitmask, 'with', numericType);
        }
        qm.queueStructuralChange(entity);
    };

    const getComponent = (entity: Entity, type: string): Component | undefined => {
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
    ComponentDefinitions extends Record<string, Schema<string, any> | undefined>,
    QueryDefinitions extends GenericCompiledQuery[],
    ForbiddenMethod extends string = never,
> = Omit<
    {
        withComponents: <C extends Record<string, Schema<string, any> | undefined>>(
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
        components: {},
        queries: [],
    };

    const withComponents = (components: Record<string, Schema<string, any> | undefined>) => {
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

    return api as WorldBuilderApi<
        Record<string, Schema<string, any> | undefined>,
        GenericCompiledQuery[],
        'withQueries' | 'compile'
    >;
};
