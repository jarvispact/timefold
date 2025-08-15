import { expect, it, describe, expectTypeOf, vi } from 'vitest';
import { defineQueries, MapQueryDefinitionToTuple, queryBuilder, QueryDefinition } from './query';
import { Component } from './component';

type A = Component<0, { pos: [number, number] }>;
type B = Component<1, { pos: [number, number, number] }>;
type C = Component<2, { vel: [number, number] }>;
type D = Component<3, { health: number }>;
type WorldComponent = A | B | C | D;

describe('query', () => {
    it('should build a query definition with entity id and a tuple with 1 "with" entry', () => {
        const query = queryBuilder<WorldComponent>().includeEntity().with(0).compile();
        expect(query).toEqual({ includeEntity: true, tuple: [{ with: 0 }] });
        expectTypeOf(query).toMatchObjectType<QueryDefinition<WorldComponent, true, [{ with: 0 }]>>();

        type Mapped = MapQueryDefinitionToTuple<WorldComponent, typeof query>;
        expectTypeOf<Mapped>().toExtend<
            [
                number,
                {
                    type: 0;
                    data: {
                        pos: [number, number];
                    };
                },
            ]
        >();
    });

    it('should build a query definition with a tuple with 1 "with" entry', () => {
        const query = queryBuilder<WorldComponent>().with(0).compile();
        expect(query).toEqual({ includeEntity: false, tuple: [{ with: 0 }] });
        expectTypeOf(query).toMatchObjectType<QueryDefinition<WorldComponent, false, [{ with: 0 }]>>();

        type Mapped = MapQueryDefinitionToTuple<WorldComponent, typeof query>;
        expectTypeOf<Mapped>().toExtend<
            [
                {
                    type: 0;
                    data: {
                        pos: [number, number];
                    };
                },
            ]
        >();
    });

    it('should build a query definition with entity id and a tuple with 2 "with" entry', () => {
        const query = queryBuilder<WorldComponent>().includeEntity().with(0).with(1).compile();
        expect(query).toEqual({ includeEntity: true, tuple: [{ with: 0 }, { with: 1 }] });
        expectTypeOf(query).toMatchObjectType<QueryDefinition<WorldComponent, true, [{ with: 0 }, { with: 1 }]>>();

        type Mapped = MapQueryDefinitionToTuple<WorldComponent, typeof query>;
        expectTypeOf<Mapped>().toExtend<
            [
                number,
                {
                    type: 0;
                    data: {
                        pos: [number, number];
                    };
                },
                {
                    type: 1;
                    data: {
                        pos: [number, number, number];
                    };
                },
            ]
        >();
    });

    it('should build a query definition with entity id and a tuple with 1 "without" entry', () => {
        const query = queryBuilder<WorldComponent>().includeEntity().without(0).compile();
        expect(query).toEqual({ includeEntity: true, tuple: [{ without: 0 }] });
        expectTypeOf(query).toMatchObjectType<QueryDefinition<WorldComponent, true, [{ without: 0 }]>>();

        type Mapped = MapQueryDefinitionToTuple<WorldComponent, typeof query>;
        expectTypeOf<Mapped>().toExtend<[number]>();
    });

    it('should build a query definition with entity id and a tuple with 1 "withAny" entry', () => {
        const query = queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile();
        expect(query).toEqual({ includeEntity: true, tuple: [{ withAny: [0, 1] }] });
        expectTypeOf(query).toMatchObjectType<QueryDefinition<WorldComponent, true, [{ withAny: [0, 1] }]>>();

        type Mapped = MapQueryDefinitionToTuple<WorldComponent, typeof query>;
        expectTypeOf<Mapped>().toExtend<
            [
                number,
                (
                    | {
                          type: 0;
                          data: {
                              pos: [number, number];
                          };
                      }
                    | {
                          type: 1;
                          data: {
                              pos: [number, number, number];
                          };
                      }
                ),
            ]
        >();
    });

    it('should build complex query definition', () => {
        const query = queryBuilder<WorldComponent>().includeEntity().with(0).without(1).withAny([2, 3]).compile();

        expect(query).toEqual({ includeEntity: true, tuple: [{ with: 0 }, { without: 1 }, { withAny: [2, 3] }] });

        expectTypeOf(query).toMatchObjectType<
            QueryDefinition<WorldComponent, true, [{ with: 0 }, { without: 1 }, { withAny: [2, 3] }]>
        >();

        type Mapped = MapQueryDefinitionToTuple<WorldComponent, typeof query>;
        expectTypeOf<Mapped>().toExtend<
            [
                number,
                {
                    type: 0;
                    data: {
                        pos: [number, number];
                    };
                },
                (
                    | {
                          type: 2;
                          data: {
                              vel: [number, number];
                          };
                      }
                    | {
                          type: 3;
                          data: {
                              health: number;
                          };
                      }
                ),
            ]
        >();
    });

    it('should should not allow the specify components more than once in a "with"', () => {
        const consoleSpy = vi.spyOn(console, 'error');
        // @ts-expect-error - 0 cannot be specified twice
        const query = queryBuilder<WorldComponent>().includeEntity().with(0).with(0).compile();
        expect(consoleSpy).toBeCalledWith('A query can only specify a component type once.');
        expect(query).toEqual({ includeEntity: true, tuple: [{ with: 0 }] });
    });

    it('should should not allow the specify components more than once in a "without"', () => {
        const consoleSpy = vi.spyOn(console, 'error');
        // @ts-expect-error - 0 cannot be specified twice
        const query = queryBuilder<WorldComponent>().includeEntity().without(0).without(0).compile();
        expect(consoleSpy).toBeCalledWith('A query can only specify a component type once.');
        expect(query).toEqual({ includeEntity: true, tuple: [{ without: 0 }] });
    });

    it('should should not allow the specify components more than once in a "without"', () => {
        const consoleSpy = vi.spyOn(console, 'error');
        // @ts-expect-error - 0 cannot be specified twice
        const query = queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).withAny([1, 2]).compile();
        expect(consoleSpy).toBeCalledWith('A query can only specify a component type once.');
        expect(query).toEqual({ includeEntity: true, tuple: [{ withAny: [0, 1] }] });
    });

    it('should define a query set', () => {
        const queries = defineQueries({
            one: queryBuilder<WorldComponent>().includeEntity().with(0).compile(),
            two: queryBuilder<WorldComponent>().includeEntity().without(0).compile(),
        });

        expect(queries).toEqual({
            one: { includeEntity: true, tuple: [{ with: 0 }] },
            two: { includeEntity: true, tuple: [{ without: 0 }] },
        });

        expectTypeOf<typeof queries>().toMatchObjectType<{
            one: QueryDefinition<WorldComponent, true, [{ with: 0 }]>;
            two: QueryDefinition<WorldComponent, true, [{ without: 0 }]>;
        }>();
    });
});
