import { addBitToBitmask, Bitmask, createBitmask } from './bitmask';
import { Component } from './component';
import { Entity } from './entity';
import { GenericQueryDefinition } from './query';

type EntityMapEntry = {
    bitmask: Bitmask;
    components: Record<Component['type'], Component | undefined>;
};

type SerializeOptions<WorldComponent extends Component> = {
    serializeComponent?: (component: WorldComponent) => string;
};

type DeserializeOptions<WorldComponent extends Component> = {
    deserializeComponent?: (serialized: string) => WorldComponent;
};

const SERIALIZATION_FORMAT_VERSION = 1;

export function createWorld<WorldComponent extends Component>() {
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

    const world = {
        createEntity(): Entity {
            if (deletedEntityIdPool.length > 0) {
                const id = deletedEntityIdPool.pop();
                if (id !== undefined) return id;
            }

            return entityCounter++;
        },
        serialize(options: SerializeOptions<WorldComponent> = {}): string {
            const serializeComponent =
                options.serializeComponent || ((component: WorldComponent) => JSON.stringify(component));

            const sections: string[] = [];

            // [meta] section
            sections.push('[meta]');
            sections.push(`version=${SERIALIZATION_FORMAT_VERSION}`);

            // [componentTypes] section
            sections.push('[componentTypes]');
            for (const componentType in componentTypeToInt) {
                const int = componentTypeToInt[componentType];
                if (int !== undefined) {
                    sections.push(`${componentType}=${int}`);
                }
            }

            // [entities] section
            sections.push('[entities]');
            for (const entityId in entities) {
                const entityEntry = entities[entityId];
                if (!entityEntry) continue;

                const parts: string[] = [];
                for (const componentType in entityEntry.components) {
                    const component = entityEntry.components[componentType];
                    if (!component) continue;

                    parts.push(serializeComponent(component as WorldComponent));
                }

                if (parts.length > 0) {
                    sections.push(`${entityId}|${parts.join('|')}`);
                }
            }

            return sections.join('\n');
        },
        deserialize(serialized: string, options: DeserializeOptions<WorldComponent> = {}) {
            const deserializeComponent =
                options.deserializeComponent || ((serialized: string) => JSON.parse(serialized) as WorldComponent);

            const lines = serialized.split('\n');
            let currentSection: 'meta' | 'componentTypes' | 'entities' | null = null;
            let version: number | null = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Check for section headers
                if (line === '[meta]') {
                    currentSection = 'meta';
                    continue;
                } else if (line === '[componentTypes]') {
                    currentSection = 'componentTypes';
                    continue;
                } else if (line === '[entities]') {
                    currentSection = 'entities';
                    continue;
                }

                // Process content based on current section
                if (currentSection === 'meta') {
                    if (line.startsWith('version=')) {
                        version = Number.parseInt(line.split('=')[1], 10);
                    }
                } else if (currentSection === 'componentTypes') {
                    const [componentType, intStr] = line.split('=');
                    if (componentType && intStr) {
                        const int = Number.parseInt(intStr, 10);
                        componentTypeToInt[componentType] = int;
                        if (int >= componentTypeCounter) {
                            componentTypeCounter = int + 1;
                        }
                    }
                } else if (currentSection === 'entities') {
                    const parts = line.split('|');
                    if (parts.length < 2) continue;

                    const entityId = Number.parseInt(parts[0], 10);
                    const components: WorldComponent[] = [];

                    for (let j = 1; j < parts.length; j++) {
                        const component = deserializeComponent(parts[j]);
                        components.push(component);
                    }

                    if (components.length > 0) {
                        world.spawn(entityId, components);
                    }
                }
            }

            // You can use version here to perform migrations if needed
            if (version !== null && version !== 1) {
                console.warn(`Deserializing world data version ${version}, current version is 1`);
            }
        },
        spawn(entity: Entity, components: WorldComponent[]) {
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
        },
        despawn(entity: Entity) {
            if (!entities[entity]) {
                console.error(`Entity ${entity} does not exist in the world.`);
                return;
            }

            entities[entity] = undefined;
            deletedEntityIdPool.push(entity);
        },
        addComponent(entity: Entity, component: WorldComponent) {
            const entityEntry = entities[entity];
            if (!entityEntry) {
                console.error(`Entity ${entity} does not exist in the world.`);
                return;
            }

            const int = ensureIntForComponentType(component.type);
            addBitToBitmask(entityEntry.bitmask, int);
            entityEntry.components[component.type] = component;
        },
        removeComponent(entity: Entity, componentType: WorldComponent['type']) {
            const entityEntry = entities[entity];
            if (!entityEntry) {
                console.error(`Entity ${entity} does not exist in the world.`);
                return;
            }

            entityEntry.components[componentType] = undefined;
        },
        getComponent<Type extends WorldComponent['type']>(entity: Entity, componentType: Type) {
            const entityEntry = entities[entity];
            if (!entityEntry) {
                console.error(`Entity ${entity} does not exist in the world.`);
                return undefined;
            }

            return entityEntry.components[componentType] as Extract<WorldComponent, { type: Type }>;
        },
        createQuery<const Definition extends GenericQueryDefinition<WorldComponent>>(definition: Definition) {
            return definition;
        },
    };

    return world;
}
