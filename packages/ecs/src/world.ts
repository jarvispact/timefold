import { addBitToBitmask, createBitmask } from './bitmask';
import { Component } from './component';
import { Entity } from './entity';
import { DeserializeOptions, deserializeWorld, EntityMapEntry, SerializeOptions, serializeWorld } from './internal';
import { GenericQueryDefinition } from './query';

export type World<WorldComponent extends Component> = {
    createEntity(): Entity;
    serialize(options?: SerializeOptions<WorldComponent>): string;
    deserialize(serialized: string, options?: DeserializeOptions<WorldComponent>): void;
    spawn(entity: Entity, components: WorldComponent[]): void;
    despawn(entity: Entity): void;
    addComponent(entity: Entity, component: WorldComponent): void;
    removeComponent(entity: Entity, componentType: WorldComponent['type']): void;
    getComponent<Type extends WorldComponent['type']>(
        entity: Entity,
        componentType: Type,
    ): Extract<WorldComponent, { type: Type }> | undefined;
    createQuery<const Definition extends GenericQueryDefinition<WorldComponent>>(definition: Definition): Definition;
};

export function createWorld<WorldComponent extends Component>(): World<WorldComponent> {
    let entityCounter = 0;
    const entities: Record<string, EntityMapEntry | undefined> = {};
    const deletedEntityIdPool: Entity[] = [];

    let componentTypeCounter = 0;
    const componentTypeToInt: Record<Component['type'], number | undefined> = {};

    function ensureIntForComponentType(type: Component['type']): number {
        if (componentTypeToInt[type] !== undefined) return componentTypeToInt[type];
        componentTypeToInt[type] = componentTypeCounter++;
        return componentTypeToInt[type];
    }

    function createEntity(): Entity {
        if (deletedEntityIdPool.length > 0) {
            const id = deletedEntityIdPool.pop();
            if (id !== undefined) return id;
        }

        return entityCounter++;
    }

    function serialize(options: SerializeOptions = {}): string {
        return serializeWorld({ entities, componentTypeToInt }, options);
    }

    function deserialize(serialized: string, options: DeserializeOptions = {}) {
        const result = deserializeWorld({ componentTypeToInt, componentTypeCounter }, spawn, options, serialized);
        componentTypeCounter = result.componentTypeCounter;
        entityCounter = Object.keys(entities).length;
    }

    function spawn(entity: Entity, components: Component[]) {
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
    }

    function despawn(entity: Entity) {
        if (!entities[entity]) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        entities[entity] = undefined;
        deletedEntityIdPool.push(entity);
    }

    function addComponent(entity: Entity, component: Component) {
        const entityEntry = entities[entity];
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

        const int = ensureIntForComponentType(component.type);
        addBitToBitmask(entityEntry.bitmask, int);
        entityEntry.components[component.type] = component;
    }

    function removeComponent(entity: Entity, componentType: Component['type']) {
        const entityEntry = entities[entity];
        if (!entityEntry) {
            console.error(`Entity ${entity} does not exist in the world.`);
            return;
        }

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

    function createQuery(definition: GenericQueryDefinition<WorldComponent>) {
        return definition;
    }

    const world = {
        createEntity,
        serialize,
        deserialize,
        spawn,
        despawn,
        addComponent,
        removeComponent,
        getComponent,
        createQuery,
    } as World<WorldComponent>;

    return world;
}
