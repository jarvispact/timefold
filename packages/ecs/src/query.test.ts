/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

        expect(query).toEqual({
            includeEntity: true,
            tuple: [{ with: 0 }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });

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

        expect(query).toEqual({
            includeEntity: false,
            tuple: [{ with: 0 }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });

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

        expect(query).toEqual({
            includeEntity: true,
            tuple: [{ with: 0 }, { with: 1 }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });

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

    it('should build a query definition with entity id and a tuple with 1 "withAny" entry', () => {
        const query = queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile();

        expect(query).toEqual({
            includeEntity: true,
            tuple: [{ withAny: [0, 1] }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });

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
        const query = queryBuilder<WorldComponent>().includeEntity().with(0).withAny([2, 3]).with(1).compile();

        expect(query).toEqual({
            includeEntity: true,
            tuple: [{ with: 0 }, { withAny: [2, 3] }, { with: 1 }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });

        expectTypeOf(query).toMatchObjectType<
            QueryDefinition<WorldComponent, true, [{ with: 0 }, { withAny: [2, 3] }, { with: 1 }]>
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
                {
                    type: 1;
                    data: {
                        pos: [number, number, number];
                    };
                },
            ]
        >();
    });

    it('should should not allow the specify components more than once in a "with"', () => {
        const consoleSpy = vi.spyOn(console, 'error');
        // @ts-expect-error - 0 cannot be specified twice
        const query = queryBuilder<WorldComponent>().includeEntity().with(0).with(0).compile();
        expect(consoleSpy).toBeCalledWith('A query can only specify a component type once.');
        expect(query).toEqual({
            includeEntity: true,
            tuple: [{ with: 0 }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });
    });

    it('should should not allow the specify components more than once in a "without"', () => {
        const consoleSpy = vi.spyOn(console, 'error');
        // @ts-expect-error - 0 cannot be specified twice
        const query = queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).withAny([1, 2]).compile();
        expect(consoleSpy).toBeCalledWith('A query can only specify a component type once.');
        expect(query).toEqual({
            includeEntity: true,
            tuple: [{ withAny: [0, 1] }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });
    });

    it('should define a query set', () => {
        const queries = defineQueries({
            one: queryBuilder<WorldComponent>().includeEntity().with(0).compile(),
            two: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
        });

        expect(queries).toEqual({
            one: {
                includeEntity: true,
                tuple: [{ with: 0 }],
                map: expect.any(Function),
                onAdd: expect.any(Function),
                onRemove: expect.any(Function),
            },
            two: {
                includeEntity: true,
                tuple: [{ withAny: [0, 1] }],
                map: expect.any(Function),
                onAdd: expect.any(Function),
                onRemove: expect.any(Function),
            },
        });

        expectTypeOf<typeof queries>().toMatchObjectType<{
            one: QueryDefinition<WorldComponent, true, [{ with: 0 }]>;
            two: QueryDefinition<WorldComponent, true, [{ withAny: [0, 1] }]>;
        }>();
    });

    it('should allow to specify a map function which changes the return type', () => {
        const query = queryBuilder<WorldComponent>()
            .includeEntity()
            .with(0)
            .map((tuple) => {
                return {
                    id: tuple[0],
                    pos: tuple[1].data.pos,
                };
            })
            .compile();

        expect(query).toEqual({
            includeEntity: true,
            tuple: [{ with: 0 }],
            map: expect.any(Function),
            onAdd: expect.any(Function),
            onRemove: expect.any(Function),
        });

        expectTypeOf(query).toMatchObjectType<
            QueryDefinition<
                WorldComponent,
                true,
                [{ with: 0 }],
                (
                    tuple: [
                        number,
                        {
                            type: 0;
                            data: {
                                pos: [number, number];
                            };
                        },
                    ],
                ) => {
                    id: number;
                    pos: [number, number];
                }
            >
        >();

        type Mapped = MapQueryDefinitionToTuple<WorldComponent, typeof query>;
        expectTypeOf<Mapped>().toExtend<{ id: number; pos: [number, number] }>();
    });
});
