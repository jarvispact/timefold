import { Bitmask, satisfiesBitmask } from './bitmask';
import { Component } from './component';
import { Entity } from './entity';
import { CreateQueryArgs } from './query';

export type EntityMapEntry = {
    bitmask: Bitmask;
    components: Record<Component['type'], Component | undefined>;
};

export type SerializeOptions<WorldComponent extends Component = Component> = {
    serializeComponent?: (component: WorldComponent) => string;
};

export type DeserializeOptions<WorldComponent extends Component = Component> = {
    deserializeComponent?: (serialized: string) => WorldComponent;
};

const SERIALIZATION_FORMAT_VERSION = 1;

export function serializeWorld(
    world: {
        entities: Record<string, EntityMapEntry | undefined>;
        componentTypeToInt: Record<Component['type'], number | undefined>;
    },
    options: SerializeOptions = {},
): string {
    const serializeComponent = options.serializeComponent || ((component: Component) => JSON.stringify(component));

    const sections: string[] = [];

    // [meta] section
    sections.push('[meta]');
    sections.push(`version=${SERIALIZATION_FORMAT_VERSION}`);

    // [componentTypes] section
    sections.push('[componentTypes]');
    for (const componentType in world.componentTypeToInt) {
        const int = world.componentTypeToInt[componentType];
        if (int !== undefined) {
            sections.push(`${componentType}=${int}`);
        }
    }

    // [entities] section
    sections.push('[entities]');
    for (const entityId in world.entities) {
        const entityEntry = world.entities[entityId];
        if (!entityEntry) continue;

        const parts: string[] = [];
        for (const componentType in entityEntry.components) {
            const component = entityEntry.components[componentType];
            if (!component) continue;

            parts.push(serializeComponent(component));
        }

        if (parts.length > 0) {
            sections.push(`${entityId}|${parts.join('|')}`);
        }
    }

    return sections.join('\n');
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function deserializeWorld<WorldComponent extends Component>(
    world: { componentTypeToInt: Record<Component['type'], number | undefined>; componentTypeCounter: number },
    spawn: (entityId: number, components: WorldComponent[]) => void,
    options: DeserializeOptions = {},
    serialized: string,
) {
    const deserializeComponent =
        options.deserializeComponent || ((serialized: string) => JSON.parse(serialized) as Component);

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
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                version = Number.parseInt(line.split('=')[1], 10);
            }
        } else if (currentSection === 'componentTypes') {
            const [componentType, intStr] = line.split('=');
            if (componentType && intStr) {
                const int = Number.parseInt(intStr, 10);
                world.componentTypeToInt[componentType] = int;
                if (int >= world.componentTypeCounter) {
                    world.componentTypeCounter = int + 1;
                }
            }
        } else if (currentSection === 'entities') {
            const parts = line.split('|');
            if (parts.length < 2) continue;

            const entityId = Number.parseInt(parts[0], 10);
            const components: Component[] = [];

            for (let j = 1; j < parts.length; j++) {
                const component = deserializeComponent(parts[j]);
                components.push(component);
            }

            if (components.length > 0) {
                spawn(entityId, components as WorldComponent[]);
            }
        }
    }

    return { componentTypeCounter: world.componentTypeCounter };
}

export type InternalQuery = {
    queryArgs: CreateQueryArgs;
    bitmask: Bitmask;
    entityToResultIdx: Map<Entity, number>;
    entities: Entity[];
    result: unknown[];
};

export function updateQueriesForSpawnAndAddComponent(
    queries: InternalQuery[],
    entity: Entity,
    entityEntry: EntityMapEntry,
) {
    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];
        if (qry.entityToResultIdx.has(entity)) continue;
        if (!satisfiesBitmask(qry.bitmask, entityEntry.bitmask)) continue;
        const tuple: unknown[] = [];

        if (qry.queryArgs.query.includeEntity) {
            tuple.push(entity);
        }

        for (let j = 0; j < qry.queryArgs.query.tuple.length; j++) {
            const item = qry.queryArgs.query.tuple[j];
            const c = entityEntry.components[item];
            if (c) tuple.push(c);
        }

        qry.entities.push(entity);
        const item = (qry.queryArgs.map ? qry.queryArgs.map(tuple as never) : tuple) as never;
        qry.result.push(item);
        if (qry.queryArgs.onAdd) qry.queryArgs.onAdd(entity, item);
        qry.entityToResultIdx.set(entity, qry.result.length - 1);
    }
}
