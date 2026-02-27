/* eslint-disable @typescript-eslint/no-explicit-any */

import { Bitmask, createBitmask } from './bitmask';
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

export const indexTupleByName = (tuple: { name: string }[]) => {
    const result: Record<string, unknown> = {};

    for (const item of tuple) {
        result[item.name] = item;
    }

    return result;
};

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
    | { type: 'spawn' }
    | { type: 'addComponent' }
    | { type: 'removeComponent' }
    | { type: 'despawn' };

type WorldQuery = {
    bitmask: Bitmask;
    results: unknown[];
    meta: { rid: number; vid: number }[]; // rid = reverse-id, vid = validity-id
    sparse: number[]; // ID → dense index
    sparseLen: number; // logical length of sparse/meta pool
};

export const createQueryManager = (maxComponentType: number, queryDefinitions: GenericCompiledQuery[]) => {
    const worldQueries: WorldQuery[] = [];
    const nameToIndex = new Map<string, number>();

    for (let i = 0; i < queryDefinitions.length; i++) {
        const queryDef = queryDefinitions[i];
        nameToIndex.set(queryDef.name, i);
        worldQueries.push({
            bitmask: createBitmask(maxComponentType),
            results: [],
            meta: [],
            sparse: [],
            sparseLen: 0,
        });
    }

    const structuralChangeQueue: StructuralChange[] = [];

    const addStructuralChange = (change: StructuralChange) => {
        structuralChangeQueue.push(change);
    };

    const updateQueries = () => {
        // TODO: loop through all queries and update them based on the structuralChangeQueue that happened since the last update
        structuralChangeQueue.length = 0;
    };

    const getQueryResults = (name: string) => {
        const index = nameToIndex.get(name);
        if (index === undefined) return undefined;
        return worldQueries[index].results;
    };

    return {
        addStructuralChange,
        updateQueries,
        getQueryResults,
    };
};
