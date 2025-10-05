/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Component } from './component';
import { Entity } from './entity';
import { isWithAnyItem, isWithItem, QueryDefinitionItemGeneric } from './internal';

export type QueryDefinition<
    WorldComponent extends Component,
    IncludeEntity extends boolean,
    Tuple extends QueryDefinitionItemGeneric<WorldComponent>[],
    MapFn extends ((tuple: any) => any) | undefined = undefined,
> = {
    includeEntity?: IncludeEntity;
    tuple: Tuple;
    map: MapFn;
    onAdd: (entity: number, tuple: any) => void;
    onRemove: (entity: number) => void;
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
              {
                  includeEntity: Q['includeEntity'];
                  tuple: Tail;
                  map: Q['map'];
                  onAdd: Q['onAdd'];
                  onRemove: Q['onRemove'];
              },
              [
                  ...Tuple,
                  number extends WorldComponent['type'] ? Component : Extract<WorldComponent, { type: Head['with'] }>,
              ]
          >
        : Head extends { withAny: WorldComponent['type'][] }
          ? MapQueryDefinitionToTuple<
                WorldComponent,
                {
                    includeEntity: Q['includeEntity'];
                    tuple: Tail;
                    map: Q['map'];
                    onAdd: Q['onAdd'];
                    onRemove: Q['onRemove'];
                },
                [
                    ...Tuple,
                    number extends WorldComponent['type']
                        ? Component
                        : Extract<WorldComponent, { type: Head['withAny'][number] }>,
                ]
            >
          : MapQueryDefinitionToTuple<
                WorldComponent,
                {
                    includeEntity: Q['includeEntity'];
                    tuple: Tail;
                    map: Q['map'];
                    onAdd: Q['onAdd'];
                    onRemove: Q['onRemove'];
                },
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
        onAdd: (
            cb: (
                entity: Entity,
                item: MapFn extends (tuple: unknown[]) => infer Result
                    ? Result
                    : MapQueryDefinitionToTuple<
                          WorldComponent,
                          QueryDefinition<WorldComponent, IncludeEntity, Tuple, MapFn>
                      >,
            ) => void,
        ) => QueryBuilderApi<
            WorldComponent,
            true,
            Tuple,
            UsedMethods | 'includeEntity' | 'with' | 'withAny' | 'map' | 'onAdd',
            MapFn
        >;
        onRemove: (
            cb: (entity: Entity) => void,
        ) => QueryBuilderApi<
            WorldComponent,
            true,
            Tuple,
            UsedMethods | 'includeEntity' | 'with' | 'withAny' | 'map' | 'onRemove',
            MapFn
        >;
        compile: () => QueryDefinition<WorldComponent, IncludeEntity, Tuple, MapFn>;
    },
    UsedMethods
>;

function hasItemAlready(query: QueryDefinitionGeneric, item: QueryDefinitionItemGeneric) {
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
}

function identity(tuple: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return tuple;
}

export function queryBuilder<
    WorldComponent extends Component,
    Tuple extends QueryDefinitionItemGeneric<WorldComponent>[] = [],
    UsedMethods extends string = never,
>() {
    const query: QueryDefinitionGeneric<WorldComponent> = {
        includeEntity: false,
        tuple: [],
        map: identity,
        onAdd: identity,
        onRemove: identity,
    };

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
        onAdd: (fn: (entity: number, tuple: any) => any) => {
            query.onAdd = fn;
            return api;
        },
        onRemove: (fn: (entity: number) => any) => {
            query.onRemove = fn;
            return api;
        },
        compile: () => query,
    };

    return api as unknown as QueryBuilderApi<WorldComponent, false, Tuple, UsedMethods>;
}

export function defineQueries<Queries extends Record<string, QueryDefinitionGeneric>>(queries: Queries) {
    return queries;
}
