import { Bitmask, satisfiesBitmask } from './bitmask';
import { Component } from './component';
import { Entity } from './entity';
import { CreateQueryArgs } from './query';

export type EntityMapEntry = {
    bitmask: Bitmask;
    components: Map<Component['type'], Component>;
};

export type SerializeOptions<WorldComponent extends Component = Component> = {
    serializeComponent?: (component: WorldComponent) => string;
};

export type DeserializeOptions<WorldComponent extends Component = Component> = {
    deserializeComponent?: (serialized: string) => WorldComponent;
};

const SERIALIZATION_FORMAT_VERSION = 1;

export function serializeWorld(entities: Map<number, EntityMapEntry>, options: SerializeOptions = {}): string {
    const serializeComponent = options.serializeComponent || ((component: Component) => JSON.stringify(component));

    const sections: string[] = [];

    // [meta] section
    sections.push('[meta]');
    sections.push(`version=${SERIALIZATION_FORMAT_VERSION}`);

    // [entities] section
    sections.push('[entities]');
    const entityIds = entities.keys();
    for (const entityId of entityIds) {
        const entityEntry = entities.get(entityId);
        if (!entityEntry) continue;

        const parts: string[] = [];
        const componentTypes = entityEntry.components.keys();
        for (const componentType of componentTypes) {
            const component = entityEntry.components.get(componentType);
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
    spawn: (entityId: number, components: WorldComponent[]) => void,
    options: DeserializeOptions = {},
    serialized: string,
) {
    const deserializeComponent =
        options.deserializeComponent || ((serialized: string) => JSON.parse(serialized) as Component);

    const lines = serialized.split('\n');
    let currentSection: 'meta' | 'componentTypes' | 'entities' | null = null;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
    const queryLength = queries.length;
    for (let i = 0; i < queryLength; i++) {
        const qry = queries[i];
        if (qry.entityToResultIdx.has(entity)) continue;
        if (!satisfiesBitmask(qry.bitmask, entityEntry.bitmask)) continue;
        const tuple: unknown[] = [];

        if (qry.queryArgs.query.includeEntity) {
            tuple.push(entity);
        }

        const tupleLength = qry.queryArgs.query.tuple.length;
        for (let j = 0; j < tupleLength; j++) {
            const item = qry.queryArgs.query.tuple[j];
            const c = entityEntry.components.get(item);
            if (c) tuple.push(c);
        }

        qry.entities.push(entity);
        const item = (qry.queryArgs.map ? qry.queryArgs.map(tuple as never) : tuple) as never;
        qry.result.push(item);
        if (qry.queryArgs.onAdd) qry.queryArgs.onAdd(entity, item);
        qry.entityToResultIdx.set(entity, qry.result.length - 1);
    }
}

export function updateQueriesForDespawn(queries: InternalQuery[], entity: Entity) {
    const queryLength = queries.length;
    for (let i = 0; i < queryLength; i++) {
        const qry = queries[i];

        const idx = qry.entityToResultIdx.get(entity);
        if (idx === undefined) continue;

        const lastIdx = qry.result.length - 1;

        if (idx !== lastIdx) {
            const swappedEntity = qry.entities[lastIdx];
            qry.result[idx] = qry.result[lastIdx];
            qry.entities[idx] = swappedEntity;
            qry.entityToResultIdx.set(swappedEntity, idx);
        }

        qry.result.pop();
        qry.entities.pop();
        qry.entityToResultIdx.delete(entity);

        if (qry.queryArgs.onRemove) qry.queryArgs.onRemove(entity);
    }
}

export function updateQueriesForRemoveComponent(queries: InternalQuery[], entity: Entity, entityBitmask: Bitmask) {
    const queryLength = queries.length;
    for (let i = 0; i < queryLength; i++) {
        const qry = queries[i];

        if (!satisfiesBitmask(qry.bitmask, entityBitmask)) {
            const idx = qry.entityToResultIdx.get(entity);
            if (idx === undefined) continue;

            const lastIdx = qry.result.length - 1;

            if (idx !== lastIdx) {
                const swappedEntity = qry.entities[lastIdx];
                qry.result[idx] = qry.result[lastIdx];
                qry.entities[idx] = swappedEntity;
                qry.entityToResultIdx.set(swappedEntity, idx);
            }

            qry.result.pop();
            qry.entities.pop();
            qry.entityToResultIdx.delete(entity);

            if (qry.queryArgs.onRemove) qry.queryArgs.onRemove(entity);
        }
    }
}
