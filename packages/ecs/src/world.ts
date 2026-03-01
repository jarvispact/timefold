/* eslint-disable @typescript-eslint/no-explicit-any */

import { addComponentToEntityBitmask, Bitmask, createBitmask, removeComponentFromEntityBitmask } from './bitmask';
import { Component, InferComponents } from './component';
import { Entity } from './entity';
import {
    AddComponentEcsEvent,
    DespawnEntityEcsEvent,
    EcsEvent,
    GenericEcsEvent,
    RemoveComponentEcsEvent,
    RemoveResourceEcsEvent,
    SetResourceEcsEvent,
    SpawnEntityEcsEvent,
} from './event';
import { IndexTupleByName, TupleOfLength, createEntityManager, createQueryManager } from './internal';
import { GenericCompiledQuery, InferQueryResultTuple } from './query';
import { GenericResources } from './resource';
import { Schema } from './schema';

type WorldBuilderContext = {
    components: Record<string, Schema<string, any> | undefined>;
    queries: GenericCompiledQuery[];
};

type World<
    C extends Component = Component,
    Q extends Record<string, GenericCompiledQuery> = Record<string, GenericCompiledQuery>,
    R extends GenericResources = GenericResources,
    E extends GenericEcsEvent = never,
> = {
    createEntity: () => Entity;
    createEntities: <Count extends number>(count: Count) => TupleOfLength<Count, Entity>;

    spawn: (...args: [Entity, C[]] | [C[]]) => Entity;
    despawn: (...entities: Entity[]) => World<C, Q, R, E>;

    addComponent: (entity: Entity, component: C) => World<C, Q, R, E>;
    removeComponent: (entity: Entity, componentType: C['type']) => World<C, Q, R, E>;
    getComponent: <T extends C['type']>(entity: Entity, type: T) => Extract<C, { type: T }> | undefined;

    updateQueries: () => World<C, Q, R, E>;
    getQueryResults: <QueryName extends keyof Q>(name: QueryName) => InferQueryResultTuple<C, Q[QueryName]>[];

    setResource: <Name extends keyof R>(name: Name, data: R[Name]) => World<C, Q, R, E>;
    getResource: <Name extends keyof R>(name: Name) => R[Name];
    removeResource: (name: keyof R) => World<C, Q, R, E>;

    emit: (event: E['type'] extends never ? GenericEcsEvent : E) => World<C, Q, R, E>;
    on: <EventType extends (E | EcsEvent<C, R>)['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<E | EcsEvent<C, R>, { type: EventType }> extends {
                payload: infer Payload;
            }
                ? [Payload]
                : []
        ) => void,
    ) => World<C, Q, R, E>;
};

type EventSubscriber = (payload: unknown) => void;

const createWorld = (args: WorldBuilderContext) => {
    const componentKeys = Object.keys(args.components);
    const MAX_COMPONENT_TYPE = componentKeys.length;
    const componentTypeMap = new Map<string, number>();
    const entityMap = new Map<Entity, { bitmask: Bitmask; components: Map<string, Component> }>();

    for (let i = 0; i < componentKeys.length; i++) {
        componentTypeMap.set(componentKeys[i], i);
    }

    const em = createEntityManager();
    const qm = createQueryManager(MAX_COMPONENT_TYPE, args.queries, entityMap, componentTypeMap);

    const subscribersByEventType: Record<string, EventSubscriber[] | undefined> = {};
    const resources: GenericResources = {};

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

        const spawnEvent: SpawnEntityEcsEvent<Component> = {
            type: 'ecs/spawn-entity',
            payload: { entity, components },
        };

        emit(spawnEvent as never);
        return entity;
    };

    const despawn = (...entities: Entity[]): World => {
        for (let i = 0; i < entities.length; i++) {
            qm.queueStructuralChange(entities[i]);
            em.recycleEntity(entities[i]);
            entityMap.delete(entities[i]);

            const despawnEvent: DespawnEntityEcsEvent = {
                type: 'ecs/despawn-entity',
                payload: { entity: entities[i] },
            };

            emit(despawnEvent as never);
        }

        return world;
    };

    const addComponent = (entity: Entity, component: Component): World => {
        const entry = entityMap.get(entity);
        if (!entry) return world;

        entry.components.set(component.type, component);
        const numericType = componentTypeMap.get(component.type);

        if (numericType !== undefined) {
            addComponentToEntityBitmask(entry.bitmask, 'with', numericType);
        }

        qm.queueStructuralChange(entity);

        const addEvent: AddComponentEcsEvent<Component> = {
            type: 'ecs/add-component',
            payload: { entity, component },
        };

        emit(addEvent as never);
        return world;
    };

    const removeComponent = (entity: Entity, componentType: string): World => {
        const entry = entityMap.get(entity);
        if (!entry) return world;

        const component = entry.components.get(componentType);
        if (!component) return world;

        entry.components.delete(componentType);
        const numericType = componentTypeMap.get(componentType);

        if (numericType !== undefined) {
            removeComponentFromEntityBitmask(entry.bitmask, 'with', numericType);
        }

        qm.queueStructuralChange(entity);

        const removeEvent: RemoveComponentEcsEvent<Component> = {
            type: 'ecs/remove-component',
            payload: { entity, component },
        };

        emit(removeEvent as never);
        return world;
    };

    const getComponent = (entity: Entity, type: string): Component | undefined => {
        const entry = entityMap.get(entity);
        if (!entry) return undefined;

        return entry.components.get(type);
    };

    const emit = (event: EcsEvent<Component, GenericResources>): World => {
        const subscribers = subscribersByEventType[event.type];
        if (!subscribers) return world;

        for (let i = 0; i < subscribers.length; i++) {
            const subscriber = subscribers[i];
            subscriber((event as unknown as { payload: unknown }).payload);
        }

        return world;
    };

    const on = <EventType extends EcsEvent<Component, GenericResources>['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<EcsEvent<Component, GenericResources>, { type: EventType }> extends {
                payload: infer Payload;
            }
                ? [Payload]
                : []
        ) => void,
    ): World => {
        if (!subscribersByEventType[type]) {
            subscribersByEventType[type] = [];
        }

        subscribersByEventType[type].push(cb as EventSubscriber);
        return world;
    };

    const setResource = (name: string, data: unknown): World => {
        resources[name] = data;

        const event: SetResourceEcsEvent<GenericResources, keyof GenericResources> = {
            type: 'ecs/set-resource',
            payload: { name, data } as never,
        };

        emit(event as never);
        return world;
    };

    const getResource = (name: string) => {
        return resources[name];
    };

    const removeResource = (name: string): World => {
        const data = resources[name];

        const event: RemoveResourceEcsEvent<GenericResources, keyof GenericResources> = {
            type: 'ecs/remove-resource',
            payload: { name, data } as never,
        };

        emit(event as never);

        resources[name] = undefined;
        return world;
    };

    const world = {
        createEntity: em.createEntity,
        createEntities: em.createEntities,

        spawn,
        despawn,

        addComponent,
        removeComponent,
        getComponent,

        updateQueries: qm.flushQueue,
        getQueryResults: qm.getQueryResults,

        emit,
        on,

        setResource,
        getResource,
        removeResource,
    } as unknown as World;

    return world;
};

type WorldBuilderApi<
    C extends Record<string, Schema<string, any> | undefined>,
    Q extends GenericCompiledQuery[],
    R extends GenericResources = GenericResources,
    E extends GenericEcsEvent = never,
    ForbiddenMethod extends string = never,
> = Omit<
    {
        withComponents: <C extends Record<string, Schema<string, any> | undefined>>(
            components: C,
        ) => WorldBuilderApi<C, Q, R, E, 'withComponents' | 'compile'>;
        withQueries: <Q extends GenericCompiledQuery[]>(
            ...queries: Q
        ) => WorldBuilderApi<C, Q, R, E, 'withComponents' | 'withQueries'>;
        compile: () => World<InferComponents<C>, IndexTupleByName<Q>, R, E>;
    },
    ForbiddenMethod
>;

export const worldBuilder = <R extends GenericResources, E extends GenericEcsEvent = never>() => {
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

    return api as WorldBuilderApi<NonNullable<unknown>, GenericCompiledQuery[], R, E, 'withQueries' | 'compile'>;
};
