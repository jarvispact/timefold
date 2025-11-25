import { Component } from './component';
import { Entity } from './entity';

export type GenericQueryDefinition<WorldComponent extends Component = Component> = {
    includeEntity?: true;
    tuple: WorldComponent['type'][];
};

export type QueryTupleItem<
    WorldComponent extends Component,
    Definition extends GenericQueryDefinition<WorldComponent>,
    Result extends unknown[] = [],
> = Definition['tuple'] extends [
    infer Head extends WorldComponent['type'],
    ...infer Tail extends WorldComponent['type'][],
]
    ? QueryTupleItem<
          WorldComponent,
          { includeEntity: Definition['includeEntity']; tuple: Tail },
          [...Result, Extract<WorldComponent, { type: Head }>]
      >
    : Definition['includeEntity'] extends true
      ? [Entity, ...Result]
      : Result;

export type CreateQueryArgs<
    WorldComponent extends Component = Component,
    Definition extends GenericQueryDefinition<WorldComponent> = GenericQueryDefinition<WorldComponent>,
    MapResult = unknown,
> = {
    query: Definition;
    map?: (args: QueryTupleItem<WorldComponent, Definition>) => MapResult;
    onAdd?: (entity: number, item: CreateQueryResultItem<WorldComponent, Definition, MapResult>) => void;
    onRemove?: (entity: number) => void;
};

export type CreateQueryResultItem<
    WorldComponent extends Component = Component,
    Definition extends GenericQueryDefinition<WorldComponent> = GenericQueryDefinition<WorldComponent>,
    MapResult = unknown,
> = unknown extends MapResult ? QueryTupleItem<WorldComponent, Definition> : MapResult;
