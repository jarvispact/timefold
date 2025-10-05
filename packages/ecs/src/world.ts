import type { Component } from './component';
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
import { getSortedSystemsByStage } from './internal';
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
import {
    AsyncSystem,
    AsyncSystemNamesForStage,
    defineSystemGraph,
    System,
    SystemGraph,
    SystemGraphArgs,
    SystemNamesForStage,
    SystemOrder,
    SystemStage,
} from './system';

type EventSubscriber = (payload: unknown) => void;

const COMPONENT_TYPE_DIVISOR = 32;

export type World<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    Graph extends SystemGraph = SystemGraph,
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
    emit: (event: CustomEvent) => void;
    on: <EventType extends (CustomEvent | EcsEvent<WorldComponent, Resources>)['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<CustomEvent | EcsEvent<WorldComponent, Resources>, { type: EventType }> extends {
                payload: infer Payload;
            }
                ? [Payload]
                : []
        ) => void,
    ) => void;
    getSystem: <Name extends keyof Graph['systems']>(name: Name) => Graph['systems'][Name];
    getSystemActiveState: (name: keyof Graph['systems']) => boolean;
    setSystemActiveState: (name: keyof Graph['systems'], active: boolean) => void;
};

function createWorld<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    Graph extends SystemGraph = SystemGraph,
>(
    resources: Record<string, unknown>,
    queries: InternalQuery[],
    nameToQueryIdx: Record<string, number | undefined>,
    systemGraph: Graph,
) {
    const entities = new Map<number, { componentsByType: Map<number, WorldComponent>; bitmasks: Bitmasks }>();
    const subscribersByEventType: Record<string, EventSubscriber[] | undefined> = {};

    const { systemsByStage, nameToStageAndIndex } = getSortedSystemsByStage(systemGraph as never);

    function spawn(entity: number, components: WorldComponent[]): Entity {
        const componentsByType = new Map<number, WorldComponent>();

        const bitmasks: Bitmasks = {
            with: [0, 0, 0, 0],
            withAny: [0, 0, 0, 0],
        };

        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            componentsByType.set(component.type, component);
            const bitmaskIdx = Math.floor(component.type / COMPONENT_TYPE_DIVISOR);
            bitmasks.with[bitmaskIdx] |= 1 << component.type % COMPONENT_TYPE_DIVISOR;
            bitmasks.withAny[bitmaskIdx] |= 1 << component.type % COMPONENT_TYPE_DIVISOR;
        }

        entities.set(entity, { componentsByType, bitmasks });

        const event: SpawnEntityEcsEvent<WorldComponent> = {
            type: 'ecs/spawn-entity',
            payload: { entity, components },
        };

        world.emit(event);

        updateQueriesForSpawnAndAddComponent(queries, bitmasks, entity, componentsByType);

        return entity;
    }

    function despawn(entity: Entity): boolean {
        const entry = entities.get(entity);
        if (entry === undefined) return false;

        const event: DespawnEntityEcsEvent = {
            type: 'ecs/despawn-entity',
            payload: { entity },
        };

        world.emit(event);

        updateQueriesForDespawn(queries, entity);

        entities.delete(entity);
        return true;
    }

    function getComponent(entity: Entity, componentType: WorldComponent['type']) {
        const entry = entities.get(entity);
        if (entry === undefined) return undefined;
        return entry.componentsByType.get(componentType);
    }

    function addComponent(entity: Entity, component: WorldComponent): boolean {
        const entry = entities.get(entity);
        if (entry === undefined) return false;
        if (entry.componentsByType.get(component.type) !== undefined) return false;
        entry.componentsByType.set(component.type, component);

        const bitmaskIdx = Math.floor(component.type / COMPONENT_TYPE_DIVISOR);
        entry.bitmasks.with[bitmaskIdx] |= 1 << component.type % COMPONENT_TYPE_DIVISOR;
        entry.bitmasks.withAny[bitmaskIdx] |= 1 << component.type % COMPONENT_TYPE_DIVISOR;

        const event: AddComponentEcsEvent<WorldComponent> = {
            type: 'ecs/add-component',
            payload: { entity, component },
        };

        world.emit(event);

        updateQueriesForSpawnAndAddComponent(queries, entry.bitmasks, entity, entry.componentsByType);

        return true;
    }

    function removeComponent(entity: Entity, componentType: WorldComponent['type']): boolean {
        const entry = entities.get(entity);
        if (entry === undefined) return false;
        const component = entry.componentsByType.get(componentType);
        if (component === undefined) return false;
        entry.componentsByType.delete(componentType);

        const bitmaskIdx = Math.floor(componentType / COMPONENT_TYPE_DIVISOR);
        entry.bitmasks.with[bitmaskIdx] &= ~(1 << componentType % COMPONENT_TYPE_DIVISOR);
        entry.bitmasks.withAny[bitmaskIdx] &= ~(1 << componentType % COMPONENT_TYPE_DIVISOR);

        const event: RemoveComponentEcsEvent<WorldComponent> = {
            type: 'ecs/remove-component',
            payload: { entity, component },
        };

        world.emit(event);

        updateQueriesForRemoveComponent(queries, entity, entry.bitmasks);

        return true;
    }

    function getResource(name: string) {
        return resources[name];
    }

    function setResource(name: string, data: unknown) {
        resources[name] = data;

        const event: SetResourceEcsEvent<Resources, keyof Resources> = {
            type: 'ecs/set-resource',
            payload: { name, data } as never,
        };

        world.emit(event);
    }

    function removeResource(name: string) {
        const data = resources[name];

        const event: RemoveResourceEcsEvent<Resources, keyof Resources> = {
            type: 'ecs/remove-resource',
            payload: { name, data } as never,
        };

        world.emit(event);

        resources[name] = undefined;
    }

    function getQuery(name: string) {
        const idx = nameToQueryIdx[name];
        if (idx === undefined) return undefined;
        return {
            result: queries[idx].result,
        };
    }

    function emit(event: CustomEvent | EcsEvent<WorldComponent, Resources>) {
        const subscribers = subscribersByEventType[event.type];
        if (!subscribers) return;

        for (let i = 0; i < subscribers.length; i++) {
            const subscriber = subscribers[i];
            subscriber((event as unknown as { payload: unknown }).payload);
        }
    }

    function on(eventType: string, cb: EventSubscriber) {
        if (!subscribersByEventType[eventType]) {
            subscribersByEventType[eventType] = [];
        }

        subscribersByEventType[eventType].push(cb);
    }

    function getSystem(name: string) {
        const result = nameToStageAndIndex[name];

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!result) return;

        const systemList = systemsByStage[result.stage];

        return (
            result.index.length === 2
                ? (systemList[result.index[0]] as unknown[])[result.index[1]]
                : systemList[result.index[0]]
        ) as System | AsyncSystem;
    }

    function getSystemActiveState(name: string) {
        const system = getSystem(name);
        if (!system) return false;

        return system.active;
    }

    function setSystemActiveState(name: string, active: boolean) {
        const system = getSystem(name);
        if (!system) return;

        system.active = active;
    }

    const world = {
        spawn,
        despawn,
        getComponent,
        addComponent,
        removeComponent,
        getResource,
        setResource,
        removeResource,
        getQuery,
        emit,
        on,
        getSystem,
        getSystemActiveState,
        setSystemActiveState,
    };

    return world as unknown as World<WorldComponent, CustomEvent, Resources, Queries, Graph>;
}

export type WorldBuilderApi<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    Graph extends SystemGraph = SystemGraph,
    UsedMethods extends string = never,
> = Omit<
    {
        defineResources: <Resources extends Record<string, unknown>>(
            resources: Resources,
        ) => WorldBuilderApi<WorldComponent, CustomEvent, Resources, Queries, Graph, UsedMethods | 'defineResources'>;
        defineQueries: <Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>>>(
            queries: Queries,
        ) => WorldBuilderApi<WorldComponent, CustomEvent, Resources, Queries, Graph, UsedMethods | 'defineQueries'>;
        defineSystemGraph: <Systems extends Record<string, System | AsyncSystem>>(
            graph: Omit<
                | SystemGraphArgs<
                      Systems,
                      Partial<{
                          [S in SystemStage]: SystemOrder<
                              SystemNamesForStage<Systems, S>,
                              AsyncSystemNamesForStage<Systems, S>
                          >;
                      }>
                  >
                | SystemGraph<
                      Systems,
                      {
                          [S in SystemStage]: SystemOrder<
                              SystemNamesForStage<Systems, S>,
                              AsyncSystemNamesForStage<Systems, S>
                          >;
                      }
                  >,
                'type'
            >,
        ) => WorldBuilderApi<
            WorldComponent,
            CustomEvent,
            Resources,
            Queries,
            SystemGraph<
                Systems,
                {
                    [S in SystemStage]: SystemOrder<
                        SystemNamesForStage<Systems, S>,
                        AsyncSystemNamesForStage<Systems, S>
                    >;
                }
            >,
            UsedMethods | 'defineSystemGraph'
        >;
        compile: () => World<WorldComponent, CustomEvent, Resources, Queries, Graph>;
    },
    UsedMethods
>;

export function worldBuilder<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    Graph extends SystemGraph = SystemGraph,
    UsedMethods extends string = never,
>() {
    let resources: Record<string, unknown> = {};

    const queries: InternalQuery[] = [];
    const nameToQueryIdx: Record<string, number | undefined> = {};

    let systemGraph: SystemGraph = {
        type: 'system-graph',
        systems: {},
        orderByStage: { startup: [], update: [], render: [], cleanup: [] },
    };

    const api = {
        defineResources: (recordOfResources: Record<string, unknown>) => {
            resources = recordOfResources;
            return api;
        },
        defineQueries: (recordOfQueries: Record<string, QueryDefinitionGeneric<WorldComponent>>) => {
            const queryKeys = Object.keys(recordOfQueries);

            for (let i = 0; i < queryKeys.length; i++) {
                const name = queryKeys[i];
                const query = recordOfQueries[name];

                const bitmasks: Bitmasks = {
                    with: [0, 0, 0, 0],
                    withAny: [0, 0, 0, 0],
                };

                const flags = {
                    hasWith: false,
                    hasWithAny: false,
                };

                for (let j = 0; j < query.tuple.length; j++) {
                    const queryTuple = query.tuple[j];
                    if (isWithItem(queryTuple)) {
                        const bitmaskIdx = Math.floor(queryTuple.with / COMPONENT_TYPE_DIVISOR);
                        bitmasks.with[bitmaskIdx] |= 1 << queryTuple.with % COMPONENT_TYPE_DIVISOR;
                        flags.hasWith = true;
                    } else if (isWithAnyItem(queryTuple)) {
                        flags.hasWithAny = true;
                        for (let k = 0; k < queryTuple.withAny.length; k++) {
                            const any = queryTuple.withAny[k];
                            const bitmaskIdx = Math.floor(any / COMPONENT_TYPE_DIVISOR);
                            bitmasks.withAny[bitmaskIdx] |= 1 << any % COMPONENT_TYPE_DIVISOR;
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
        defineSystemGraph: (graphArgs: SystemGraphArgs | SystemGraph) => {
            systemGraph = graphArgs.type === 'system-graph' ? graphArgs : defineSystemGraph(graphArgs as never);
            return api;
        },
        compile: () =>
            createWorld<WorldComponent, CustomEvent, Resources, Queries, Graph>(
                resources,
                queries,
                nameToQueryIdx,
                systemGraph as Graph,
            ),
    };

    return api as unknown as WorldBuilderApi<WorldComponent, CustomEvent, Resources, Queries, Graph, UsedMethods>;
}
