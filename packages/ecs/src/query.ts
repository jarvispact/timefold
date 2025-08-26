import type { Component } from './component';
import { Entity } from './entity';

type QueryDefinitionItemWith<WorldComponent extends Component> = {
    with: WorldComponent['type'];
    optional?: boolean;
};

export const isWithItem = <C extends Component>(item: QueryDefinitionItemGeneric): item is QueryDefinitionItemWith<C> =>
    'with' in item;

type QueryDefinitionItemWithAny<WorldComponent extends Component> = {
    withAny: WorldComponent['type'][];
    optional?: boolean;
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
> = {
    includeEntity?: IncludeEntity;
    tuple: Tuple;
};

export type QueryDefinitionGeneric<WorldComponent extends Component = Component> = QueryDefinition<
    WorldComponent,
    boolean,
    QueryDefinitionItemGeneric<WorldComponent>[]
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
              { includeEntity: Q['includeEntity']; tuple: Tail },
              [
                  ...Tuple,
                  number extends WorldComponent['type'] ? Component : Extract<WorldComponent, { type: Head['with'] }>,
              ]
          >
        : Head extends { withAny: WorldComponent['type'][] }
          ? MapQueryDefinitionToTuple<
                WorldComponent,
                { includeEntity: Q['includeEntity']; tuple: Tail },
                [
                    ...Tuple,
                    number extends WorldComponent['type']
                        ? Component
                        : Extract<WorldComponent, { type: Head['withAny'][number] }>,
                ]
            >
          : MapQueryDefinitionToTuple<WorldComponent, { includeEntity: Q['includeEntity']; tuple: Tail }, Tuple>
    : true extends Q['includeEntity']
      ? [Entity, ...Tuple]
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
        compile: () => QueryDefinition<WorldComponent, IncludeEntity, Tuple>;
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

export const queryBuilder = <
    WorldComponent extends Component,
    Tuple extends QueryDefinitionItemGeneric<WorldComponent>[] = [],
    UsedMethods extends string = never,
>() => {
    const query: QueryDefinitionGeneric<WorldComponent> = { includeEntity: false, tuple: [] };

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
    result: unknown[][];
};

export const updateQueries = (
    queries: InternalQuery[],
    entitiyBitmasks: Bitmasks,
    entity: Entity,
    componentsByType: Record<string, Component | undefined>,
) => {
    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];

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
                    const c = componentsByType[item.with];
                    if (c) tuple.push(c);
                } else if (isWithAnyItem(item)) {
                    for (let k = 0; k < item.withAny.length; k++) {
                        const element = item.withAny[k];
                        const c = componentsByType[element];
                        if (c) {
                            tuple.push(c);
                            break;
                        }
                    }
                }
            }

            qry.result.push(tuple);
            qry.entities.push(entity);
            qry.entityToResultIdx.set(entity, qry.result.length - 1);
        }
    }
};
