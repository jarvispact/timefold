import { addBitToBitmask, createBitmask } from './bitmask';
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
import { DeserializeOptions, deserializeWorld, EntityMapEntry, SerializeOptions, serializeWorld } from './internal';
import { GenericQueryDefinition } from './query';

type EventSubscriber = (payload: unknown) => void;

export type World<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    WorldResources extends Record<string, unknown> = Record<string, unknown>,
> = {
    serialize(options?: SerializeOptions<WorldComponent>): string;
    deserialize(serialized: string, options?: DeserializeOptions<WorldComponent>): void;

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

    createEntity(): Entity;
    spawn(entity: Entity, components: WorldComponent[]): void;
    despawn(entity: Entity): void;
    addComponent(entity: Entity, component: WorldComponent): void;
    removeComponent(entity: Entity, componentType: WorldComponent['type']): void;
    getComponent<Type extends WorldComponent['type']>(
        entity: Entity,
        componentType: Type,
    ): Extract<WorldComponent, { type: Type }> | undefined;

    setResource<Name extends keyof WorldResources>(name: Name, data: WorldResources[Name]): void;
    getResource<Name extends keyof WorldResources>(name: Name): WorldResources[Name];
    removeResource(name: keyof WorldResources): void;

    createQuery<const Definition extends GenericQueryDefinition<WorldComponent>>(definition: Definition): Definition;
};

export function createWorld<
    WorldComponent extends Component,
    CustomEvent extends GenericEcsEvent = never,
    WorldResources extends Record<string, unknown> = Record<string, unknown>,
>(): World<WorldComponent, CustomEvent, WorldResources> {
    const subscribersByEventType: Record<string, EventSubscriber[] | undefined> = {};

    let entityCounter = 0;
    const entities: Record<string, EntityMapEntry | undefined> = {};
    const deletedEntityIdPool: Entity[] = [];

    let componentTypeCounter = 0;
    const componentTypeToInt: Record<Component['type'], number | undefined> = {};

    const resources: Record<string, unknown> = {};

    function ensureIntForComponentType(type: Component['type']): number {
        if (componentTypeToInt[type] !== undefined) return componentTypeToInt[type];
        componentTypeToInt[type] = componentTypeCounter++;
        return componentTypeToInt[type];
    }

    function serialize(options: SerializeOptions = {}): string {
        return serializeWorld({ entities, componentTypeToInt }, options);
    }

    function deserialize(serialized: string, options: DeserializeOptions = {}) {
        const result = deserializeWorld({ componentTypeToInt, componentTypeCounter }, spawn, options, serialized);
        componentTypeCounter = result.componentTypeCounter;
        entityCounter = Object.keys(entities).length;
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
        if (entities[entity]) {
            console.error(`Entity ${entity} already exists in the world.`);
            return;
        }

        const entityMapEntry: EntityMapEntry = {
            bitmask: createBitmask(),
            components: {},
        };

        for (const component of components) {
            const int = ensureIntForComponentType(component.type);
            addBitToBitmask(entityMapEntry.bitmask, int);
            entityMapEntry.components[component.type] = component;
        }

        entities[entity] = entityMapEntry;

        const event: SpawnEntityEcsEvent<WorldComponent> = {
            type: 'ecs/spawn-entity',
            payload: { entity, components },
        };

        emit(event as never);
    }

    function despawn(entity: Entity) {
        if (!entities[entity]) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        const event: DespawnEntityEcsEvent = {
            type: 'ecs/despawn-entity',
            payload: { entity },
        };

        emit(event as never);

        entities[entity] = undefined;
        deletedEntityIdPool.push(entity);
    }

    function addComponent(entity: Entity, component: WorldComponent) {
        const entityEntry = entities[entity];
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        const int = ensureIntForComponentType(component.type);
        addBitToBitmask(entityEntry.bitmask, int);
        entityEntry.components[component.type] = component;

        const event: AddComponentEcsEvent<WorldComponent> = {
            type: 'ecs/add-component',
            payload: { entity, component },
        };

        emit(event as never);
    }

    function removeComponent(entity: Entity, componentType: Component['type']) {
        const entityEntry = entities[entity];
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        const component = entityEntry.components[componentType] as WorldComponent | undefined;
        if (!component) {
            console.error(`Entity ${entity} does not have component of type ${componentType}.`);
            return;
        }

        const event: RemoveComponentEcsEvent<WorldComponent> = {
            type: 'ecs/remove-component',
            payload: { entity, component },
        };

        emit(event as never);

        entityEntry.components[componentType] = undefined;
    }

    function getComponent(entity: Entity, componentType: Component['type']) {
        const entityEntry = entities[entity];
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return undefined;
        }

        return entityEntry.components[componentType];
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

    function createQuery(definition: GenericQueryDefinition<WorldComponent>) {
        return definition;
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
