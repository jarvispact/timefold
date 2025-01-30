import { Component } from './component';

type CommonQueryTupleDefinition = {
    include?: false;
    optional?: true;
};

type HasQueryTupleDefinition<WorldComponent extends Component> = CommonQueryTupleDefinition & {
    has: WorldComponent['type'];
};

type OrQueryTupleDefinition<WorldComponent extends Component> = CommonQueryTupleDefinition & {
    or: WorldComponent['type'][];
};

export type QueryTupleDefinition<WorldComponent extends Component> =
    | HasQueryTupleDefinition<WorldComponent>
    | OrQueryTupleDefinition<WorldComponent>;

export type QueryDefinition<WorldComponent extends Component> = {
    includeId?: true;
    tuple: QueryTupleDefinition<WorldComponent>[];
};

export const isHasQueryDefinition = <WorldComponent extends Component>(
    item: QueryTupleDefinition<WorldComponent>,
): item is HasQueryTupleDefinition<WorldComponent> => 'has' in item && typeof item.has === 'string';

export const isOrQueryDefinition = <WorldComponent extends Component>(
    item: QueryTupleDefinition<WorldComponent>,
): item is OrQueryTupleDefinition<WorldComponent> => 'or' in item && Array.isArray(item.or);

type Optional<TupleItem extends QueryTupleDefinition<Component>, T> = TupleItem extends { optional: true }
    ? T | undefined
    : T;

type DefaultToGenericComponent<T extends unknown[]> = {
    [Idx in keyof T]: T[Idx] extends never ? Component : T[Idx];
};

export type QueryTuple<
    WorldComponent extends Component,
    QueryDef extends QueryDefinition<WorldComponent>,
    Tuple extends unknown[] = [],
> = QueryDef['tuple'] extends [
    infer Head extends QueryTupleDefinition<WorldComponent>,
    ...infer Tail extends QueryTupleDefinition<WorldComponent>[],
]
    ? Head extends {
          include: false;
      }
        ? QueryTuple<WorldComponent, { includeId: QueryDef['includeId']; tuple: Tail }, Tuple>
        : Head extends {
                has: infer C extends WorldComponent['type'];
            }
          ? QueryTuple<
                WorldComponent,
                { includeId: QueryDef['includeId']; tuple: Tail },
                [...Tuple, Optional<Head, Extract<WorldComponent, { type: C }>>]
            >
          : Head extends {
                  or: infer Or extends WorldComponent['type'][];
              }
            ? QueryTuple<
                  WorldComponent,
                  { includeId: QueryDef['includeId']; tuple: Tail },
                  [...Tuple, Optional<Head, Extract<WorldComponent, { type: Or[number] }>>]
              >
            : QueryTuple<WorldComponent, { includeId: QueryDef['includeId']; tuple: Tail }, Tuple>
    : QueryDef['includeId'] extends true
      ? [string, ...DefaultToGenericComponent<Tuple>]
      : DefaultToGenericComponent<Tuple>;
