import type { Component2 } from './component2';
import { Entity2 } from './entity2';

export type QueryTupleItemWith<WorldComponent extends Component2> = {
    with: WorldComponent['type'];
    optional?: boolean;
};
export type QueryTupleItemWithout<WorldComponent extends Component2> = {
    without: WorldComponent['type'];
};

export type QueryTupleItemWithAny<WorldComponent extends Component2> = {
    withAny: WorldComponent['type'][];
    optional?: boolean;
};

export type QueryTupleItemGeneric<WorldComponent extends Component2> =
    | QueryTupleItemWith<WorldComponent>
    | QueryTupleItemWithout<WorldComponent>
    | QueryTupleItemWithAny<WorldComponent>;

export type Query2<
    WorldComponent extends Component2,
    IncludeEntity extends boolean,
    Tuple extends QueryTupleItemGeneric<WorldComponent>[],
> = {
    includeEntity?: IncludeEntity;
    tuple: Tuple;
};

export type QueryGeneric2<WorldComponent extends Component2 = Component2> = Query2<
    WorldComponent,
    boolean,
    QueryTupleItemGeneric<WorldComponent>[]
>;

export type MappedQuery2<
    WorldComponent extends Component2,
    Q extends QueryGeneric2<WorldComponent>,
    Result extends unknown[] = [],
> = Q['tuple'] extends [
    infer Head extends QueryTupleItemGeneric<WorldComponent>,
    ...infer Tail extends QueryTupleItemGeneric<WorldComponent>[],
]
    ? Head extends { with: WorldComponent['type'] }
        ? MappedQuery2<
              WorldComponent,
              { includeEntity: Q['includeEntity']; tuple: Tail },
              [
                  ...Result,
                  number extends WorldComponent['type'] ? Component2 : Extract<WorldComponent, { type: Head['with'] }>,
              ]
          >
        : Head extends { withAny: WorldComponent['type'][] }
          ? MappedQuery2<
                WorldComponent,
                { includeEntity: Q['includeEntity']; tuple: Tail },
                [
                    ...Result,
                    number extends WorldComponent['type']
                        ? Component2
                        : Extract<WorldComponent, { type: Head['withAny'][number] }>,
                ]
            >
          : MappedQuery2<WorldComponent, { includeEntity: Q['includeEntity']; tuple: Tail }, Result>
    : Q['includeEntity'] extends true
      ? [Entity2, ...Result]
      : Result;

type CollectUsedComponentTypes<
    WorldComponent extends Component2,
    Tuple extends QueryTupleItemGeneric<WorldComponent>[],
    Result extends number = never,
> = Tuple extends [
    infer Head extends QueryTupleItemGeneric<WorldComponent>,
    ...infer Tail extends QueryTupleItemGeneric<WorldComponent>[],
]
    ? Head extends { with: WorldComponent['type'] }
        ? CollectUsedComponentTypes<WorldComponent, Tail, Result | Head['with']>
        : CollectUsedComponentTypes<WorldComponent, Tail, Result>
    : Result;

type QueryBuilderApi<
    WorldComponent extends Component2,
    IncludeEntity extends boolean = false,
    Tuple extends QueryTupleItemGeneric<WorldComponent>[] = [],
    UsedMethods extends string = never,
> = Omit<
    {
        includeEntity: () => QueryBuilderApi<WorldComponent, true, Tuple, UsedMethods | 'includeEntity'>;
        with: <Type extends Exclude<WorldComponent['type'], CollectUsedComponentTypes<WorldComponent, Tuple>>>(
            type: Type,
        ) => QueryBuilderApi<WorldComponent, IncludeEntity, [...Tuple, { with: Type }], UsedMethods>;
        withAny: <
            const Types extends Exclude<WorldComponent['type'], CollectUsedComponentTypes<WorldComponent, Tuple>>[],
        >(
            type: Types,
        ) => QueryBuilderApi<WorldComponent, IncludeEntity, [...Tuple, { withAny: Types }], UsedMethods>;
        compile: () => Query2<WorldComponent, IncludeEntity, Tuple>;
    },
    UsedMethods
>;

export const queryBuilder = <
    WorldComponent extends Component2,
    Tuple extends QueryTupleItemGeneric<WorldComponent>[] = [],
    UsedMethods extends string = never,
>() => {
    const query: QueryGeneric2<WorldComponent> = { includeEntity: false, tuple: [] };

    const api = {
        includeEntity: () => {
            query.includeEntity = true;
            return api;
        },
        with: (type: WorldComponent['type']) => {
            query.tuple.push({ with: type });
            return api;
        },
        withAny: (types: WorldComponent['type'][]) => {
            query.tuple.push({ withAny: types });
            return api;
        },
        compile: () => query,
    };

    return api as unknown as QueryBuilderApi<WorldComponent, false, Tuple, UsedMethods>;
};
