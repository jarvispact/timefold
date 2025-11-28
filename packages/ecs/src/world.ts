import { addComponentToBitmask, createBitmask, removeComponentFromBitmask } from './bitmask';
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
    DeserializeOptions,
    deserializeWorld,
    EntityMapEntry,
    InternalQuery,
    SerializeOptions,
    serializeWorld,
    updateQueriesForDespawn,
    updateQueriesForRemoveComponent,
    updateQueriesForSpawnAndAddComponent,
} from './internal';
import { CreateQueryArgs, CreateQueryResultItem, GenericQueryDefinition } from './query';

type EventSubscriber = (payload: unknown) => void;

export type World<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    WorldResources extends Record<string, unknown> = Record<string, unknown>,
> = {
    serialize: (options?: SerializeOptions<WorldComponent>) => string;
    deserialize: (serialized: string, options?: DeserializeOptions<WorldComponent>) => void;

    emit: (
        event: CustomEvent['type'] extends never ? GenericEcsEvent : CustomEvent,
    ) => World<WorldComponent, CustomEvent, WorldResources>;
    on: <EventType extends (CustomEvent | EcsEvent<WorldComponent, WorldResources>)['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<CustomEvent | EcsEvent<WorldComponent, WorldResources>, { type: EventType }> extends {
                payload: infer Payload;
            }
                ? [Payload]
                : []
        ) => void,
    ) => World<WorldComponent, CustomEvent, WorldResources>;

    createEntity: () => Entity;
    spawn: (entity: Entity, components: WorldComponent[]) => void;
    despawn: (entity: Entity) => void;
    addComponent: (entity: Entity, component: WorldComponent) => void;
    removeComponent: (entity: Entity, componentType: WorldComponent['type']) => void;
    getComponent: <Type extends WorldComponent['type']>(
        entity: Entity,
        componentType: Type,
    ) => Extract<WorldComponent, { type: Type }> | undefined;

    setResource: <Name extends keyof WorldResources>(name: Name, data: WorldResources[Name]) => void;
    getResource: <Name extends keyof WorldResources>(name: Name) => WorldResources[Name];
    removeResource: (name: keyof WorldResources) => void;

    createQuery: <const Definition extends GenericQueryDefinition<WorldComponent>, MapResult>(
        args: CreateQueryArgs<WorldComponent, Definition, MapResult>,
    ) => CreateQueryResultItem<WorldComponent, Definition, MapResult>[];
};

export function createWorld<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    WorldResources extends Record<string, unknown> = Record<string, unknown>,
>(): World<WorldComponent, CustomEvent, WorldResources> {
    const subscribersByEventType: Record<string, EventSubscriber[] | undefined> = {};
    const resources: Record<string, unknown> = {};

    let entityCounter = 0;
    const entities = new Map<number, EntityMapEntry>();
    const deletedEntityIdPool: Entity[] = [];

    // TODO: We could move the update of the queries to the end of a tick
    // that could save some computations when multiple actions are taken on a entity within the same frame.
    // This comes at the cost that a query is not up to date immediately. But thats maybe ok???
    const queries: InternalQuery[] = [];

    function serialize(options: SerializeOptions = {}): string {
        return serializeWorld(entities, options);
    }

    function deserialize(serialized: string, options: DeserializeOptions = {}) {
        deserializeWorld(spawn, options, serialized);
        entityCounter = entities.size;
    }

    function emit(event: EcsEvent) {
        const subscribers = subscribersByEventType[event.type];
        if (!subscribers) return;

        for (let i = 0; i < subscribers.length; i++) {
            const subscriber = subscribers[i];
            subscriber((event as unknown as { payload: unknown }).payload);
        }

        return world;
    }

    function on<EventType extends EcsEvent['type']>(
        type: EventType,
        cb: (
            ...payload: Extract<EcsEvent, { type: EventType }> extends {
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

        return world;
    }

    function createEntity(): Entity {
        if (deletedEntityIdPool.length > 0) {
            const id = deletedEntityIdPool.pop();
            if (id !== undefined) return id;
        }

        return entityCounter++;
    }

    function spawn(entity: Entity, components: WorldComponent[]) {
        if (entities.has(entity)) {
            console.error(`Entity ${entity} already exists in the world.`);
            return;
        }

        const entityMapEntry: EntityMapEntry = {
            bitmask: createBitmask(),
            components: new Map(),
        };

        for (const component of components) {
            addComponentToBitmask(entityMapEntry.bitmask, component.type);
            entityMapEntry.components.set(component.type, component);
        }

        entities.set(entity, entityMapEntry);

        const event: SpawnEntityEcsEvent<WorldComponent> = {
            type: 'ecs/spawn-entity',
            payload: { entity, components },
        };

        emit(event as never);

        updateQueriesForSpawnAndAddComponent(queries, entity, entityMapEntry);
    }

    function despawn(entity: Entity) {
        if (!entities.has(entity)) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        const event: DespawnEntityEcsEvent = {
            type: 'ecs/despawn-entity',
            payload: { entity },
        };

        emit(event as never);

        entities.delete(entity);
        deletedEntityIdPool.push(entity);

        updateQueriesForDespawn(queries, entity);
    }

    function addComponent(entity: Entity, component: WorldComponent) {
        const entityEntry = entities.get(entity);
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        addComponentToBitmask(entityEntry.bitmask, component.type);
        entityEntry.components.set(component.type, component);

        const event: AddComponentEcsEvent<WorldComponent> = {
            type: 'ecs/add-component',
            payload: { entity, component },
        };

        emit(event as never);

        updateQueriesForSpawnAndAddComponent(queries, entity, entityEntry);
    }

    function removeComponent(entity: Entity, componentType: Component['type']) {
        const entityEntry = entities.get(entity);
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        const component = entityEntry.components.get(componentType) as WorldComponent | undefined;
        if (!component) {
            console.error(`Entity ${entity} does not have component of type ${componentType}.`);
            return;
        }

        removeComponentFromBitmask(entityEntry.bitmask, componentType);

        const event: RemoveComponentEcsEvent<WorldComponent> = {
            type: 'ecs/remove-component',
            payload: { entity, component },
        };

        emit(event as never);

        entityEntry.components.delete(componentType);

        updateQueriesForRemoveComponent(queries, entity, entityEntry.bitmask);
    }

    function getComponent(entity: Entity, componentType: Component['type']) {
        const entityEntry = entities.get(entity);
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return undefined;
        }

        return entityEntry.components.get(componentType);
    }

    function setResource(name: string, data: unknown) {
        resources[name] = data;

        const event: SetResourceEcsEvent<WorldResources, keyof WorldResources> = {
            type: 'ecs/set-resource',
            payload: { name, data } as never,
        };

        emit(event as never);
    }

    function getResource(name: string) {
        return resources[name];
    }

    function removeResource(name: string) {
        const data = resources[name];

        const event: RemoveResourceEcsEvent<WorldResources, keyof WorldResources> = {
            type: 'ecs/remove-resource',
            payload: { name, data } as never,
        };

        emit(event as never);

        resources[name] = undefined;
    }

    function createQuery(args: { query: GenericQueryDefinition<WorldComponent>; map?: () => unknown }) {
        const bitmask = createBitmask();

        for (const item of args.query.tuple) {
            addComponentToBitmask(bitmask, item);
        }

        const query: InternalQuery = {
            bitmask,
            entities: [],
            entityToResultIdx: new Map(),
            queryArgs: args,
            result: [],
        };

        queries.push(query);
        return query.result;
    }

    const world = {
        serialize,
        deserialize,

        emit,
        on,

        createEntity,
        spawn,
        despawn,
        addComponent,
        removeComponent,
        getComponent,

        setResource,
        getResource,
        removeResource,

        createQuery,
    } as unknown as World<WorldComponent, CustomEvent, WorldResources>;

    return world;
}
