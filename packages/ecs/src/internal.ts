/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { addComponentToEntityBitmask, Bitmask, createBitmask, satisfiesBitmask } from './bitmask';
import { Component } from './component';
import { Entity } from './entity';
import { GenericCompiledQuery } from './query';
import { Schema } from './schema';
import { AsyncSystem } from './system';

export type AssumeString<T> = T extends string ? T : never;

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
    buildResultTuple: (entity: Entity, components: Map<string, Component>) => unknown;
    writeResultTuple: (
        results: unknown[],
        denseIndex: number,
        entity: Entity,
        components: Map<string, Component>,
    ) => void;
};

type EntityMap = Map<Entity, { bitmask: Bitmask; components: Map<string, Component> }>;

export const createQueryManager = (
    maxComponentType: number,
    queryDefinitions: GenericCompiledQuery[],
    entityMap: EntityMap,
    componentTypeMap: Map<string, number>,
) => {
    const worldQueries: WorldQuery[] = [];
    const nameToIndex = new Map<string, number>();

    for (let i = 0; i < queryDefinitions.length; i++) {
        const queryDef = queryDefinitions[i];
        nameToIndex.set(queryDef.name, i);

        const bitmask = createBitmask(maxComponentType);
        const resultComponentTypes: string[] = [];

        for (let j = 0; j < queryDef.types.length; j++) {
            const entry = queryDef.types[j];
            if ('with' in entry) {
                const numericType = componentTypeMap.get(entry.with)!;
                addComponentToEntityBitmask(bitmask, 'with', numericType);
                if (!('include' in entry && !entry.include)) {
                    resultComponentTypes.push(entry.with);
                }
            } else {
                const numericType = componentTypeMap.get(entry.without)!;
                addComponentToEntityBitmask(bitmask, 'without', numericType);
            }
        }

        // Create specialized build/write functions per query to eliminate per-entity branching
        const includeEntity = queryDef.includeEntity;
        const mapFn = queryDef.mapFn;

        const buildRawTuple = includeEntity
            ? (entity: Entity, components: Map<string, Component>) => {
                  const tuple: unknown[] = [entity];
                  for (let k = 0; k < resultComponentTypes.length; k++) {
                      tuple.push(components.get(resultComponentTypes[k]));
                  }
                  return tuple;
              }
            : (_entity: Entity, components: Map<string, Component>) => {
                  const tuple: unknown[] = [];
                  for (let k = 0; k < resultComponentTypes.length; k++) {
                      tuple.push(components.get(resultComponentTypes[k]));
                  }
                  return tuple;
              };

        const buildResultTuple = (entity: Entity, components: Map<string, Component>) =>
            mapFn(buildRawTuple(entity, components));

        const writeResultTuple = (
            results: unknown[],
            denseIndex: number,
            entity: Entity,
            components: Map<string, Component>,
        ) => {
            results[denseIndex] = buildResultTuple(entity, components);
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

    const changeQueue: number[] = [];

    const queueStructuralChange = (entity: Entity) => {
        changeQueue.push(entity as number);
    };

    const isInQuery = (wq: WorldQuery, entityId: number): boolean => {
        const denseIndex = wq.sparse[entityId] as number | undefined;
        return denseIndex !== undefined && denseIndex < wq.results.length && wq.rids[denseIndex] === entityId;
    };

    const addToQuery = (wq: WorldQuery, entity: Entity, components: Map<string, Component>) => {
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

    const seen = new Set<number>();

    const flushQueue = () => {
        if (changeQueue.length === 0) return;

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
                    if (inQuery) removeFromQuery(wq, entity);
                    continue;
                }

                const matches = satisfiesBitmask(wq.bitmask, entityEntry.bitmask);

                if (matches && !inQuery) {
                    addToQuery(wq, entity, entityEntry.components);
                } else if (matches && inQuery) {
                    const denseIndex = wq.sparse[entityId];
                    wq.writeResultTuple(wq.results, denseIndex, entity, entityEntry.components);
                } else if (!matches && inQuery) {
                    removeFromQuery(wq, entity);
                }
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

// Copy paste from '@timefold/math' to not have a dependency between packages.
type TypedArray =
    | Uint8ClampedArray
    | Uint8Array
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array;

export type Vec2ArrayType = [number, number];
export type Vec2Type = Vec2ArrayType | TypedArray;

export type Vec3ArrayType = [number, number, number];
export type Vec3Type = Vec3ArrayType | TypedArray;

export type QuatArrayType = [number, number, number, number];
export type QuatType = QuatArrayType | TypedArray;

export const callAsyncSystem = (system: AsyncSystem) => system.fn();
