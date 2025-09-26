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
    with: number;
    withAny: number;
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
    entitiyBitmasks: Bitmasks,
    entity: Entity,
    componentsByType: Map<number, Component>,
) => {
    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];

        if (qry.entityToResultIdx.get(entity) !== undefined) continue;

        const map = qry.defintion.map as (tuple: unknown[]) => unknown;

        const withSatisfied = qry.flags.hasWith
            ? (entitiyBitmasks.with & qry.bitmasks.with) === qry.bitmasks.with
            : true;

        const withAnySatisfied = qry.flags.hasWithAny ? (entitiyBitmasks.withAny & qry.bitmasks.withAny) !== 0 : true;

        if (withSatisfied && withAnySatisfied) {
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
    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];

        const withSatisfied = qry.flags.hasWith
            ? (entityBitmasks.with & qry.bitmasks.with) === qry.bitmasks.with
            : true;

        const withAnySatisfied = qry.flags.hasWithAny ? (entityBitmasks.withAny & qry.bitmasks.withAny) !== 0 : true;

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
