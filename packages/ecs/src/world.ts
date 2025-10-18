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
    callSystemWithTime,
    createDefaultSystemFn,
    GenericSystemWithFn,
    InternalQuery,
    isSystemActive,
    isWithAnyItem,
    isWithItem,
    updateQueriesForDespawn,
    updateQueriesForRemoveComponent,
    updateQueriesForSpawnAndAddComponent,
} from './internal';
import { MapQueryDefinitionToTuple, QueryDefinitionGeneric } from './query';
import { SystemGraph, SystemStage } from './system';

type EventSubscriber = (payload: unknown) => void;

const COMPONENT_TYPE_DIVISOR = 32;

const defaultSystemGraph: SystemGraph = {
    systems: {},
    orderByStage: {
        startup: [],
        update: [],
        render: [],
        cleanup: [],
    },
};

const createGetDelta = (then: number) => (now: number) => {
    now *= 0.001;
    const delta = now - then;
    then = now;
    return delta;
};

const ONE_SECOND = 1000;

class WorldClass<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    Resources extends Record<string, unknown> = Record<string, unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = Record<
        string,
        QueryDefinitionGeneric<WorldComponent>
    >,
    Graph extends SystemGraph = SystemGraph,
> {
    private initQueriesCalled = false;
    private initSystemsCalled = false;
    private startupCalled = false;
    private debugUpdateTotalTimes = { update: 0, render: 0 };
    private debugUpdatesPerSecond = { update: 0, render: 0 };
    private debugTimeToPrint = performance.now() + ONE_SECOND;
    private debugUpdateRuns = 0;

    private resources: Record<string, unknown> = {};
    private queries: Record<string, QueryDefinitionGeneric<WorldComponent>> = {};
    private systemGraph: SystemGraph = defaultSystemGraph;

    private subscribersByEventType: Record<string, EventSubscriber[] | undefined> = {};

    private internalQueries: InternalQuery[] = [];
    private nameToQueryIdx: Record<string, number | undefined> = {};

    private entities = new Map<number, { componentsByType: Map<number, WorldComponent>; bitmasks: Bitmasks }>();

    private systemsByStage: { [S in SystemStage]: (GenericSystemWithFn | GenericSystemWithFn[])[] } = {
        startup: [],
        update: [],
        render: [],
        cleanup: [],
    };
    private nameToStageAndIndex: Record<string, { stage: SystemStage; index: [number] | [number, number] }> = {};

    private getDelta = createGetDelta(0);

    // builder methods

    withResources<T extends Record<string, unknown>>(resources: T) {
        this.resources = resources;
        return this as unknown as WorldClass<WorldComponent, CustomEvent, T, Queries, Graph>;
    }

    withQueries<T extends Record<string, QueryDefinitionGeneric<WorldComponent>>>(queries: T) {
        this.queries = queries;
        this.initQueries();
        return this as unknown as WorldClass<WorldComponent, CustomEvent, Resources, T, Graph>;
    }

    withSystemGraph<T extends SystemGraph>(systemGraph: T) {
        this.systemGraph = systemGraph;
        this.initSystems();
        return this as unknown as WorldClass<WorldComponent, CustomEvent, Resources, Queries, T>;
    }

    // set methods

    setResources(resources: Resources) {
        this.resources = resources;
        return this;
    }

    setQueries(queries: Queries) {
        this.queries = queries;
        this.initQueries();
        return this;
    }

    setSystemGraph(systemGraph: Graph) {
        this.systemGraph = systemGraph;
        this.initSystems();
        return this;
    }

    // events

    private internalEmit(event: EcsEvent<WorldComponent, Resources>) {
        this.emit(event as unknown as CustomEvent);
    }

    emit(event: CustomEvent): void {
        const subscribers = this.subscribersByEventType[event.type];
        if (!subscribers) return;

        for (let i = 0; i < subscribers.length; i++) {
            const subscriber = subscribers[i];
            subscriber((event as unknown as { payload: unknown }).payload);
        }
    }

    on<EventType extends (CustomEvent | EcsEvent<WorldComponent, Resources>)['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<CustomEvent | EcsEvent<WorldComponent, Resources>, { type: EventType }> extends {
                payload: infer Payload;
            }
                ? [Payload]
                : []
        ) => void,
    ): void {
        if (!this.subscribersByEventType[type]) {
            this.subscribersByEventType[type] = [];
        }

        this.subscribersByEventType[type].push(cb as EventSubscriber);
    }

    // resources

    getResource<Name extends keyof Resources>(name: Name) {
        return this.resources[name as string] as Resources[Name];
    }

    setResource<Name extends keyof Resources>(name: Name, data: Resources[Name]): void {
        this.resources[name as string] = data;

        const event: SetResourceEcsEvent<Resources, keyof Resources> = {
            type: 'ecs/set-resource',
            payload: { name, data } as never,
        };

        this.internalEmit(event);
    }

    removeResource(name: keyof Resources): void {
        const data = this.resources[name as string];

        const event: RemoveResourceEcsEvent<Resources, keyof Resources> = {
            type: 'ecs/remove-resource',
            payload: { name, data } as never,
        };

        this.internalEmit(event);

        this.resources[name as string] = undefined;
    }

    // query

    private initQueries() {
        if (this.initQueriesCalled) return;

        const queryKeys = Object.keys(this.queries);

        for (let i = 0; i < queryKeys.length; i++) {
            const name = queryKeys[i];
            const query = this.queries[name];

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

            this.internalQueries.push({
                name,
                defintion: query,
                bitmasks,
                flags,
                entityToResultIdx: new Map(),
                entities: [],
                result: [],
            });

            this.nameToQueryIdx[name] = this.internalQueries.length - 1;
        }

        this.initQueriesCalled = true;
    }

    getQueryResults<Name extends keyof Queries>(
        name: Name,
    ): MapQueryDefinitionToTuple<WorldComponent, Queries[Name]>[] {
        const idx = this.nameToQueryIdx[name as string];
        if (idx === undefined) {
            console.warn(`Query with name "${String(name)}" does not exist. Returning empty array.`);
            return [];
        }

        return this.internalQueries[idx].result as MapQueryDefinitionToTuple<WorldComponent, Queries[Name]>[];
    }

    // entities / components

    spawn(entity: Entity, components: WorldComponent[]): Entity {
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

        this.entities.set(entity, { componentsByType, bitmasks });

        const event: SpawnEntityEcsEvent<WorldComponent> = {
            type: 'ecs/spawn-entity',
            payload: { entity, components },
        };

        this.internalEmit(event);

        updateQueriesForSpawnAndAddComponent(this.internalQueries, bitmasks, entity, componentsByType);

        return entity;
    }

    despawn(entity: Entity): boolean {
        const entry = this.entities.get(entity);
        if (entry === undefined) return false;

        const event: DespawnEntityEcsEvent = {
            type: 'ecs/despawn-entity',
            payload: { entity },
        };

        this.internalEmit(event);

        updateQueriesForDespawn(this.internalQueries, entity);

        this.entities.delete(entity);
        return true;
    }

    getComponent<ComponentType extends WorldComponent['type']>(entity: Entity, componentType: ComponentType) {
        const entry = this.entities.get(entity);
        if (entry === undefined) return undefined;
        return entry.componentsByType.get(componentType) as Extract<WorldComponent, { type: ComponentType }>;
    }

    addComponent(entity: Entity, component: WorldComponent): boolean {
        const entry = this.entities.get(entity);
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

        this.internalEmit(event);

        updateQueriesForSpawnAndAddComponent(this.internalQueries, entry.bitmasks, entity, entry.componentsByType);

        return true;
    }

    removeComponent(entity: Entity, componentType: WorldComponent['type']): boolean {
        const entry = this.entities.get(entity);
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

        this.internalEmit(event);

        updateQueriesForRemoveComponent(this.internalQueries, entity, entry.bitmasks);

        return true;
    }

    // systems

    private initSystems() {
        if (this.initSystemsCalled) return;

        const map = (
            systemName: (string | number | symbol) | (string | number | symbol)[],
            idx: number,
        ): GenericSystemWithFn | GenericSystemWithFn[] => {
            if (Array.isArray(systemName))
                return systemName.map((n, idx2) => {
                    const system = this.systemGraph.systems[n.toString()];
                    this.nameToStageAndIndex[n.toString()] = { stage: system.stage, index: [idx, idx2] };
                    return {
                        active: system.active,
                        async: system.async,
                        fn: createDefaultSystemFn(n.toString(), system.async),
                    };
                });

            const system = this.systemGraph.systems[systemName.toString()];
            this.nameToStageAndIndex[systemName.toString()] = { stage: system.stage, index: [idx] };
            return {
                active: system.active,
                async: system.async,
                fn: createDefaultSystemFn(systemName.toString(), system.async),
            };
        };

        this.systemsByStage = {
            startup: this.systemGraph.orderByStage.startup.map(map),
            update: this.systemGraph.orderByStage.update.map(map),
            render: this.systemGraph.orderByStage.render.map(map),
            cleanup: this.systemGraph.orderByStage.cleanup.map(map),
        };

        this.initSystemsCalled = true;
    }

    private getSystem(name: string) {
        const result = this.nameToStageAndIndex[name];

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!result) return;

        const systemList = this.systemsByStage[result.stage];

        return (
            result.index.length === 2
                ? (systemList[result.index[0]] as unknown[])[result.index[1]]
                : systemList[result.index[0]]
        ) as GenericSystemWithFn;
    }

    insertSystem<Name extends keyof Graph['systems']>(
        name: Name,
        fn: Graph['systems'][Name]['stage'] extends 'update' | 'render'
            ? Graph['systems'][Name]['async'] extends true
                ? (delta: number, time: number) => Promise<void>
                : (delta: number, time: number) => void
            : Graph['systems'][Name]['async'] extends true
              ? () => Promise<void>
              : () => void,
    ) {
        const system = this.getSystem(name as string);
        if (!system) return this;
        system.fn = fn;
        return this;
    }

    insertSystems(
        systems: Partial<{
            [K in keyof Graph['systems']]: Graph['systems'][K]['stage'] extends 'update' | 'render'
                ? Graph['systems'][K]['async'] extends true
                    ? (delta: number, time: number) => Promise<void>
                    : (delta: number, time: number) => void
                : Graph['systems'][K]['async'] extends true
                  ? () => Promise<void>
                  : () => void;
        }>,
    ) {
        for (const name in systems) {
            this.insertSystem(name, systems[name] as never);
        }

        return this;
    }

    getSystemActiveState(name: keyof Graph['systems']): boolean {
        const system = this.getSystem(name as string);
        if (!system) return false;

        return system.active;
    }

    setSystemActiveState(name: keyof Graph['systems'], active: boolean): void {
        const system = this.getSystem(name as string);
        if (!system) return;

        system.active = active;
    }

    // startup, update, render, cleanup

    async startup() {
        if (this.startupCalled) return;

        if (!this.initSystemsCalled || !this.initQueriesCalled) {
            console.error(`Can only startup the world when systems and queries were setup already.`);
            return;
        }

        this.getDelta = createGetDelta(0);

        const startupSystemList = this.systemsByStage.startup;

        for (let i = 0; i < startupSystemList.length; i++) {
            const systemOrSystemList = startupSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(systemOrSystemList.filter(isSystemActive).map(callSystem));
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn();
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }

        this.startupCalled = true;
    }

    async update(time: number) {
        const delta = this.getDelta(time);

        const updateSystemList = this.systemsByStage.update;

        for (let i = 0; i < updateSystemList.length; i++) {
            const systemOrSystemList = updateSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(
                    systemOrSystemList.filter(isSystemActive).map(callSystemWithTime(delta, time)),
                );
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn(delta, time);
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }

        const renderSystemList = this.systemsByStage.render;

        for (let i = 0; i < renderSystemList.length; i++) {
            const systemOrSystemList = renderSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(
                    systemOrSystemList.filter(isSystemActive).map(callSystemWithTime(delta, time)),
                );
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn(delta, time);
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }
    }

    async debugUpdate(time: number) {
        const delta = this.getDelta(time);

        const updateSystemList = this.systemsByStage.update;

        const u1 = performance.now();

        for (let i = 0; i < updateSystemList.length; i++) {
            const systemOrSystemList = updateSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(
                    systemOrSystemList.filter(isSystemActive).map(callSystemWithTime(delta, time)),
                );
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn(delta, time);
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }

        const u2 = performance.now();
        this.debugUpdateTotalTimes.update += u2 - u1;

        const renderSystemList = this.systemsByStage.render;

        const r1 = performance.now();

        for (let i = 0; i < renderSystemList.length; i++) {
            const systemOrSystemList = renderSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(
                    systemOrSystemList.filter(isSystemActive).map(callSystemWithTime(delta, time)),
                );
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn(delta, time);
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }

        const r2 = performance.now();
        this.debugUpdateTotalTimes.render += r2 - r1;

        this.debugUpdateRuns++;
        this.debugUpdatesPerSecond.update++;
        this.debugUpdatesPerSecond.render++;

        if (performance.now() > this.debugTimeToPrint) {
            const avgUpdateTime = (this.debugUpdateTotalTimes.update / this.debugUpdateRuns).toFixed(2);
            const avgRenderTime = (this.debugUpdateTotalTimes.render / this.debugUpdateRuns).toFixed(2);
            const updatesPerSecond = this.debugUpdatesPerSecond.update.toString();
            const rendersPerSecond = this.debugUpdatesPerSecond.render.toString();

            console.log(
                `Avg update time: ${avgUpdateTime} | Avg render time: ${avgRenderTime} | updates per second: ${updatesPerSecond} | renders per second: ${rendersPerSecond}`,
            );

            this.debugUpdatesPerSecond.update = 0;
            this.debugUpdatesPerSecond.render = 0;
            this.debugTimeToPrint = performance.now() + ONE_SECOND;
        }
    }

    async cleanup() {
        const cleanupSystemList = this.systemsByStage.cleanup;

        for (let i = 0; i < cleanupSystemList.length; i++) {
            const systemOrSystemList = cleanupSystemList[i];
            if (Array.isArray(systemOrSystemList)) {
                await Promise.allSettled(systemOrSystemList.filter(isSystemActive).map(callSystem));
            } else if (systemOrSystemList.active) {
                const maybePromise = systemOrSystemList.fn();
                if (maybePromise && 'then' in maybePromise) {
                    await maybePromise;
                }
            }
        }
    }

    async start(args: { loop?: boolean } = {}) {
        if (!this.initSystemsCalled || !this.initQueriesCalled) {
            console.error(`Can only startup the world when systems and queries were setup already.`);
            return;
        }

        const loop = args.loop ?? true;

        await this.startup();

        const tick = async (time: number) => {
            await this.update(time);
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            if (loop) window.requestAnimationFrame(tick);
        };

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.requestAnimationFrame(tick);
    }

    async debugStart(args: { loop?: boolean } = {}) {
        if (!this.initSystemsCalled || !this.initQueriesCalled) {
            console.error(`Can only startup the world when systems and queries were setup already.`);
            return;
        }

        const loop = args.loop ?? true;

        await this.startup();

        const tick = async (time: number) => {
            await this.debugUpdate(time);
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            if (loop) window.requestAnimationFrame(tick);
        };

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.requestAnimationFrame(tick);
    }
}

export type World<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    Resources extends Record<string, unknown> = Record<string, unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = Record<
        string,
        QueryDefinitionGeneric<WorldComponent>
    >,
    Graph extends SystemGraph = SystemGraph,
> = WorldClass<WorldComponent, CustomEvent, Resources, Queries, Graph>;

export function createWorld<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    Resources extends Record<string, unknown> = Record<string, unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = Record<
        string,
        QueryDefinitionGeneric<WorldComponent>
    >,
    Graph extends SystemGraph = SystemGraph,
>() {
    return new WorldClass<WorldComponent, CustomEvent, Resources, Queries, Graph>();
}
