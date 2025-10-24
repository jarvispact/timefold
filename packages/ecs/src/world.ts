import { Component } from './component';
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
import {
    Bitmasks,
    callSystem,
    GenericSystemWithFn,
    InternalQuery,
    MergeRules,
    updateQueriesForDespawn,
    updateQueriesForRemoveComponent,
    updateQueriesForSpawnAndAddComponent,
    isSystemActive as _isSystemActive,
    callSystemWithTime,
    createDefaultSystemFn,
    isWithItem,
    isWithAnyItem,
} from './internal';
import { Plugin } from './plugin';
import { GenericQueries, MapQueryDefinitionToTuple } from './query';
import { GenericResources } from './resource';
import { createDefaultSystemGraph, DefaultSystemGraph, mergeSystemGraphs, SystemGraph, SystemStage } from './system';

type PluginFn = (world: World<Component, GenericEcsEvent, GenericResources, GenericQueries>) => void | Promise<void>;

type WorldBuilderData = {
    resources: GenericResources;
    queries: GenericQueries;
    systemGraph: SystemGraph;
    pluginFns: PluginFn[];
};

type EventSubscriber = (payload: unknown) => void;

const COMPONENT_TYPE_DIVISOR = 32;

export type World<
    C extends Component,
    E extends GenericEcsEvent = never,
    R extends GenericResources = GenericResources,
    Q extends GenericQueries<C> = GenericQueries<C>,
    S extends SystemGraph = SystemGraph,
> = {
    emit: (event: E['type'] extends never ? GenericEcsEvent : E) => World<C, E, R, Q, S>;
    on: <EventType extends (E | EcsEvent<C, R>)['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<E | EcsEvent<C, R>, { type: EventType }> extends {
                payload: infer Payload;
            }
                ? [Payload]
                : []
        ) => void,
    ) => World<C, E, R, Q, S>;

    getResource: <Name extends keyof R>(name: Name) => R[Name];
    setResource: <Name extends keyof R>(name: Name, data: R[Name]) => World<C, E, R, Q, S>;
    removeResource: (name: keyof R) => World<C, E, R, Q, S>;

    getQueryResults: <Name extends keyof Q>(name: Name) => MapQueryDefinitionToTuple<C, Q[Name]>[];

    spawn: (entity: Entity, components: C[]) => Entity;
    despawn: (entity: Entity) => boolean;
    getComponent: <T extends C['type']>(
        entity: Entity,
        componentType: T,
    ) => Extract<C, { type: T }> extends never ? Component : Extract<C, { type: T }>;
    addComponent: (entity: Entity, component: C) => boolean;
    removeComponent: (entity: Entity, componentType: C['type']) => boolean;

    insertSystem: <Name extends keyof S['systems']>(
        name: Name,
        fn: S['systems'][Name]['stage'] extends 'update' | 'render'
            ? S['systems'][Name]['async'] extends true
                ? (delta: number, time: number) => Promise<void>
                : (delta: number, time: number) => void
            : S['systems'][Name]['async'] extends true
              ? () => Promise<void>
              : () => void,
    ) => World<C, E, R, Q, S>;
    insertSystems: (
        systems: Partial<{
            [K in keyof S['systems']]: S['systems'][K]['stage'] extends 'update' | 'render'
                ? S['systems'][K]['async'] extends true
                    ? (delta: number, time: number) => Promise<void>
                    : (delta: number, time: number) => void
                : S['systems'][K]['async'] extends true
                  ? () => Promise<void>
                  : () => void;
        }>,
    ) => World<C, E, R, Q, S>;
    isSystemActive: (name: keyof S['systems']) => boolean;
    setSystemActive: (name: keyof S['systems'], active: boolean) => World<C, E, R, Q, S>;

    // TODO: Can we infer if this is async or not?
    startup: () => Promise<void>;
    update: (time: number) => Promise<void>;
    cleanup: () => Promise<void>;
    start: (args?: { loop?: boolean }) => Promise<void>;
};

function createWorld<
    C extends Component,
    E extends GenericEcsEvent,
    R extends GenericResources,
    Q extends GenericQueries<C>,
    S extends SystemGraph,
>(worldBuilderData: WorldBuilderData) {
    const subscribersByEventType: Record<string, EventSubscriber[] | undefined> = {};

    const resources: Record<string, unknown> = worldBuilderData.resources;

    const internalQueries: InternalQuery[] = [];
    const nameToQueryIdx: Record<string, number | undefined> = {};

    const entities = new Map<number, { componentsByType: Map<number, C>; bitmasks: Bitmasks }>();

    const nameToStageAndIndex: Record<string, { stage: SystemStage; index: [number] | [number, number] }> = {};
    const systemsByStage: { [S in SystemStage]: (GenericSystemWithFn | GenericSystemWithFn[])[] } = {
        startup: [],
        update: [],
        render: [],
        cleanup: [],
    };

    // utils

    function setupSystems() {
        const map = (
            systemName: (string | number | symbol) | (string | number | symbol)[],
            idx: number,
        ): GenericSystemWithFn | GenericSystemWithFn[] => {
            if (Array.isArray(systemName))
                return systemName.map((n, idx2) => {
                    const system = worldBuilderData.systemGraph.systems[n.toString()];
                    nameToStageAndIndex[n.toString()] = { stage: system.stage, index: [idx, idx2] };
                    return {
                        active: system.active,
                        async: system.async,
                        fn: createDefaultSystemFn(n.toString(), system.async),
                    };
                });

            const system = worldBuilderData.systemGraph.systems[systemName.toString()];
            nameToStageAndIndex[systemName.toString()] = { stage: system.stage, index: [idx] };
            return {
                active: system.active,
                async: system.async,
                fn: createDefaultSystemFn(systemName.toString(), system.async),
            };
        };

        systemsByStage.startup = worldBuilderData.systemGraph.orderByStage.startup.map(map);
        systemsByStage.update = worldBuilderData.systemGraph.orderByStage.update.map(map);
        systemsByStage.render = worldBuilderData.systemGraph.orderByStage.render.map(map);
        systemsByStage.cleanup = worldBuilderData.systemGraph.orderByStage.cleanup.map(map);
    }

    function setupQueries() {
        const queryKeys = Object.keys(worldBuilderData.queries);

        for (let i = 0; i < queryKeys.length; i++) {
            const name = queryKeys[i];
            const query = worldBuilderData.queries[name];

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

            internalQueries.push({
                name,
                defintion: query,
                bitmasks,
                flags,
                entityToResultIdx: new Map(),
                entities: [],
                result: [],
            });

            nameToQueryIdx[name] = internalQueries.length - 1;
        }
    }

    let then = 0;
    function getDelta(now: number) {
        now *= 0.001;
        const delta = now - then;
        then = now;
        return delta;
    }

    // eventbus

    function emit(event: E['type'] extends never ? GenericEcsEvent : E) {
        const subscribers = subscribersByEventType[event.type];
        if (!subscribers) return;

        for (let i = 0; i < subscribers.length; i++) {
            const subscriber = subscribers[i];
            subscriber((event as unknown as { payload: unknown }).payload);
        }

        return api;
    }

    function on<EventType extends (CustomEvent | EcsEvent<C, R>)['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<CustomEvent | EcsEvent<C, R>, { type: EventType }> extends {
                payload: infer Payload;
            }
                ? [Payload]
                : []
        ) => void,
    ) {
        if (!subscribersByEventType[type]) {
            subscribersByEventType[type] = [];
        }

        subscribersByEventType[type].push(cb as EventSubscriber);

        return api;
    }

    // resources

    function getResource<Name extends keyof R>(name: Name) {
        return resources[name as string] as R[Name];
    }

    function setResource<Name extends keyof R>(name: Name, data: R[Name]) {
        resources[name as string] = data;

        const event: SetResourceEcsEvent<R, keyof R> = {
            type: 'ecs/set-resource',
            payload: { name, data } as never,
        };

        emit(event as never);
        return api;
    }

    function removeResource(name: keyof R) {
        const data = resources[name as string];

        const event: RemoveResourceEcsEvent<R, keyof R> = {
            type: 'ecs/remove-resource',
            payload: { name, data } as never,
        };

        emit(event as never);

        resources[name as string] = undefined;
        return api;
    }

    // queries

    function getQueryResults<Name extends keyof Q>(name: Name): MapQueryDefinitionToTuple<C, Q[Name]>[] {
        const idx = nameToQueryIdx[name as string];
        if (idx === undefined) {
            console.warn(`Query with name "${String(name)}" does not exist. Returning empty array.`);
            return [];
        }

        return internalQueries[idx].result as MapQueryDefinitionToTuple<C, Q[Name]>[];
    }

    // entities / components

    function spawn(entity: Entity, components: C[]): Entity {
        const componentsByType = new Map<number, C>();

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

        const event: SpawnEntityEcsEvent<C> = {
            type: 'ecs/spawn-entity',
            payload: { entity, components },
        };

        emit(event as never);

        updateQueriesForSpawnAndAddComponent(internalQueries, bitmasks, entity, componentsByType);

        return entity;
    }

    function despawn(entity: Entity): boolean {
        const entry = entities.get(entity);
        if (entry === undefined) return false;

        const event: DespawnEntityEcsEvent = {
            type: 'ecs/despawn-entity',
            payload: { entity },
        };

        emit(event as never);

        updateQueriesForDespawn(internalQueries, entity);

        entities.delete(entity);
        return true;
    }

    function getComponent<ComponentType extends C['type']>(entity: Entity, componentType: ComponentType) {
        const entry = entities.get(entity);
        if (entry === undefined) return undefined;
        return entry.componentsByType.get(componentType) as Extract<C, { type: ComponentType }>;
    }

    function addComponent(entity: Entity, component: C): boolean {
        const entry = entities.get(entity);
        if (entry === undefined) return false;
        if (entry.componentsByType.get(component.type) !== undefined) return false;
        entry.componentsByType.set(component.type, component);

        const bitmaskIdx = Math.floor(component.type / COMPONENT_TYPE_DIVISOR);
        entry.bitmasks.with[bitmaskIdx] |= 1 << component.type % COMPONENT_TYPE_DIVISOR;
        entry.bitmasks.withAny[bitmaskIdx] |= 1 << component.type % COMPONENT_TYPE_DIVISOR;

        const event: AddComponentEcsEvent<C> = {
            type: 'ecs/add-component',
            payload: { entity, component },
        };

        emit(event as never);

        updateQueriesForSpawnAndAddComponent(internalQueries, entry.bitmasks, entity, entry.componentsByType);

        return true;
    }

    function removeComponent(entity: Entity, componentType: C['type']): boolean {
        const entry = entities.get(entity);
        if (entry === undefined) return false;
        const component = entry.componentsByType.get(componentType);
        if (component === undefined) return false;
        entry.componentsByType.delete(componentType);

        const bitmaskIdx = Math.floor(componentType / COMPONENT_TYPE_DIVISOR);
        entry.bitmasks.with[bitmaskIdx] &= ~(1 << componentType % COMPONENT_TYPE_DIVISOR);
        entry.bitmasks.withAny[bitmaskIdx] &= ~(1 << componentType % COMPONENT_TYPE_DIVISOR);

        const event: RemoveComponentEcsEvent<C> = {
            type: 'ecs/remove-component',
            payload: { entity, component },
        };

        emit(event as never);

        updateQueriesForRemoveComponent(internalQueries, entity, entry.bitmasks);

        return true;
    }

    // systems

    function _getSystem(name: string) {
        const result = nameToStageAndIndex[name];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!result) return;

        const systemList = systemsByStage[result.stage];

        return (
            result.index.length === 2
                ? (systemList[result.index[0]] as unknown[])[result.index[1]]
                : systemList[result.index[0]]
        ) as GenericSystemWithFn;
    }

    function insertSystem<Name extends keyof S['systems']>(
        name: Name,
        fn: S['systems'][Name]['stage'] extends 'update' | 'render'
            ? S['systems'][Name]['async'] extends true
                ? (delta: number, time: number) => Promise<void>
                : (delta: number, time: number) => void
            : S['systems'][Name]['async'] extends true
              ? () => Promise<void>
              : () => void,
    ) {
        const system = _getSystem(name as string);
        if (!system) return api;
        system.fn = fn;
        return api;
    }

    function insertSystems(
        systems: Partial<{
            [K in keyof S['systems']]: S['systems'][K]['stage'] extends 'update' | 'render'
                ? S['systems'][K]['async'] extends true
                    ? (delta: number, time: number) => Promise<void>
                    : (delta: number, time: number) => void
                : S['systems'][K]['async'] extends true
                  ? () => Promise<void>
                  : () => void;
        }>,
    ) {
        const names = Object.keys(systems);

        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const sys = _getSystem(name);
            if (!sys || !systems[name]) continue;
            sys.fn = systems[name];
        }

        return api;
    }

    function isSystemActive(name: keyof S['systems']): boolean {
        const system = _getSystem(name as string);
        if (!system) return false;

        return system.active;
    }

    function setSystemActive(name: keyof S['systems'], active: boolean) {
        const system = _getSystem(name as string);
        if (!system) return;

        system.active = active;
        return api;
    }

    async function startup() {
        for (let i = 0; i < worldBuilderData.pluginFns.length; i++) {
            const plugin = worldBuilderData.pluginFns[i];
            await plugin(api as never);
        }

        const startupSystemList = systemsByStage.startup;

        for (let i = 0; i < startupSystemList.length; i++) {
            const systemOrSystemList = startupSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(systemOrSystemList.filter(_isSystemActive).map(callSystem));
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn();
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }
    }

    async function update(time: number) {
        const delta = getDelta(time);

        const updateSystemList = systemsByStage.update;

        for (let i = 0; i < updateSystemList.length; i++) {
            const systemOrSystemList = updateSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(
                    systemOrSystemList.filter(_isSystemActive).map(callSystemWithTime(delta, time)),
                );
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn(delta, time);
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }

        const renderSystemList = systemsByStage.render;

        for (let i = 0; i < renderSystemList.length; i++) {
            const systemOrSystemList = renderSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(
                    systemOrSystemList.filter(_isSystemActive).map(callSystemWithTime(delta, time)),
                );
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn(delta, time);
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }
    }

    async function cleanup() {
        const cleanupSystemList = systemsByStage.cleanup;

        for (let i = 0; i < cleanupSystemList.length; i++) {
            const systemOrSystemList = cleanupSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(systemOrSystemList.filter(_isSystemActive).map(callSystem));
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn();
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }
    }

    async function start(args: { loop?: boolean } = {}) {
        const loop = args.loop ?? true;

        await startup();

        const tick = async (time: number) => {
            await update(time);
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            if (loop) window.requestAnimationFrame(tick);
        };

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.requestAnimationFrame(tick);
    }

    const api = {
        emit,
        on,

        getResource,
        setResource,
        removeResource,

        getQueryResults,

        spawn,
        despawn,
        getComponent,
        addComponent,
        removeComponent,

        insertSystem,
        insertSystems,
        isSystemActive,
        setSystemActive,

        startup,
        update,
        cleanup,
        start,
    };

    setupSystems();
    setupQueries();

    return api as World<C, E, R, Q, S>;
}

type WorldBuilderApi<
    C extends Component,
    E extends GenericEcsEvent,
    R extends GenericResources,
    Q extends GenericQueries<C>,
    S extends SystemGraph,
> = {
    withResources: <WR extends GenericResources>(resources: WR) => WorldBuilderApi<C, E, R & WR, Q, S>;
    withQueries: <WQ extends GenericQueries>(queries: WQ) => WorldBuilderApi<C, E, R, Q & WQ, S>;
    withSystemGraph: <WSG extends SystemGraph>(
        systemGraph: WSG,
        ...rules: keyof S['systems'] extends never ? [] : [MergeRules<S, WSG>?]
    ) => WorldBuilderApi<C, E, R, Q, SystemGraph<S['systems'] & WSG['systems']>>;
    withPlugin: <PR extends GenericResources, PQ extends GenericQueries<C>, PS extends SystemGraph>(
        plugin: Plugin<C, E, PR, PQ, PS>,
        ...rules: keyof S['systems'] extends never ? [] : [MergeRules<S, PS>?]
    ) => WorldBuilderApi<C, E, R & PR, Q & PQ, SystemGraph<S['systems'] & PS['systems']>>;
    compile: () => World<C, E, R, Q, S>;
};

export function worldBuilder<
    C extends Component,
    E extends GenericEcsEvent = never,
    R extends GenericResources = NonNullable<unknown>,
    Q extends GenericQueries<C> = NonNullable<unknown>,
    S extends SystemGraph = DefaultSystemGraph,
>() {
    const data: WorldBuilderData = {
        resources: {},
        queries: {},
        systemGraph: createDefaultSystemGraph(),
        pluginFns: [],
    };

    const api = {
        withResources: (res: GenericResources) => {
            const resourceKeys = Object.keys(res);

            for (let i = 0; i < resourceKeys.length; i++) {
                const resourceKey = resourceKeys[i];
                data.resources[resourceKey] = res[resourceKey];
            }

            return api;
        },
        withQueries: (qry: GenericQueries) => {
            const queryKeys = Object.keys(qry);

            for (let i = 0; i < queryKeys.length; i++) {
                const queryKey = queryKeys[i];
                data.queries[queryKey] = qry[queryKey];
            }

            return api;
        },
        withSystemGraph: (graph: SystemGraph, mergeRules?: MergeRules<SystemGraph, SystemGraph>) => {
            data.systemGraph = mergeSystemGraphs(data.systemGraph, graph, mergeRules);
            return api;
        },
        withPlugin: (plugin: Plugin, mergeRules?: MergeRules<SystemGraph, SystemGraph>) => {
            data.pluginFns.push(plugin.build as never);
            return api
                .withResources(plugin.resources)
                .withQueries(plugin.queries)
                .withSystemGraph(plugin.systemGraph, mergeRules);
        },
        compile: () => {
            const world = createWorld<C, E, R, Q, S>(data);
            return world;
        },
    };

    return api as unknown as WorldBuilderApi<C, E, R, Q, S>;
}
