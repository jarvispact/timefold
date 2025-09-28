/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Component } from './component';
import { Entity } from './entity';
import { arraySwapDelete } from './internal';

type QueryDefinitionItemWith<WorldComponent extends Component> = {
    with: WorldComponent['type'];
};

export const isWithItem = <C extends Component>(item: QueryDefinitionItemGeneric): item is QueryDefinitionItemWith<C> =>
    'with' in item;

type QueryDefinitionItemWithAny<WorldComponent extends Component> = {
    withAny: WorldComponent['type'][];
};

export const isWithAnyItem = <C extends Component>(
    item: QueryDefinitionItemGeneric,
): item is QueryDefinitionItemWithAny<C> => 'withAny' in item;

type QueryDefinitionItemGeneric<WorldComponent extends Component = Component> =
    | QueryDefinitionItemWith<WorldComponent>
    | QueryDefinitionItemWithAny<WorldComponent>;

export type QueryDefinition<
    WorldComponent extends Component,
    IncludeEntity extends boolean,
    Tuple extends QueryDefinitionItemGeneric<WorldComponent>[],
    MapFn extends ((tuple: any) => any) | undefined = undefined,
> = {
    includeEntity?: IncludeEntity;
    tuple: Tuple;
    map: MapFn;
};

export type QueryDefinitionGeneric<WorldComponent extends Component = Component> = QueryDefinition<
    WorldComponent,
    boolean,
    QueryDefinitionItemGeneric<WorldComponent>[],
    ((tuple: any) => any) | undefined
>;

export type MapQueryDefinitionToTuple<
    WorldComponent extends Component,
    Q extends QueryDefinitionGeneric<WorldComponent>,
    Tuple extends unknown[] = [],
> = Q['tuple'] extends [
    infer Head extends QueryDefinitionItemGeneric<WorldComponent>,
    ...infer Tail extends QueryDefinitionItemGeneric<WorldComponent>[],
]
    ? Head extends { with: WorldComponent['type'] }
        ? MapQueryDefinitionToTuple<
              WorldComponent,
              { includeEntity: Q['includeEntity']; tuple: Tail; map: Q['map'] },
              [
                  ...Tuple,
                  number extends WorldComponent['type'] ? Component : Extract<WorldComponent, { type: Head['with'] }>,
              ]
          >
        : Head extends { withAny: WorldComponent['type'][] }
          ? MapQueryDefinitionToTuple<
                WorldComponent,
                { includeEntity: Q['includeEntity']; tuple: Tail; map: Q['map'] },
                [
                    ...Tuple,
                    number extends WorldComponent['type']
                        ? Component
                        : Extract<WorldComponent, { type: Head['withAny'][number] }>,
                ]
            >
          : MapQueryDefinitionToTuple<
                WorldComponent,
                { includeEntity: Q['includeEntity']; tuple: Tail; map: Q['map'] },
                Tuple
            >
    : true extends Q['includeEntity']
      ? Q['map'] extends (tuple: any) => any
          ? ReturnType<Q['map']>
          : [Entity, ...Tuple]
      : Q['map'] extends (tuple: any) => any
        ? ReturnType<Q['map']>
        : Tuple;

type CollectUsedComponentTypes<
    WorldComponent extends Component,
    Tuple extends QueryDefinitionItemGeneric<WorldComponent>[],
    Result extends number = never,
> = Tuple extends [
    infer Head extends QueryDefinitionItemGeneric<WorldComponent>,
    ...infer Tail extends QueryDefinitionItemGeneric<WorldComponent>[],
]
    ? Head extends { with: WorldComponent['type'] }
        ? CollectUsedComponentTypes<WorldComponent, Tail, Result | Head['with']>
        : Head extends { without: WorldComponent['type'] }
          ? CollectUsedComponentTypes<WorldComponent, Tail, Result | Head['without']>
          : Head extends { withAny: WorldComponent['type'][] }
            ? CollectUsedComponentTypes<WorldComponent, Tail, Result | Head['withAny'][number]>
            : CollectUsedComponentTypes<WorldComponent, Tail, Result>
    : Result;

export type QueryBuilderApi<
    WorldComponent extends Component,
    IncludeEntity extends boolean = false,
    Tuple extends QueryDefinitionItemGeneric<WorldComponent>[] = [],
    UsedMethods extends string = never,
    MapFn extends ((tuple: any) => any) | undefined = undefined,
> = Omit<
    {
        includeEntity: () => QueryBuilderApi<WorldComponent, true, Tuple, UsedMethods | 'includeEntity'>;
        with: <Type extends Exclude<WorldComponent['type'], CollectUsedComponentTypes<WorldComponent, Tuple>>>(
            type: Type,
        ) => QueryBuilderApi<WorldComponent, IncludeEntity, [...Tuple, { with: Type }], UsedMethods | 'includeEntity'>;
        withAny: <
            const Types extends Exclude<WorldComponent['type'], CollectUsedComponentTypes<WorldComponent, Tuple>>[],
        >(
            type: Types,
        ) => QueryBuilderApi<
            WorldComponent,
            IncludeEntity,
            [...Tuple, { withAny: Types }],
            UsedMethods | 'includeEntity'
        >;
        map: <
            Fn extends (
                tuple: MapQueryDefinitionToTuple<
                    WorldComponent,
                    QueryDefinition<WorldComponent, IncludeEntity, Tuple, MapFn>
                >,
            ) => unknown,
        >(
            fn: Fn,
        ) => QueryBuilderApi<
            WorldComponent,
            true,
            Tuple,
            UsedMethods | 'includeEntity' | 'with' | 'withAny' | 'map',
            Fn
        >;
        compile: () => QueryDefinition<WorldComponent, IncludeEntity, Tuple, MapFn>;
    },
    UsedMethods
>;

const hasItemAlready = (query: QueryDefinitionGeneric, item: QueryDefinitionItemGeneric) => {
    for (let i = 0; i < query.tuple.length; i++) {
        const tupleItem = query.tuple[i];
        if (isWithItem(tupleItem) && isWithItem(item)) {
            if (tupleItem.with === item.with) {
                return true;
            }
        } else if (isWithAnyItem(tupleItem) && isWithAnyItem(item)) {
            if (tupleItem.withAny.some((te) => item.withAny.includes(te))) {
                return true;
            }
        }
    }

    return false;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const identity = (tuple: any) => tuple;

export const queryBuilder = <
    WorldComponent extends Component,
    Tuple extends QueryDefinitionItemGeneric<WorldComponent>[] = [],
    UsedMethods extends string = never,
>() => {
    const query: QueryDefinitionGeneric<WorldComponent> = { includeEntity: false, tuple: [], map: identity };

    const api = {
        includeEntity: () => {
            query.includeEntity = true;
            return api;
        },
        with: (type: WorldComponent['type']) => {
            if (hasItemAlready(query, { with: type })) {
                console.error('A query can only specify a component type once.');
                return api;
            }

            query.tuple.push({ with: type });
            return api;
        },
        withAny: (types: WorldComponent['type'][]) => {
            if (hasItemAlready(query, { withAny: types })) {
                console.error('A query can only specify a component type once.');
                return api;
            }

            query.tuple.push({ withAny: types });
            return api;
        },
        map: (fn: (tuple: any) => any) => {
            query.map = fn;
            return api;
        },
        compile: () => query,
    };

    return api as unknown as QueryBuilderApi<WorldComponent, false, Tuple, UsedMethods>;
};

export const defineQueries = <Queries extends Record<string, QueryDefinitionGeneric>>(queries: Queries) => queries;

export type Bitmasks = {
    with: [number, number, number, number];
    withAny: [number, number, number, number];
};

export type InternalQuery = {
    name: string;
    defintion: QueryDefinitionGeneric;
    bitmasks: Bitmasks;
    flags: {
        hasWith: boolean;
        hasWithAny: boolean;
    };
    entityToResultIdx: Map<Entity, number>;
    entities: Entity[];
    result: unknown[];
};

export const updateQueriesForSpawnAndAddComponent = (
    queries: InternalQuery[],
    entityBitmasks: Bitmasks,
    entity: Entity,
    componentsByType: Map<number, Component>,
) => {
    const ew0 = entityBitmasks.with[0];
    const ew1 = entityBitmasks.with[1];
    const ew2 = entityBitmasks.with[2];
    const ew3 = entityBitmasks.with[3];

    const ewa0 = entityBitmasks.withAny[0];
    const ewa1 = entityBitmasks.withAny[1];
    const ewa2 = entityBitmasks.withAny[2];
    const ewa3 = entityBitmasks.withAny[3];

    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];
        if (qry.entityToResultIdx.has(entity)) continue;

        const map = qry.defintion.map as (tuple: unknown[]) => unknown;

        const qw0 = qry.bitmasks.with[0];
        const qw1 = qry.bitmasks.with[1];
        const qw2 = qry.bitmasks.with[2];
        const qw3 = qry.bitmasks.with[3];

        const qwa0 = qry.bitmasks.withAny[0];
        const qwa1 = qry.bitmasks.withAny[1];
        const qwa2 = qry.bitmasks.withAny[2];
        const qwa3 = qry.bitmasks.withAny[3];

        const withSatisfied = qry.flags.hasWith
            ? (ew0 & qw0) === qw0 && (ew1 & qw1) === qw1 && (ew2 & qw2) === qw2 && (ew3 & qw3) === qw3
            : true;

        if (!withSatisfied) continue;

        const withAnySatisfied = qry.flags.hasWithAny
            ? (ewa0 & qwa0) !== 0 || (ewa1 & qwa1) !== 0 || (ewa2 & qwa2) !== 0 || (ewa3 & qwa3) !== 0
            : true;

        if (!withAnySatisfied) continue;

        const tuple: unknown[] = [];

        if (qry.defintion.includeEntity) {
            tuple.push(entity);
        }

        for (let j = 0; j < qry.defintion.tuple.length; j++) {
            const item = qry.defintion.tuple[j];
            if (isWithItem(item)) {
                const c = componentsByType.get(item.with);
                if (c) tuple.push(c);
            } else if (isWithAnyItem(item)) {
                for (let k = 0; k < item.withAny.length; k++) {
                    const element = item.withAny[k];
                    const c = componentsByType.get(element);
                    if (c) {
                        tuple.push(c);
                        break;
                    }
                }
            }
        }

        qry.entities.push(entity);
        const item = map(tuple);
        qry.result.push(item);
        qry.entityToResultIdx.set(entity, qry.result.length - 1);
    }
};

export const updateQueriesForDespawn = (queries: InternalQuery[], entity: Entity) => {
    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];

        const idx = qry.entityToResultIdx.get(entity);
        if (idx === undefined) continue;

        const lastIdx = qry.result.length - 1;
        const swappedEntity = qry.entities[lastIdx];

        arraySwapDelete(qry.result, idx);
        arraySwapDelete(qry.entities, idx);
        qry.entityToResultIdx.delete(entity);

        if (idx !== lastIdx) {
            qry.entityToResultIdx.set(swappedEntity, idx);
        }
    }
};

export const updateQueriesForRemoveComponent = (queries: InternalQuery[], entity: Entity, entityBitmasks: Bitmasks) => {
    const ew0 = entityBitmasks.with[0];
    const ew1 = entityBitmasks.with[1];
    const ew2 = entityBitmasks.with[2];
    const ew3 = entityBitmasks.with[3];

    const ewa0 = entityBitmasks.withAny[0];
    const ewa1 = entityBitmasks.withAny[1];
    const ewa2 = entityBitmasks.withAny[2];
    const ewa3 = entityBitmasks.withAny[3];

    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];

        const qw0 = qry.bitmasks.with[0];
        const qw1 = qry.bitmasks.with[1];
        const qw2 = qry.bitmasks.with[2];
        const qw3 = qry.bitmasks.with[3];

        const qwa0 = qry.bitmasks.withAny[0];
        const qwa1 = qry.bitmasks.withAny[1];
        const qwa2 = qry.bitmasks.withAny[2];
        const qwa3 = qry.bitmasks.withAny[3];

        const withSatisfied = qry.flags.hasWith
            ? (ew0 & qw0) === qw0 && (ew1 & qw1) === qw1 && (ew2 & qw2) === qw2 && (ew3 & qw3) === qw3
            : true;

        const withAnySatisfied = qry.flags.hasWithAny
            ? (ewa0 & qwa0) !== 0 || (ewa1 & qwa1) !== 0 || (ewa2 & qwa2) !== 0 || (ewa3 & qwa3) !== 0
            : true;

        if (!withSatisfied || !withAnySatisfied) {
            const idx = qry.entityToResultIdx.get(entity);
            if (idx === undefined) continue;

            const lastIdx = qry.result.length - 1;
            const swappedEntity = qry.entities[lastIdx];

            arraySwapDelete(qry.result, idx);
            arraySwapDelete(qry.entities, idx);
            qry.entityToResultIdx.delete(entity);

            if (idx !== lastIdx) {
                qry.entityToResultIdx.set(swappedEntity, idx);
            }
        }
    }
};
