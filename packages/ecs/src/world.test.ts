/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, it, describe, expectTypeOf } from 'vitest';
import { World, worldBuilder } from './world';
import { Component } from './component';
import { defineQueries, queryBuilder, QueryDefinition } from './query';
import { DefineEcsEvent, EcsEvent, ExtendEcsEvent } from './event';

type A = Component<0>;
type B = Component<1, { pos: [number, number] }>;
type C = Component<2, { pos: [number, number, number] }>;
type D = Component<3, { vel: [number, number] }>;
type E = Component<4, { health: number }>;
type WorldComponent = A | B | C | D | E;

type EventA = DefineEcsEvent<'A'>;
type EventB = DefineEcsEvent<'B', { a: string }>;
type EventC = DefineEcsEvent<'C', { b: number }>;

type WorldEvent = EventA | EventB | EventC;

type WorldResources = {
    time: number;
    deltaTime: number;
    frame: {
        data: ArrayBuffer;
    };
    geometry: {
        plane: Float32Array;
    };
};

describe('world', () => {
    describe('entities and components', () => {
        it('should return the correct component type', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const id = 0;
            world.spawn(id, [a]);
            const component = world.getComponent(id, 0);
            expectTypeOf(component).toExtend<A | undefined>();
        });

        it('should spawn a collection of components and return the id of the entity', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const b: B = { type: 1, data: { pos: [0, 0] } };

            {
                const id = 0;
                world.spawn(id, [a, b]);
                expect(id).toEqual(0);
            }
            {
                const id = 1;
                world.spawn(id, [a, b]);
                expect(id).toEqual(1);
            }
        });

        it('should despawn a entity and return a boolean value', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const b: B = { type: 1, data: { pos: [0, 0] } };

            const id = 0;
            world.spawn(id, [a, b]);
            expect(world.getComponent(id, 0)).toBe(a);
            expect(world.getComponent(id, 1)).toBe(b);
            const result = world.despawn(id);
            expect(result).toEqual(true);
            expect(world.getComponent(id, 0)).toBe(undefined);
            expect(world.getComponent(id, 1)).toBe(undefined);
        });

        it('should not despawn a entity and return a boolean value', () => {
            const world = worldBuilder<WorldComponent>().compile();

            const result = world.despawn(0);
            expect(result).toEqual(false);
        });

        it('should get components by entity id and component type', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const b: B = { type: 1, data: { pos: [0, 0] } };

            const id = 0;
            world.spawn(id, [a, b]);
            expect(world.getComponent(id, 0)).toEqual(a);
            expect(world.getComponent(id, 1)).toEqual(b);
            expect(world.getComponent(id, 2)).toEqual(undefined);
        });

        it('should add a component to an entity', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const b: B = { type: 1, data: { pos: [0, 0] } };
            const c: C = { type: 2, data: { pos: [0, 0, 0] } };

            const id = 0;
            world.spawn(id, [a, b]);
            expect(world.getComponent(id, 0)).toEqual(a);
            expect(world.getComponent(id, 1)).toEqual(b);
            expect(world.getComponent(id, 2)).toEqual(undefined);

            const result = world.addComponent(id, c);
            expect(result).toEqual(true);
            expect(world.getComponent(id, 2)).toEqual(c);
        });

        it('should not add a component to an entity if it already has a component of the same type', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const newA: A = { type: 0 };
            const id = 0;
            world.spawn(id, [a]);

            const result = world.addComponent(id, newA);
            expect(result).toEqual(false);
            expect(world.getComponent(id, 0)).toBe(a);
        });

        it('should remove a component from an entity', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const id = 0;
            world.spawn(id, [a]);
            expect(world.getComponent(id, 0)).toEqual(a);

            const result = world.removeComponent(id, 0);
            expect(result).toEqual(true);
            expect(world.getComponent(id, 0)).toEqual(undefined);
        });

        it('should not remove a component from an entity if it does not have this component', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const b: B = { type: 1, data: { pos: [0, 0] } };
            const id = 0;
            world.spawn(id, [b]);

            const result = world.removeComponent(id, 0);
            expect(result).toEqual(false);
            expect(world.getComponent(id, 0)).toBe(undefined);
        });
    });

    describe('resources', () => {
        it('should return the correct type when passed as generic', () => {
            const world = worldBuilder<
                WorldComponent,
                EcsEvent<WorldComponent>,
                {
                    res1: string;
                    res2: number;
                    res3: { foo: string };
                    res4?: { bar: number };
                }
            >().compile();

            const res1 = world.getResource('res1');
            expectTypeOf<typeof res1>().toBeString();

            const res2 = world.getResource('res2');
            expectTypeOf<typeof res2>().toBeNumber();

            const res3 = world.getResource('res3');
            expectTypeOf<typeof res3>().toMatchObjectType<{ foo: string }>();

            const res4 = world.getResource('res4');
            expectTypeOf<typeof res4>().toExtend<{ bar: number } | undefined>();
        });

        it('should define resources in the builder api and infer the correct type', () => {
            const world = worldBuilder<WorldComponent>()
                .defineResources({
                    res1: 'foo',
                    res2: 42,
                    res3: { foo: 'foo' },
                    res4: { bar: 42 },
                })
                .compile();

            const res1 = world.getResource('res1');
            expect(res1).toEqual('foo');
            expectTypeOf<typeof res1>().toBeString();

            const res2 = world.getResource('res2');
            expect(res2).toEqual(42);
            expectTypeOf<typeof res2>().toBeNumber();

            const res3 = world.getResource('res3');
            expect(res3).toEqual({ foo: 'foo' });
            expectTypeOf<typeof res3>().toMatchObjectType<{ foo: string }>();

            const res4 = world.getResource('res4');
            expect(res4).toEqual({ bar: 42 });
            expectTypeOf<typeof res4>().toExtend<{ bar: number }>();
        });

        it('should set, get and remove a resource', () => {
            const world = worldBuilder<WorldComponent, EcsEvent<WorldComponent>, { res1: string }>().compile();
            expect(world.getResource('res1')).toEqual(undefined);
            world.setResource('res1', 'data');
            expect(world.getResource('res1')).toEqual('data');
            world.removeResource('res1');
            expect(world.getResource('res1')).toEqual(undefined);
        });
    });

    describe('events', () => {
        it('should return the correct type when no event type was passed', () => {
            const world = worldBuilder<WorldComponent>().compile();
            type World = typeof world;
            type Emit = Parameters<World['emit']>[0];
            type On = Parameters<World['on']>[0];

            type ExpectedEventType =
                | 'ecs/spawn-entity'
                | 'ecs/despawn-entity'
                | 'ecs/add-component'
                | 'ecs/remove-component';

            expectTypeOf<Emit>().toExtend<ExpectedEventType>();
            expectTypeOf<On>().toExtend<ExpectedEventType>();

            expectTypeOf<ExpectedEventType>().toExtend<Emit>();
            expectTypeOf<ExpectedEventType>().toExtend<On>();
        });

        it('should return the correct type when passed as generic', () => {
            const world = worldBuilder<WorldComponent, ExtendEcsEvent<WorldComponent, WorldEvent>>().compile();
            type World = typeof world;
            type Emit = Parameters<World['emit']>[0];
            type On = Parameters<World['on']>[0];

            type ExpectedEventType =
                | 'ecs/spawn-entity'
                | 'ecs/despawn-entity'
                | 'ecs/add-component'
                | 'ecs/remove-component'
                | 'A'
                | 'B'
                | 'C';

            expectTypeOf<Emit>().toExtend<ExpectedEventType>();
            expectTypeOf<On>().toExtend<ExpectedEventType>();

            expectTypeOf<ExpectedEventType>().toExtend<Emit>();
            expectTypeOf<ExpectedEventType>().toExtend<On>();
        });
    });

    describe('queries', () => {
        it('should return the correct types when passed as generic', () => {
            const queries = defineQueries({
                one: queryBuilder<WorldComponent>().includeEntity().with(0).compile(),
                two: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
            });

            const world = worldBuilder<WorldComponent, WorldEvent, WorldResources, typeof queries>().compile();

            expectTypeOf<typeof world>().toExtend<
                World<
                    WorldComponent,
                    WorldEvent,
                    WorldResources,
                    {
                        one: QueryDefinition<
                            WorldComponent,
                            true,
                            [
                                {
                                    with: 0;
                                },
                            ]
                        >;
                        two: QueryDefinition<
                            WorldComponent,
                            true,
                            [
                                {
                                    withAny: [0, 1];
                                },
                            ]
                        >;
                    }
                >
            >();
        });

        it('should define queries in the builder api and infer the correct type', () => {
            const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                .registerQueries({
                    one: queryBuilder<WorldComponent>().includeEntity().with(0).compile(),
                    two: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
                })
                .compile();

            expectTypeOf<typeof world>().toExtend<
                World<
                    WorldComponent,
                    WorldEvent,
                    WorldResources,
                    {
                        one: QueryDefinition<
                            WorldComponent,
                            true,
                            [
                                {
                                    with: 0;
                                },
                            ]
                        >;
                        two: QueryDefinition<
                            WorldComponent,
                            true,
                            [
                                {
                                    withAny: [0, 1];
                                },
                            ]
                        >;
                    }
                >
            >();
        });

        it('should define queries in the builder api and infer the correct type', () => {
            const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                .registerQueries({
                    one: queryBuilder<WorldComponent>().includeEntity().with(0).compile(),
                    two: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
                    three: queryBuilder<WorldComponent>().includeEntity().with(1).with(2).compile(),
                })
                .compile();

            const one = world.getQuery('one');
            expectTypeOf<typeof one>().toExtend<{
                result: [number, { type: 0 }][];
            }>();

            const two = world.getQuery('two');
            expectTypeOf<typeof two>().toExtend<{
                result: [number, { type: 0 } | { type: 1; data: { pos: [number, number] } }][];
            }>();

            const three = world.getQuery('three');
            expectTypeOf<typeof three>().toExtend<{
                result: [
                    number,
                    { type: 1; data: { pos: [number, number] } },
                    { type: 2; data: { pos: [number, number, number] } },
                ][];
            }>();
        });

        describe('with queries', () => {
            it('should return the correct query result with single "with" queries when spawning', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().compile(),
                        two: queryBuilder<WorldComponent>().includeEntity().with(0).compile(),
                        three: queryBuilder<WorldComponent>().includeEntity().with(1).compile(),
                        four: queryBuilder<WorldComponent>().includeEntity().with(2).compile(),
                        five: queryBuilder<WorldComponent>().with(0).compile(),
                        six: queryBuilder<WorldComponent>().with(3).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;
                const four = world.getQuery('four').result;
                const five = world.getQuery('five').result;
                const six = world.getQuery('six').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };

                const e0 = world.spawn(0, [a]);
                const e1 = world.spawn(1, [b]);
                const e2 = world.spawn(2, [c]);

                expect(one).toEqual([[e0], [e1], [e2]]);
                expect(two).toEqual([[e0, a]]);
                expect(three).toEqual([[e1, b]]);
                expect(four).toEqual([[e2, c]]);
                expect(five).toEqual([[a]]);
                expect(six).toEqual([]);

                const e3 = world.spawn(3, [a, b]);
                const e4 = world.spawn(4, [a, c]);

                expect(one).toEqual([[e0], [e1], [e2], [e3], [e4]]);
                expect(two).toEqual([
                    [e0, a],
                    [e3, a],
                    [e4, a],
                ]);
                expect(three).toEqual([
                    [e1, b],
                    [e3, b],
                ]);
                expect(four).toEqual([
                    [e2, c],
                    [e4, c],
                ]);
                // e0, e3, e4
                expect(five).toEqual([[a], [a], [a]]);
                expect(six).toEqual([]);
            });

            it('should return the correct query result with multiple "with" queries when spawning', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().with(0).with(1).compile(),
                        two: queryBuilder<WorldComponent>().includeEntity().with(0).with(2).compile(),
                        three: queryBuilder<WorldComponent>().includeEntity().with(1).with(0).compile(),
                        four: queryBuilder<WorldComponent>().with(0).with(2).with(1).compile(),
                        five: queryBuilder<WorldComponent>().with(0).with(2).with(3).compile(),
                        six: queryBuilder<WorldComponent>().with(0).with(2).with(3).with(1).with(4).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;
                const four = world.getQuery('four').result;
                const five = world.getQuery('five').result;
                const six = world.getQuery('six').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };
                const d: D = { type: 3, data: { vel: [0, 0] } };

                world.spawn(0, [a]);
                world.spawn(1, [b]);
                world.spawn(2, [c]);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);
                expect(four).toEqual([]);
                expect(five).toEqual([]);
                expect(six).toEqual([]);

                const e3 = world.spawn(3, [a, b]);
                const e4 = world.spawn(4, [a, c]);

                expect(one).toEqual([[e3, a, b]]);
                expect(two).toEqual([[e4, a, c]]);
                expect(three).toEqual([[e3, b, a]]);
                expect(four).toEqual([]);
                expect(five).toEqual([]);
                expect(six).toEqual([]);

                const e5 = world.spawn(5, [b, c, a]);
                const e6 = world.spawn(6, [a, d, c]);

                expect(one).toEqual([
                    [e3, a, b],
                    [e5, a, b],
                ]);
                expect(two).toEqual([
                    [e4, a, c],
                    [e5, a, c],
                    [e6, a, c],
                ]);
                expect(three).toEqual([
                    [e3, b, a],
                    [e5, b, a],
                ]);
                // e5
                expect(four).toEqual([[a, c, b]]);
                // e6
                expect(five).toEqual([[a, c, d]]);
                expect(six).toEqual([]);
            });

            it('should return the correct query result with single "with" queries when adding a component', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().with(0).with(1).compile(),
                        two: queryBuilder<WorldComponent>().with(0).with(1).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };

                const e0 = world.spawn(0, [a]);
                const e1 = world.spawn(1, [b]);
                const e2 = world.spawn(2, [c]);

                expect(one).toEqual([]);
                expect(two).toEqual([]);

                world.addComponent(e0, b);
                world.addComponent(e1, a);
                world.addComponent(e2, a);

                expect(one).toEqual([
                    [e0, a, b],
                    [e1, a, b],
                ]);
                expect(two).toEqual([
                    [a, b],
                    [a, b],
                ]);

                world.addComponent(e2, b);

                expect(one).toEqual([
                    [e0, a, b],
                    [e1, a, b],
                    [e2, a, b],
                ]);
                expect(two).toEqual([
                    [a, b],
                    [a, b],
                    [a, b],
                ]);
            });

            it('should return the correct query result with single "with" queries when removing a component', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().with(0).with(1).compile(),
                        two: queryBuilder<WorldComponent>().with(0).with(1).compile(),
                        three: queryBuilder<WorldComponent>().with(2).with(3).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };

                const e0 = world.spawn(0, [a, b]);
                const e1 = world.spawn(1, [a, b]);
                const e2 = world.spawn(2, [a, b]);

                expect(one).toEqual([
                    [e0, a, b],
                    [e1, a, b],
                    [e2, a, b],
                ]);
                expect(two).toEqual([
                    [a, b],
                    [a, b],
                    [a, b],
                ]);
                expect(three).toEqual([]);

                world.removeComponent(e0, 0);

                expect(one).toEqual([
                    [e2, a, b],
                    [e1, a, b],
                ]);
                expect(two).toEqual([
                    [a, b],
                    [a, b],
                ]);
                expect(three).toEqual([]);

                world.removeComponent(e1, 1);

                expect(one).toEqual([[e2, a, b]]);
                expect(two).toEqual([[a, b]]);
                expect(three).toEqual([]);

                world.removeComponent(e2, 0);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);
            });

            it('should return the correct query result with single "with" queries when despwaning entities', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().with(0).with(1).compile(),
                        two: queryBuilder<WorldComponent>().with(0).with(1).compile(),
                        three: queryBuilder<WorldComponent>().with(2).with(3).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };

                const e0 = world.spawn(0, [a, b]);
                const e1 = world.spawn(1, [a, b]);
                const e2 = world.spawn(2, [a, b]);

                expect(one).toEqual([
                    [e0, a, b],
                    [e1, a, b],
                    [e2, a, b],
                ]);
                expect(two).toEqual([
                    [a, b],
                    [a, b],
                    [a, b],
                ]);
                expect(three).toEqual([]);

                world.despawn(e0);

                expect(one).toEqual([
                    [e2, a, b],
                    [e1, a, b],
                ]);
                expect(two).toEqual([
                    [a, b],
                    [a, b],
                ]);
                expect(three).toEqual([]);

                world.despawn(e1);

                expect(one).toEqual([[e2, a, b]]);
                expect(two).toEqual([[a, b]]);
                expect(three).toEqual([]);

                world.despawn(e2);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);
            });

            it('should return the correct final result with single "with" queries when performing various updates', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().with(0).with(1).compile(),
                        two: queryBuilder<WorldComponent>().includeEntity().with(0).with(2).compile(),
                        three: queryBuilder<WorldComponent>().includeEntity().with(1).with(2).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };

                const e0 = world.spawn(0, [a, b]);
                const e1 = world.spawn(1, [a, b]);
                const e2 = world.spawn(2, [a, b]);

                expect(one).toEqual([
                    [e0, a, b],
                    [e1, a, b],
                    [e2, a, b],
                ]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);

                world.addComponent(e0, c);
                world.addComponent(e1, c);
                world.addComponent(e2, c);

                expect(one).toEqual([
                    [e0, a, b],
                    [e1, a, b],
                    [e2, a, b],
                ]);
                expect(two).toEqual([
                    [e0, a, c],
                    [e1, a, c],
                    [e2, a, c],
                ]);
                expect(three).toEqual([
                    [e0, b, c],
                    [e1, b, c],
                    [e2, b, c],
                ]);

                world.removeComponent(e0, a.type);
                world.removeComponent(e1, a.type);
                world.removeComponent(e2, a.type);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([
                    [e0, b, c],
                    [e1, b, c],
                    [e2, b, c],
                ]);

                world.addComponent(e0, a);

                expect(one).toEqual([[e0, a, b]]);
                expect(two).toEqual([[e0, a, c]]);
                expect(three).toEqual([
                    [e0, b, c],
                    [e1, b, c],
                    [e2, b, c],
                ]);

                world.despawn(e0);
                world.despawn(e1);
                world.despawn(e2);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);
            });
        });

        describe('withAny queries', () => {
            it('should return the correct query result with single "withAny" queries when spawning', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
                        two: queryBuilder<WorldComponent>().includeEntity().withAny([1, 2]).compile(),
                        three: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1, 2]).compile(),
                        four: queryBuilder<WorldComponent>().withAny([0, 1]).compile(),
                        five: queryBuilder<WorldComponent>().withAny([0, 3]).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;
                const four = world.getQuery('four').result;
                const five = world.getQuery('five').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };

                const e0 = world.spawn(0, [a]);
                const e1 = world.spawn(1, [b]);
                const e2 = world.spawn(2, [c]);

                expect(one).toEqual([
                    [e0, a],
                    [e1, b],
                ]);
                expect(two).toEqual([
                    [e1, b],
                    [e2, c],
                ]);
                expect(three).toEqual([
                    [e0, a],
                    [e1, b],
                    [e2, c],
                ]);
                expect(four).toEqual([[a], [b]]);
                expect(five).toEqual([[a]]);
            });

            it('should return the correct query result with single "withAny" query when adding a component', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
                        two: queryBuilder<WorldComponent>().withAny([1, 2]).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };
                const d: D = { type: 3, data: { vel: [0, 0] } };

                const e0 = world.spawn(0, [d]);
                const e1 = world.spawn(1, [d]);
                const e2 = world.spawn(2, [d]);

                expect(one).toEqual([]);
                expect(two).toEqual([]);

                world.addComponent(e0, a);
                world.addComponent(e1, b);
                world.addComponent(e2, c);

                expect(one).toEqual([
                    [e0, a],
                    [e1, b],
                ]);
                // e1, e2
                expect(two).toEqual([[b], [c]]);
            });

            it('should return the correct query result with single "withAny" query when removing a component', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
                        two: queryBuilder<WorldComponent>().withAny([1, 2]).compile(),
                        three: queryBuilder<WorldComponent>().withAny([3, 4]).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };

                const e0 = world.spawn(0, [a]);
                const e1 = world.spawn(1, [b]);
                const e2 = world.spawn(2, [c]);

                expect(one).toEqual([
                    [e0, a],
                    [e1, b],
                ]);
                expect(two).toEqual([[b], [c]]);
                expect(three).toEqual([]);

                world.removeComponent(e0, 0);

                expect(one).toEqual([[e1, b]]);
                expect(two).toEqual([[b], [c]]);
                expect(three).toEqual([]);

                world.removeComponent(e1, 1);

                expect(one).toEqual([]);
                expect(two).toEqual([[c]]);
                expect(three).toEqual([]);

                world.removeComponent(e2, 2);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);
            });

            it('should return the correct query result with single "withAny" query when despawning entities', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().withAny([0, 1]).compile(),
                        two: queryBuilder<WorldComponent>().withAny([1, 2]).compile(),
                        three: queryBuilder<WorldComponent>().withAny([3, 4]).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };

                const e0 = world.spawn(0, [a]);
                const e1 = world.spawn(1, [b]);
                const e2 = world.spawn(2, [c]);

                expect(one).toEqual([
                    [e0, a],
                    [e1, b],
                ]);
                expect(two).toEqual([[b], [c]]);
                expect(three).toEqual([]);

                world.despawn(e0);

                expect(one).toEqual([[e1, b]]);
                expect(two).toEqual([[b], [c]]);
                expect(three).toEqual([]);

                world.despawn(e1);

                expect(one).toEqual([]);
                expect(two).toEqual([[c]]);
                expect(three).toEqual([]);

                world.despawn(e2);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);
            });
        });

        describe('combined with and withAny queries', () => {
            it('should respect the query order and ignore the component order', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().includeEntity().with(0).with(1).compile(),
                        two: queryBuilder<WorldComponent>().includeEntity().with(1).with(0).compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };

                const e0 = world.spawn(0, [a, b]);
                const e1 = world.spawn(1, [b, a]);

                expect(one).toEqual([
                    [e0, a, b],
                    [e1, a, b],
                ]);
                expect(two).toEqual([
                    [e0, b, a],
                    [e1, b, a],
                ]);
            });

            it('should return the correct query result for a complex query (with and without map)', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .registerQueries({
                        one: queryBuilder<WorldComponent>().with(0).with(1).withAny([2, 3]).with(4).compile(),
                        two: queryBuilder<WorldComponent>()
                            .includeEntity()
                            .with(0)
                            .with(1)
                            .withAny([2, 3])
                            .with(4)
                            .compile(),
                        three: queryBuilder<WorldComponent>()
                            .includeEntity()
                            .with(0)
                            .with(1)
                            .withAny([2, 3])
                            .with(4)
                            .map(([id, a, b, cOrD, e]) => ({
                                id,
                                a: a.type,
                                b: b.data.pos,
                                cOrD: cOrD.type,
                                e: e.data.health,
                            }))
                            .compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;
                const two = world.getQuery('two').result;
                const three = world.getQuery('three').result;

                const a: A = { type: 0 };
                const b: B = { type: 1, data: { pos: [0, 0] } };
                const c: C = { type: 2, data: { pos: [0, 0, 0] } };
                const d: D = { type: 3, data: { vel: [0, 0] } };
                const e: E = { type: 4, data: { health: 0 } };

                world.spawn(0, [a, b]);
                world.spawn(1, [b, c]);
                world.spawn(2, [c, d]);

                expect(one).toEqual([]);
                expect(two).toEqual([]);
                expect(three).toEqual([]);

                const e3 = world.spawn(3, [a, b, c, e]);
                const e4 = world.spawn(4, [a, b, d, e]);

                expect(one).toEqual([
                    [a, b, c, e],
                    [a, b, d, e],
                ]);
                expect(two).toEqual([
                    [e3, a, b, c, e],
                    [e4, a, b, d, e],
                ]);
                expect(three).toEqual([
                    {
                        id: e3,
                        a: a.type,
                        b: b.data.pos,
                        cOrD: c.type,
                        e: e.data.health,
                    },
                    {
                        id: e4,
                        a: a.type,
                        b: b.data.pos,
                        cOrD: d.type,
                        e: e.data.health,
                    },
                ]);

                world.despawn(e3);

                expect(one).toEqual([[a, b, d, e]]);
                expect(two).toEqual([[e4, a, b, d, e]]);
                expect(three).toEqual([
                    {
                        id: e4,
                        a: a.type,
                        b: b.data.pos,
                        cOrD: d.type,
                        e: e.data.health,
                    },
                ]);
            });
        });
    });
});
