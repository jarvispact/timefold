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

type StructuralChange =
    | { type: 'spawn'; entity: Entity }
    | { type: 'addComponent'; entity: Entity }
    | { type: 'removeComponent'; entity: Entity }
    | { type: 'despawn'; entity: Entity };

type WorldQuery = {
    bitmask: Bitmask;
    results: unknown[];
    meta: { rid: number; vid: number }[]; // rid = reverse-id, vid = validity-id
    sparse: number[]; // ID → dense index
    sparseLen: number; // logical length of sparse/meta pool
    resultComponentTypes: number[]; // ordered component types to include in result tuple
    includeEntity: boolean; // whether to prepend entity ID to result tuple
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

        worldQueries.push({
            bitmask,
            results: [],
            meta: [],
            sparse: [],
            sparseLen: 0,
            resultComponentTypes,
            includeEntity: queryDef.includeEntity,
        });
    }

    const structuralChangeQueue: StructuralChange[] = [];

    const queueStructuralChange = (change: StructuralChange) => {
        structuralChangeQueue.push(change);
    };

    const isInQuery = (wq: WorldQuery, entityId: number): boolean => {
        const denseIndex = wq.sparse[entityId] as number | undefined;
        return denseIndex !== undefined && denseIndex < wq.results.length && wq.meta[denseIndex].rid === entityId;
    };

    const buildResultTuple = (wq: WorldQuery, entity: Entity, components: Map<Component['type'], Component>) => {
        const tuple: unknown[] = [];
        if (wq.includeEntity) tuple.push(entity);

        for (let k = 0; k < wq.resultComponentTypes.length; k++) {
            tuple.push(components.get(wq.resultComponentTypes[k]));
        }

        return tuple;
    };

    const addToQuery = (wq: WorldQuery, entity: Entity, components: Map<Component['type'], Component>) => {
        const entityId = entity as number;
        const denseIndex = wq.results.length;

        // Reuse freed slot in sparse/meta if available, otherwise grow
        if (wq.sparseLen > denseIndex) {
            // There's a freed meta/sparse slot we can reclaim — but we still append to dense
            // The freed slots exist in meta beyond results.length; we don't reuse them for dense.
        }

        wq.sparse[entityId] = denseIndex;
        wq.results.push(buildResultTuple(wq, entity, components));
        wq.meta[denseIndex] = { rid: entityId, vid: 0 };
        if (wq.sparseLen <= denseIndex) wq.sparseLen = denseIndex + 1;
    };

    const removeFromQuery = (wq: WorldQuery, entity: Entity) => {
        const entityId = entity as number;
        const denseIndex = wq.sparse[entityId];
        const lastDenseIndex = wq.results.length - 1;

        if (denseIndex !== lastDenseIndex) {
            // Swap with last
            wq.results[denseIndex] = wq.results[lastDenseIndex];
            wq.meta[denseIndex] = wq.meta[lastDenseIndex];
            // Update sparse for the swapped-in entity
            wq.sparse[wq.meta[denseIndex].rid] = denseIndex;
        }

        wq.results.pop();
        // Invalidate the removed entity's vid (in the now-freed meta slot)
        wq.meta[lastDenseIndex] = { rid: entityId, vid: (wq.meta[lastDenseIndex]?.vid ?? 0) + 1 };
    };

    const flushQueue = () => {
        // Deduplicate entities — process each entity only once
        const seen = new Set<number>();

        for (let i = 0; i < structuralChangeQueue.length; i++) {
            const change = structuralChangeQueue[i];
            const entity = change.entity;
            const entityId = entity as number;

            if (seen.has(entityId)) continue;
            seen.add(entityId);

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
                    wq.results[denseIndex] = buildResultTuple(wq, entity, entityEntry.components);
                } else if (!matches && inQuery) {
                    removeFromQuery(wq, entity);
                }
                // !matches && !inQuery → no-op
            }
        }

        structuralChangeQueue.length = 0;
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
