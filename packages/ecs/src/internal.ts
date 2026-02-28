/* eslint-disable @typescript-eslint/no-explicit-any */

import { addComponentToEntityBitmask, Bitmask, createBitmask, satisfiesBitmask } from './bitmask';
import { Component } from './component';
import { Entity } from './entity';
import { GenericCompiledQuery } from './query';
import { Schema } from './schema';

export type Prettify<T extends Record<string, unknown>> = { [K in keyof T]: T[K] } & {};

export type RemoveReadonly<T> = { -readonly [K in keyof T]: T[K] };

export type Reverse<T extends unknown[], Result extends unknown[] = []> = T extends [infer Head, ...infer Tail]
    ? Reverse<Tail, [Head, ...Result]>
    : Result;

export type GenericComponentDefinition = { name: string; definition?: Schema<string, any> };

export type IndexTupleByName<
    T extends { name: string }[],
    ByName extends Record<string, unknown> = NonNullable<unknown>,
> = T extends [infer First extends { name: string }, ...infer Rest extends { name: string }[]]
    ? IndexTupleByName<Rest, ByName & Record<First['name'], First>>
    : ByName;

export type TupleOfLength<Length extends number, Type, Result extends Type[] = []> = Length extends Result['length']
    ? Result
    : TupleOfLength<Length, Type, [...Result, Type]>;

export const createEntityManager = () => {
    let entityCounter = 0;
    const recycleBin: Entity[] = [];

    const createEntity = (): Entity => {
        if (recycleBin.length > 0) return recycleBin.pop() as Entity;
        return entityCounter++ as Entity;
    };

    const createEntities = (count: number): Entity[] => {
        const result: Entity[] = [];

        for (let i = 0; i < count; i++) {
            result.push(createEntity());
        }

        return result;
    };

    const recycleEntity = (entity: Entity) => {
        recycleBin.push(entity);
    };

    return {
        createEntity,
        createEntities,
        recycleEntity,
    };
};

type WorldQuery = {
    bitmask: Bitmask;
    results: unknown[];
    rids: number[]; // dense index → entity id (reverse-id)
    sparse: number[]; // entity id → dense index
    buildResultTuple: (entity: Entity, components: Map<Component['type'], Component>) => unknown[];
    writeResultTuple: (tuple: unknown[], entity: Entity, components: Map<Component['type'], Component>) => void;
};

type EntityMap = Map<Entity, { bitmask: Bitmask; components: Map<Component['type'], Component> }>;

export const createQueryManager = (
    maxComponentType: number,
    queryDefinitions: GenericCompiledQuery[],
    entityMap: EntityMap,
) => {
    const worldQueries: WorldQuery[] = [];
    const nameToIndex = new Map<string, number>();

    for (let i = 0; i < queryDefinitions.length; i++) {
        const queryDef = queryDefinitions[i];
        nameToIndex.set(queryDef.name, i);

        const bitmask = createBitmask(maxComponentType);
        const resultComponentTypes: number[] = [];

        for (let j = 0; j < queryDef.types.length; j++) {
            const entry = queryDef.types[j];
            if ('with' in entry) {
                addComponentToEntityBitmask(bitmask, 'with', entry.with);
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (!('include' in entry && !entry.include)) {
                    resultComponentTypes.push(entry.with);
                }
            } else {
                addComponentToEntityBitmask(bitmask, 'without', entry.without);
            }
        }

        // Create specialized build/write functions per query to eliminate per-entity branching
        const includeEntity = queryDef.includeEntity;

        const buildResultTuple = includeEntity
            ? (entity: Entity, components: Map<Component['type'], Component>) => {
                  const tuple: unknown[] = [entity];
                  for (let k = 0; k < resultComponentTypes.length; k++) {
                      tuple.push(components.get(resultComponentTypes[k]));
                  }
                  return tuple;
              }
            : (_entity: Entity, components: Map<Component['type'], Component>) => {
                  const tuple: unknown[] = [];
                  for (let k = 0; k < resultComponentTypes.length; k++) {
                      tuple.push(components.get(resultComponentTypes[k]));
                  }
                  return tuple;
              };

        const writeResultTuple = includeEntity
            ? (tuple: unknown[], entity: Entity, components: Map<Component['type'], Component>) => {
                  tuple[0] = entity;
                  for (let k = 0; k < resultComponentTypes.length; k++) {
                      tuple[k + 1] = components.get(resultComponentTypes[k]);
                  }
              }
            : (tuple: unknown[], _entity: Entity, components: Map<Component['type'], Component>) => {
                  for (let k = 0; k < resultComponentTypes.length; k++) {
                      tuple[k] = components.get(resultComponentTypes[k]);
                  }
              };

        worldQueries.push({
            bitmask,
            results: [],
            rids: [],
            sparse: [],
            buildResultTuple,
            writeResultTuple,
        });
    }

    // Structural change queue — plain entity id array (PACKED_SMI_ELEMENTS)
    const changeQueue: number[] = [];

    const queueStructuralChange = (entity: Entity) => {
        changeQueue.push(entity as number);
    };

    const isInQuery = (wq: WorldQuery, entityId: number): boolean => {
        const denseIndex = wq.sparse[entityId] as number | undefined;
        return denseIndex !== undefined && denseIndex < wq.results.length && wq.rids[denseIndex] === entityId;
    };

    const addToQuery = (wq: WorldQuery, entity: Entity, components: Map<Component['type'], Component>) => {
        const entityId = entity as number;
        const denseIndex = wq.results.length;

        wq.sparse[entityId] = denseIndex;
        wq.results.push(wq.buildResultTuple(entity, components));
        wq.rids[denseIndex] = entityId;
    };

    const removeFromQuery = (wq: WorldQuery, entity: Entity) => {
        const entityId = entity as number;
        const denseIndex = wq.sparse[entityId];
        const lastDenseIndex = wq.results.length - 1;

        if (denseIndex !== lastDenseIndex) {
            // Swap with last
            wq.results[denseIndex] = wq.results[lastDenseIndex];
            wq.rids[denseIndex] = wq.rids[lastDenseIndex];
            // Update sparse for the swapped-in entity
            wq.sparse[wq.rids[denseIndex]] = denseIndex;
        }

        wq.results.pop();
    };

    // Reusable dedup set — cleared each flush instead of reallocated
    const seen = new Set<number>();

    const flushQueue = () => {
        seen.clear();

        for (let i = 0; i < changeQueue.length; i++) {
            const entityId = changeQueue[i];

            if (seen.has(entityId)) continue;
            seen.add(entityId);

            const entity = entityId as Entity;
            const entityEntry = entityMap.get(entity);

            for (let q = 0; q < worldQueries.length; q++) {
                const wq = worldQueries[q];
                const inQuery = isInQuery(wq, entityId);

                if (!entityEntry) {
                    // Entity was despawned — remove from any query it's in
                    if (inQuery) removeFromQuery(wq, entity);
                    continue;
                }

                const matches = satisfiesBitmask(wq.bitmask, entityEntry.bitmask);

                if (matches && !inQuery) {
                    addToQuery(wq, entity, entityEntry.components);
                } else if (matches && inQuery) {
                    // Update result tuple in place (component data may have changed)
                    const denseIndex = wq.sparse[entityId];
                    wq.writeResultTuple(wq.results[denseIndex] as unknown[], entity, entityEntry.components);
                } else if (!matches && inQuery) {
                    removeFromQuery(wq, entity);
                }
                // !matches && !inQuery → no-op
            }
        }

        changeQueue.length = 0;
    };

    const getQueryResults = (name: string) => {
        const index = nameToIndex.get(name);
        if (index === undefined) return undefined;
        return worldQueries[index].results;
    };

    return {
        queueStructuralChange,
        flushQueue,
        getQueryResults,
    };
};
