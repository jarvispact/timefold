import type { Component } from './component';
import { Entity } from './entity';
import {
    createAddComponentEvent,
    createDespawnEntityEvent,
    createRemoveComponentEvent,
    createSpawnEntityEvent,
    EcsEvent,
    GenericEcsEvent,
} from './event';
import {
    Bitmasks,
    InternalQuery,
    isWithAnyItem,
    isWithItem,
    MapQueryDefinitionToTuple,
    QueryDefinitionGeneric,
    updateQueriesForDespawn,
    updateQueriesForRemoveComponent,
    updateQueriesForSpawnAndAddComponent,
} from './query';

type EventSubscriber = (payload: unknown) => void;

export type World<
    WorldComponent extends Component,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent>,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
> = {
    spawn: (entity: Entity, components: WorldComponent[]) => Entity;
    despawn: (id: Entity) => boolean;
    getComponent: <ComponentType extends WorldComponent['type']>(
        entity: Entity,
        componentType: ComponentType,
    ) => Extract<WorldComponent, { type: ComponentType }> | undefined;
    addComponent: (entity: Entity, component: WorldComponent) => boolean;
    removeComponent: (entity: Entity, componentType: WorldComponent['type']) => boolean;
    getResource: <Name extends keyof Resources>(name: Name) => Resources[Name];
    setResource: <Name extends keyof Resources>(name: Name, data: Resources[Name]) => void;
    removeResource: (name: keyof Resources) => void;
    getQuery: <Name extends keyof Queries>(
        name: Name,
    ) => {
        result: MapQueryDefinitionToTuple<WorldComponent, Queries[Name]>[];
    };
    emit: <EventType extends WorldEvent['type']>(
        type: EventType,
        ...payload: Extract<WorldEvent, { type: EventType }> extends { payload: infer Payload } ? [Payload] : []
    ) => void;
    on: <EventType extends WorldEvent['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<WorldEvent, { type: EventType }> extends { payload: infer Payload } ? [Payload] : []
        ) => void,
    ) => void;
};

export type WorldBuilderApi<
    WorldComponent extends Component,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent>,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    UsedMethods extends string = never,
> = Omit<
    {
        defineResources: <Resources extends Record<string, unknown>>(
            resources: Resources,
        ) => WorldBuilderApi<WorldComponent, WorldEvent, Resources, Queries, UsedMethods | 'defineResources'>;
        registerQueries: <Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>>>(
            queries: Queries,
        ) => WorldBuilderApi<WorldComponent, WorldEvent, Resources, Queries, UsedMethods | 'registerQueries'>;
        compile: () => World<WorldComponent, WorldEvent, Resources, Queries>;
    },
    UsedMethods
>;

export const worldBuilder = <
    WorldComponent extends Component,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent>,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    UsedMethods extends string = never,
>() => {
    let resources: Record<string, unknown> = {};
    const queries: InternalQuery[] = [];
    const nameToQueryIdx: Record<string, number | undefined> = {};

    const api = {
        defineResources: (recordOfResources: Record<string, unknown>) => {
            resources = recordOfResources;
            return api;
        },
        registerQueries: (recordOfQueries: Record<string, QueryDefinitionGeneric<WorldComponent>>) => {
            const queryKeys = Object.keys(recordOfQueries);

            for (let i = 0; i < queryKeys.length; i++) {
                const name = queryKeys[i];
                const query = recordOfQueries[name];

                const bitmasks = {
                    with: 0,
                    withAny: 0,
                };

                const flags = {
                    hasWith: false,
                    hasWithAny: false,
                };

                for (let j = 0; j < query.tuple.length; j++) {
                    const queryTuple = query.tuple[j];
                    if (isWithItem(queryTuple)) {
                        bitmasks.with |= 1 << queryTuple.with;
                        flags.hasWith = true;
                    } else if (isWithAnyItem(queryTuple)) {
                        flags.hasWithAny = true;
                        for (let k = 0; k < queryTuple.withAny.length; k++) {
                            const any = queryTuple.withAny[k];
                            bitmasks.withAny |= 1 << any;
                        }
                    }
                }

                queries.push({
                    name,
                    defintion: query,
                    bitmasks,
                    flags,
                    entityToResultIdx: new Map(),
                    entities: [],
                    result: [],
                });

                nameToQueryIdx[name] = queries.length - 1;
            }

            return api;
        },
        compile: () => {
            const entities = new Map<number, { componentsByType: Map<number, WorldComponent>; bitmasks: Bitmasks }>();

            const subscribersByEventType: Record<string, EventSubscriber[] | undefined> = {};

            const world = {
                spawn: (entity: number, components: WorldComponent[]) => {
                    const componentsByType = new Map<number, WorldComponent>();

                    const bitmasks = {
                        with: 0,
                        withAny: 0,
                    };

                    for (let i = 0; i < components.length; i++) {
                        const component = components[i];
                        componentsByType.set(component.type, component);
                        bitmasks.with |= 1 << component.type;
                        bitmasks.withAny |= 1 << component.type;
                    }

                    entities.set(entity, { componentsByType, bitmasks });

                    const event = createSpawnEntityEvent({
                        type: 'ecs/spawn-entity',
                        payload: { entity, components },
                    });

                    world.emit(event.type, event.payload);

                    updateQueriesForSpawnAndAddComponent(queries, bitmasks, entity, componentsByType);

                    return entity;
                },
                despawn: (entity: Entity): boolean => {
                    const entry = entities.get(entity);
                    if (entry === undefined) return false;
                    entities.delete(entity);

                    const event = createDespawnEntityEvent({
                        type: 'ecs/despawn-entity',
                        // TODO
                        payload: { entity, components: [...entry.componentsByType.values()] },
                    });

                    world.emit(event.type, event.payload);

                    updateQueriesForDespawn(queries, entity);

                    return true;
                },
                getComponent: (entity: Entity, componentType: WorldComponent['type']) => {
                    const entry = entities.get(entity);
                    if (entry === undefined) return undefined;
                    return entry.componentsByType.get(componentType);
                },
                addComponent: (entity: Entity, component: WorldComponent): boolean => {
                    const entry = entities.get(entity);
                    if (entry === undefined) return false;
                    if (entry.componentsByType.get(component.type) !== undefined) return false;
                    entry.componentsByType.set(component.type, component);

                    entry.bitmasks.with |= 1 << component.type;
                    entry.bitmasks.withAny |= 1 << component.type;

                    const event = createAddComponentEvent({
                        type: 'ecs/add-component',
                        payload: { entity, component },
                    });

                    world.emit(event.type, event.payload);

                    updateQueriesForSpawnAndAddComponent(queries, entry.bitmasks, entity, entry.componentsByType);

                    return true;
                },
                removeComponent: (entity: Entity, componentType: WorldComponent['type']): boolean => {
                    const entry = entities.get(entity);
                    if (entry === undefined) return false;
                    const component = entry.componentsByType.get(componentType);
                    if (component === undefined) return false;
                    entry.componentsByType.delete(componentType);

                    const withBefore = entry.bitmasks.with;
                    const withAnyBefore = entry.bitmasks.withAny;

                    entry.bitmasks.with &= ~(1 << componentType);
                    entry.bitmasks.withAny &= ~(1 << componentType);

                    const withChanged = entry.bitmasks.with !== withBefore;
                    const withAnyChanged = entry.bitmasks.withAny !== withAnyBefore;

                    if (!(withChanged && withAnyChanged)) {
                        return false;
                    }

                    const event = createRemoveComponentEvent({
                        type: 'ecs/remove-component',
                        payload: { entity, component },
                    });

                    world.emit(event.type, event.payload);

                    updateQueriesForRemoveComponent(queries, entity, entry.bitmasks);

                    return true;
                },
                getResource: (name: string) => resources[name],
                setResource: (name: string, data: unknown) => {
                    resources[name] = data;
                },
                removeResource: (name: string) => {
                    resources[name] = undefined;
                },
                getQuery: (name: string) => {
                    const idx = nameToQueryIdx[name];
                    if (idx === undefined) return undefined;
                    const qry = queries[idx];

                    return {
                        result: qry.result,
                    };
                },
                emit: (eventType: string, payload: unknown) => {
                    const subscribers = subscribersByEventType[eventType];
                    if (!subscribers) return;

                    for (let i = 0; i < subscribers.length; i++) {
                        const subscriber = subscribers[i];
                        subscriber(payload);
                    }
                },
                on: (eventType: string, cb: EventSubscriber) => {
                    if (!subscribersByEventType[eventType]) {
                        subscribersByEventType[eventType] = [];
                    }

                    subscribersByEventType[eventType].push(cb);
                },
            };

            return world as unknown as World<WorldComponent, WorldEvent, Resources, Queries>;
        },
    };

    return api as unknown as WorldBuilderApi<WorldComponent, WorldEvent, Resources, Queries, UsedMethods>;
};
