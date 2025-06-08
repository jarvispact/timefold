import {
    arraySwapDelete,
    createRunSystemsWithUpdateArgs,
    createRunSystemsWithWorldArg,
    findComponentByTypes,
    isPromise,
    removeComponentByType,
    runSystemsWithoutArgs,
    sortPlugin,
    sortSystem,
    Subscriber,
} from './internal';
import { EntityId } from './misc';
import { Component } from './component';
import { EcsPlugin, isParallelPlugin } from './plugin';
import {
    AddComponentEcsEvent,
    DespawnEntityEcsEvent,
    EcsEvent,
    GenericEcsEvent,
    RemoveComponentEcsEvent,
    SpawnEntityEcsEvent,
} from './event';
import { EcsSystem, ParallelSystem, SerialSystem, SystemStage } from './system';
import { isHasQueryDefinition, QueryDefinition, QueryTuple } from './query';

export type WorldOptions = {
    targetUpdatesPerSecond: number;
    targetFramesPerSecond: number;
};

const defaultOptions: WorldOptions = {
    targetUpdatesPerSecond: 60,
    targetFramesPerSecond: 60,
};

type RunOptions = {
    loop: boolean;
    printFps: boolean;
};

const defaultRunOptions: RunOptions = {
    loop: true,
    printFps: false,
};

class EcsWorld<
    WorldComponent extends Component,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent[]>,
    WorldResources extends Record<string, unknown> = Record<string, unknown>,
> {
    deltaTime: number = 0;
    time: number = 0;

    private options: WorldOptions;

    private resources: WorldResources = {} as WorldResources;

    private subscribers: Record<EcsEvent<Component[]>['type'], Subscriber[]> = {
        'ecs/spawn-entity': [],
        'ecs/despawn-entity': [],
        'ecs/add-component': [],
        'ecs/remove-component': [],
    };

    private plugins: EcsPlugin[] = [];

    private systems: { [S in SystemStage]: (SerialSystem<S> | ParallelSystem<S>)[] } = {
        startup: [],
        'before-update': [],
        update: [],
        'after-update': [],
        render: [],
        cleanup: [],
    };

    private componentsByEntityId: Record<EntityId, Component[] | undefined> = {};

    constructor(opts?: Partial<WorldOptions>) {
        const options: WorldOptions = { ...defaultOptions, ...opts };
        this.options = options;
    }

    getResource<Id extends keyof WorldResources>(id: Id) {
        return this.resources[id];
    }

    setResource<Id extends keyof WorldResources>(id: Id, resource: WorldResources[Id]) {
        this.resources[id] = resource;
        return this;
    }

    private internalOn<EventType extends EcsEvent<Component[]>['type']>(
        eventType: EventType,
        listener: (event: Extract<EcsEvent<Component[]>, { type: EventType }>) => void,
    ) {
        if (!Array.isArray(this.subscribers[eventType])) {
            this.subscribers[eventType] = [];
        }

        this.subscribers[eventType].push(listener as Subscriber);
    }

    on<EventType extends WorldEvent['type']>(
        eventType: EventType,
        listener: (event: Extract<WorldEvent, { type: EventType }>) => void,
    ) {
        this.internalOn(eventType as never, listener);
    }

    private internalEmit(event: EcsEvent<Component[]>) {
        if (!Array.isArray(this.subscribers[event.type])) {
            this.subscribers[event.type] = [];
        }

        for (let i = 0; i < this.subscribers[event.type].length; i++) {
            const subscriber = this.subscribers[event.type][i];
            subscriber(event);
        }
    }

    emit(event: Exclude<WorldEvent, EcsEvent<WorldComponent[]>>) {
        this.internalEmit(event as never);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerPlugins(plugins: EcsPlugin<any> | EcsPlugin<any>[]) {
        const pluginsArray = Array.isArray(plugins) ? plugins : [plugins];

        for (let i = 0; i < pluginsArray.length; i++) {
            const plugin = pluginsArray[i];
            this.plugins.push(plugin as never);
        }

        this.plugins.sort(sortPlugin);

        return this;
    }

    registerSystems(systems: EcsSystem<SystemStage> | EcsSystem<SystemStage>[]) {
        const systemsArray = Array.isArray(systems) ? systems : [systems];

        let stagesToSort: SystemStage[] = [];

        for (let i = 0; i < systemsArray.length; i++) {
            const system = systemsArray[i];
            this.systems[system.stage].push(system as never);
            stagesToSort.push(system.stage);
        }

        for (let i = 0; i < stagesToSort.length; i++) {
            const stage = stagesToSort[i];
            this.systems[stage].sort(sortSystem);
        }

        stagesToSort = [];

        return this;
    }

    spawnEntity(id: EntityId, components: WorldComponent[]) {
        const entity = { id, components };

        const componentsForEntityId = this.componentsByEntityId[entity.id];
        if (componentsForEntityId) return false;

        this.componentsByEntityId[entity.id] = entity.components;

        this.internalEmit({ type: 'ecs/spawn-entity', payload: entity });

        return true;
    }

    despawnEntity(entityId: EntityId) {
        const componentsForEntityId = this.componentsByEntityId[entityId];
        if (!componentsForEntityId) return false;

        this.internalEmit({
            type: 'ecs/despawn-entity',
            payload: { id: entityId, components: componentsForEntityId },
        });

        this.componentsByEntityId[entityId] = undefined;
        return true;
    }

    spawnBundle({
        id,
        bundle,
        components = [],
    }: {
        id: string;
        bundle:
            | WorldComponent[]
            | ((world: EcsWorld<WorldComponent, EcsEvent<WorldComponent[]>, WorldResources>) => WorldComponent[]);
        components?: WorldComponent[];
    }) {
        const bundleComponents = typeof bundle === 'function' ? bundle(this as never) : bundle;
        return this.spawnEntity(id, [...bundleComponents, ...components]);
    }

    getComponent<T extends WorldComponent['type']>(entityId: EntityId, type: T) {
        const componentsForEntityId = this.componentsByEntityId[entityId];
        if (!componentsForEntityId) return undefined;

        type Component = Extract<WorldComponent, { type: T }>;
        return findComponentByTypes([type], componentsForEntityId) as Component extends never
            ? Component
            : Component | undefined;
    }

    addComponent(entityId: EntityId, component: WorldComponent) {
        const componentsForEntityId = this.componentsByEntityId[entityId];
        if (!componentsForEntityId) return false;

        componentsForEntityId.push(component);
        this.internalEmit({ type: 'ecs/add-component', payload: { entityId, component } });
        return true;
    }

    removeComponent(entityId: EntityId, type: WorldComponent['type']) {
        const componentsForEntityId = this.componentsByEntityId[entityId];
        if (!componentsForEntityId) return false;

        const component = findComponentByTypes([type], componentsForEntityId);
        if (!component) return false;

        this.internalEmit({
            type: 'ecs/remove-component',
            payload: { entityId, component },
        });

        removeComponentByType(type, componentsForEntityId);
        return true;
    }

    createQuery<const QueryDef extends QueryDefinition<WorldComponent>, MapResult>(
        args: { query: QueryDef } & {
            map?: (tuple: QueryTuple<WorldComponent, QueryDef>) => MapResult;
            onAdd?: (item: unknown extends MapResult ? QueryTuple<WorldComponent, QueryDef> : MapResult) => void;
            onRemove?: (id: string) => void;
        },
    ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        const map = (args.map ?? ((val) => val)) as (val: any) => any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onAdd = (args.onAdd ?? (() => {})) as (val: any) => any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onRemove = (args.onRemove ?? (() => {})) as (val: any) => any;

        const queryResult: unknown[][] = [];
        const entityIdQueryResultIdx: EntityId[] = [];
        const entityIdToQueryResultIdx: Record<EntityId, number | undefined> = {};

        const addToQueryResult = (tuple: unknown[], entityId: EntityId) => {
            const mappedTuple = map(tuple) as never;
            queryResult.push(mappedTuple);
            entityIdQueryResultIdx.push(entityId);
            entityIdToQueryResultIdx[entityId] = queryResult.length - 1;
            onAdd(mappedTuple);
        };

        const removeFromQueryResult = (entityId: EntityId) => {
            const idx = entityIdToQueryResultIdx[entityId];

            if (idx !== undefined) {
                const lastEntityIdx = entityIdQueryResultIdx.length - 1;
                const lastEntityId = entityIdQueryResultIdx[lastEntityIdx];

                arraySwapDelete(queryResult, idx);
                arraySwapDelete(entityIdQueryResultIdx, idx);

                // order matters here!!!
                entityIdToQueryResultIdx[lastEntityId] = idx;
                entityIdToQueryResultIdx[entityId] = undefined;
                onRemove(entityId);
            }
        };

        const spawnEntityEventHandler = (event: SpawnEntityEcsEvent<Component[]>) => {
            const tuple: unknown[] = [];

            // special case - tuple with ids only
            if (args.query.tuple.length === 0 && args.query.includeId) {
                tuple.push(event.payload.id);
                addToQueryResult(tuple, event.payload.id);
                return;
            }

            // add the id if specified in the query definition first
            if (args.query.includeId) {
                tuple.push(event.payload.id);
            }

            // ============================= Duplicated block start
            let queryMatchCount = 0;

            for (const item of args.query.tuple) {
                const include = item.include === undefined;

                const component = isHasQueryDefinition(item)
                    ? findComponentByTypes([item.has], event.payload.components)
                    : findComponentByTypes(item.or, event.payload.components);

                if (!component && item.optional) {
                    if (include) tuple.push(undefined);
                    queryMatchCount++;
                } else if (component) {
                    if (include) tuple.push(component);
                    queryMatchCount++;
                }
            }

            // only add the tuple to the query if the whole tuple definition matches
            if (queryMatchCount === args.query.tuple.length) {
                addToQueryResult(tuple, event.payload.id);
            }
            // ============================= Duplicated block end
        };

        const despawnEntityEventHandler = (event: DespawnEntityEcsEvent<Component[]>) => {
            // special case - tuple with ids only
            if (args.query.tuple.length === 0 && args.query.includeId) {
                removeFromQueryResult(event.payload.id);
                return;
            }

            // ============================= Duplicated block start
            let queryMatchCount = 0;

            for (const item of args.query.tuple) {
                const component = isHasQueryDefinition(item)
                    ? findComponentByTypes([item.has], event.payload.components)
                    : findComponentByTypes(item.or, event.payload.components);

                if (!component && item.optional) {
                    queryMatchCount++;
                } else if (component) {
                    queryMatchCount++;
                }
            }

            // only add the tuple to the query if the whole tuple definition matches
            if (queryMatchCount === args.query.tuple.length) {
                removeFromQueryResult(event.payload.id);
            }
            // ============================= Duplicated block end
        };

        const addComponentEventHandler = (event: AddComponentEcsEvent<Component[]>) => {
            // when there is no definition there is nothing to do.
            if (args.query.tuple.length === 0) return;

            const componentsForEntityId = this.componentsByEntityId[event.payload.entityId];
            if (!componentsForEntityId) return;

            // already added to the query - nothing to do
            const queryResultIdx = entityIdToQueryResultIdx[event.payload.entityId];
            if (queryResultIdx !== undefined) return;

            const tuple: unknown[] = [];

            // add the id if specified in the query definition first
            if (args.query.includeId) {
                tuple.push(event.payload.entityId);
            }

            // ============================= Duplicated block start
            let queryMatchCount = 0;

            for (const item of args.query.tuple) {
                const include = item.include === undefined;

                const component = isHasQueryDefinition(item)
                    ? findComponentByTypes([item.has], componentsForEntityId)
                    : findComponentByTypes(item.or, componentsForEntityId);

                if (!component && item.optional) {
                    if (include) tuple.push(undefined);
                    queryMatchCount++;
                } else if (component) {
                    if (include) tuple.push(component);
                    queryMatchCount++;
                }
            }

            // only add the tuple to the query if the whole tuple definition matches
            if (queryMatchCount === args.query.tuple.length) {
                addToQueryResult(tuple, event.payload.entityId);
            }
            // ============================= Duplicated block end
        };

        const removeComponentEventHandler = (event: RemoveComponentEcsEvent<Component[]>) => {
            // when there is no definition there is nothing to do.
            if (args.query.tuple.length === 0) return;

            const componentsForEntityId = this.componentsByEntityId[event.payload.entityId];
            if (!componentsForEntityId) return;

            // already removed from the query - nothing to do
            const queryResultIdx = entityIdToQueryResultIdx[event.payload.entityId];
            if (queryResultIdx === undefined) return;

            // ============================= Duplicated block start
            for (const item of args.query.tuple) {
                const component = isHasQueryDefinition(item)
                    ? findComponentByTypes([item.has], componentsForEntityId)
                    : findComponentByTypes(item.or, componentsForEntityId);

                if (!component && item.optional) {
                    removeFromQueryResult(event.payload.entityId);
                } else if (component) {
                    removeFromQueryResult(event.payload.entityId);
                }
            }
            // ============================= Duplicated block end
        };

        this.internalOn('ecs/spawn-entity', spawnEntityEventHandler);
        this.internalOn('ecs/despawn-entity', despawnEntityEventHandler);
        this.internalOn('ecs/add-component', addComponentEventHandler);
        this.internalOn('ecs/remove-component', removeComponentEventHandler);

        return queryResult as unknown as undefined extends MapResult
            ? QueryTuple<WorldComponent, QueryDef>[]
            : MapResult[];
    }

    async run(options?: Partial<RunOptions>) {
        const opts = { ...defaultRunOptions, ...options };

        const callFnWithWorld = (fn: (world: World<Component>) => unknown) => fn(this as never);

        if (this.plugins.length > 0) {
            for (let i = 0; i < this.plugins.length; i++) {
                const plugin = this.plugins[i];

                if (isParallelPlugin(plugin)) {
                    await Promise.allSettled(plugin.fns.map(callFnWithWorld));
                } else {
                    const maybePromise = plugin.fn(this as never);
                    if (isPromise(maybePromise)) {
                        await maybePromise;
                    }
                }
            }
        }

        const runSystemsWithWorldArg = createRunSystemsWithWorldArg(this);

        if (this.systems['startup'].length > 0) {
            await runSystemsWithWorldArg(this.systems['startup']);
        }

        const updateTimestep = 1000 / this.options.targetUpdatesPerSecond;
        const renderTimestep = 1000 / this.options.targetFramesPerSecond;

        let timeToUpdate = !opts.loop ? 0 : performance.now();
        let timeToRender = !opts.loop ? 0 : performance.now();

        let then = 0;

        const getDelta = (now: number) => {
            now *= 0.001;
            const delta = now - then;
            then = now;
            return delta;
        };

        let oneSecond = performance.now() + 1000;
        let fps = 0;

        const tick = async (time: number) => {
            if (opts.printFps) {
                fps++;

                if (performance.now() >= oneSecond) {
                    console.log(`fps: ${fps}`);
                    fps = 0;
                    oneSecond = performance.now() + 1000;
                }
            }

            if (!opts.loop) {
                this.deltaTime = 0;
                this.time = 0;
            } else {
                this.deltaTime = getDelta(time);
                this.time = time;
            }

            const runSystems = createRunSystemsWithUpdateArgs(this.deltaTime, this.time);

            if (time >= timeToUpdate) {
                if (this.systems['before-update'].length > 0) {
                    await runSystems(this.systems['before-update']);
                }

                if (this.systems['update'].length > 0) {
                    await runSystems(this.systems['update']);
                }

                if (this.systems['after-update'].length > 0) {
                    await runSystems(this.systems['after-update']);
                }

                timeToUpdate += updateTimestep;
            }

            if (time >= timeToRender) {
                if (this.systems['render'].length > 0) {
                    await runSystemsWithoutArgs(this.systems['render']);
                }

                timeToRender += renderTimestep;
            }

            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            if (opts.loop) window.requestAnimationFrame(tick);
        };

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.requestAnimationFrame(tick);
    }
}

export type World<
    WorldComponent extends Component,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent[]>,
    Resources extends Record<string, unknown> = Record<string, unknown>,
> = EcsWorld<WorldComponent, WorldEvent, Resources>;

export const createWorld = <
    WorldComponent extends Component,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent[]>,
    Resources extends Record<string, unknown> = Record<string, unknown>,
>(
    options?: Partial<WorldOptions>,
): EcsWorld<WorldComponent, WorldEvent, Resources> => new EcsWorld(options);
