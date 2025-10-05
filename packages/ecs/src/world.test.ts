/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, it, describe, expectTypeOf, vitest } from 'vitest';
import { World, worldBuilder } from './world';
import { Component, defineComponentTypes } from './component';
import { defineQueries, queryBuilder, QueryDefinition } from './query';
import { DefineEcsEvent, EcsEvent } from './event';
import { createAsyncSystem, createSystem, defineSystemGraph } from './system';

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

            expectTypeOf<Emit>().toExtend<never>();
            expectTypeOf<On>().toExtend<EcsEvent<WorldComponent>['type']>();

            expectTypeOf<never>().toExtend<Emit>();
            expectTypeOf<EcsEvent<WorldComponent>['type']>().toExtend<On>();
        });

        it('should return the correct type when passed as generic', () => {
            const world = worldBuilder<WorldComponent, WorldEvent>().compile();
            type World = typeof world;
            type Emit = Parameters<World['emit']>[0];
            type On = Parameters<World['on']>[0];

            expectTypeOf<Emit>().toExtend<WorldEvent>();
            expectTypeOf<On>().toExtend<(WorldEvent | EcsEvent<WorldComponent>)['type']>();

            expectTypeOf<WorldEvent>().toExtend<Emit>();
            expectTypeOf<(WorldEvent | EcsEvent<WorldComponent>)['type']>().toExtend<On>();
        });

        it('should call all event handlers', () => {
            const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>().compile();

            const mockA = vitest.fn();
            world.on('A', mockA);

            const mockB = vitest.fn();
            world.on('B', mockB);

            const mockC = vitest.fn();
            world.on('C', mockC);

            const mockSpawn = vitest.fn();
            world.on('ecs/spawn-entity', mockSpawn);

            const mockAdd = vitest.fn();
            world.on('ecs/add-component', mockAdd);

            const mockRemove = vitest.fn();
            world.on('ecs/remove-component', mockRemove);

            const mockDespawn = vitest.fn();
            world.on('ecs/despawn-entity', mockDespawn);

            const mockSetResource = vitest.fn();
            world.on('ecs/set-resource', mockSetResource);

            const mockRemoveResource = vitest.fn();
            world.on('ecs/remove-resource', mockRemoveResource);

            world.emit({ type: 'A' });
            world.emit({ type: 'B', payload: { a: 'foo' } });
            world.emit({ type: 'C', payload: { b: 42 } });

            world.spawn(0, [{ type: 0 }]);
            world.addComponent(0, { type: 1, data: { pos: [0, 0] } });
            world.removeComponent(0, 1);
            world.despawn(0);

            world.setResource('deltaTime', 0.16);
            world.removeResource('deltaTime');

            expect(mockA.mock.lastCall).toEqual([undefined]);
            expect(mockB.mock.lastCall).toEqual([{ a: 'foo' }]);
            expect(mockC.mock.lastCall).toEqual([{ b: 42 }]);

            expect(mockSpawn.mock.lastCall).toEqual([{ entity: 0, components: [{ type: 0 }] }]);
            expect(mockAdd.mock.lastCall).toEqual([{ entity: 0, component: { type: 1, data: { pos: [0, 0] } } }]);
            expect(mockRemove.mock.lastCall).toEqual([{ entity: 0, component: { type: 1, data: { pos: [0, 0] } } }]);
            expect(mockDespawn.mock.lastCall).toEqual([{ entity: 0 }]);
            expect(mockSetResource.mock.lastCall).toEqual([{ name: 'deltaTime', data: 0.16 }]);
            expect(mockRemoveResource.mock.lastCall).toEqual([{ name: 'deltaTime', data: 0.16 }]);
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
                .defineQueries({
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
                .defineQueries({
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
                    .defineQueries({
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
                    .defineQueries({
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
                    .defineQueries({
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
                    .defineQueries({
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
                    .defineQueries({
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
                    .defineQueries({
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

            it('should be able to handle lots of different component types (bitset array) across multiple actions', () => {
                const T = defineComponentTypes([
                    'T00',
                    'T01',
                    'T02',
                    'T03',
                    'T04',
                    'T05',
                    'T06',
                    'T07',

                    'T08',
                    'T09',
                    'T10',
                    'T11',
                    'T12',
                    'T13',
                    'T14',
                    'T15',

                    'T16',
                    'T17',
                    'T18',
                    'T19',
                    'T20',
                    'T21',
                    'T22',
                    'T23',

                    'T24',
                    'T25',
                    'T26',
                    'T27',
                    'T28',
                    'T29',
                    'T30',
                    'T31',

                    // Should use index: 1 for bitset arrays
                    'T32',
                    'T33',
                ]);

                type T00 = Component<typeof T.T00, { a: boolean }>;
                type T01 = Component<typeof T.T01, { b: string }>;
                type T32 = Component<typeof T.T32, { c: number }>;
                type T33 = Component<typeof T.T33, { d: Record<string, unknown> }>;

                type WorldComp = T00 | T01 | T32 | T33;

                const world = worldBuilder<WorldComp, WorldEvent, WorldResources>()
                    .defineQueries({
                        one: queryBuilder<WorldComp>()
                            .includeEntity()
                            .with(T.T00)
                            .with(T.T01)
                            .with(T.T32)
                            .with(T.T33)
                            .map(([id, t00, t01, t32, t33]) => ({
                                id,
                                t00: t00.data,
                                t01: t01.data,
                                t32: t32.data,
                                t33: t33.data,
                            }))
                            .compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;

                const t00: T00 = { type: 0, data: { a: true } };
                const t01: T01 = { type: 1, data: { b: 'foo' } };
                const t32: T32 = { type: 32, data: { c: 42 } };
                const t33: T33 = { type: 33, data: { d: {} } };

                const e0 = world.spawn(0, [t00]);
                const e1 = world.spawn(1, [t00]);
                const e2 = world.spawn(2, [t00]);

                const e3 = world.spawn(3, [t00, t01]);
                const e4 = world.spawn(4, [t00, t01]);
                const e5 = world.spawn(5, [t00, t01]);

                const e6 = world.spawn(6, [t00, t01, t32]);
                const e7 = world.spawn(7, [t00, t01, t32]);
                const e8 = world.spawn(8, [t00, t01, t32]);

                const e9 = world.spawn(9, [t00, t01, t32, t33]);
                const e10 = world.spawn(10, [t00, t01, t32, t33]);
                const e11 = world.spawn(11, [t00, t01, t32, t33]);

                expect(one).toEqual([
                    { id: e9, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e10, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e11, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                ]);

                world.addComponent(e6, t33);
                world.addComponent(e7, t33);
                world.addComponent(e8, t33);

                expect(one).toEqual([
                    { id: e9, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e10, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e11, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e6, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e7, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e8, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                ]);

                world.addComponent(e3, t32);
                world.addComponent(e4, t32);
                world.addComponent(e5, t32);

                world.addComponent(e3, t33);
                world.addComponent(e4, t33);
                world.addComponent(e5, t33);

                expect(one).toEqual([
                    { id: e9, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e10, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e11, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e6, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e7, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e8, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e3, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e4, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e5, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                ]);

                world.addComponent(e0, t01);
                world.addComponent(e1, t01);
                world.addComponent(e2, t01);

                world.addComponent(e0, t32);
                world.addComponent(e1, t32);
                world.addComponent(e2, t32);

                world.addComponent(e0, t33);
                world.addComponent(e1, t33);
                world.addComponent(e2, t33);

                expect(one).toEqual([
                    { id: e9, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e10, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e11, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e6, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e7, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e8, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e3, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e4, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e5, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e0, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e1, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e2, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                ]);

                world.removeComponent(e9, T.T00);
                world.removeComponent(e10, T.T32);
                world.removeComponent(e11, T.T33);

                expect(one).toEqual([
                    { id: e2, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e1, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e0, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e6, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e7, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e8, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e3, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e4, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e5, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                ]);

                world.despawn(e0);
                world.despawn(e1);
                world.despawn(e2);

                expect(one).toEqual([
                    { id: e3, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e4, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e5, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },

                    { id: e6, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e7, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                    { id: e8, t00: t00.data, t01: t01.data, t32: t32.data, t33: t33.data },
                ]);
            });
        });

        describe('withAny queries', () => {
            it('should return the correct query result with single "withAny" queries when spawning', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .defineQueries({
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
                    .defineQueries({
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
                    .defineQueries({
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
                    .defineQueries({
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

            it('should be able to handle lots of different component types (bitset array) across multiple actions', () => {
                const T = defineComponentTypes([
                    'T00',
                    'T01',
                    'T02',
                    'T03',
                    'T04',
                    'T05',
                    'T06',
                    'T07',

                    'T08',
                    'T09',
                    'T10',
                    'T11',
                    'T12',
                    'T13',
                    'T14',
                    'T15',

                    'T16',
                    'T17',
                    'T18',
                    'T19',
                    'T20',
                    'T21',
                    'T22',
                    'T23',

                    'T24',
                    'T25',
                    'T26',
                    'T27',
                    'T28',
                    'T29',
                    'T30',
                    'T31',

                    // Should use index: 1 for bitset arrays
                    'T32',
                    'T33',
                ]);

                type T00 = Component<typeof T.T00, { a: boolean }>;
                type T01 = Component<typeof T.T01, { b: string }>;
                type T32 = Component<typeof T.T32, { c: number }>;
                type T33 = Component<typeof T.T33, { d: Record<string, unknown> }>;

                type WorldComp = T00 | T01 | T32 | T33;

                const world = worldBuilder<WorldComp, WorldEvent, WorldResources>()
                    .defineQueries({
                        one: queryBuilder<WorldComp>()
                            .includeEntity()
                            .withAny([T.T00, T.T01])
                            .withAny([T.T32, T.T33])
                            .map(([id, t00_01, t32_33]) => ({
                                id,
                                t00_01: t00_01.data,
                                t32_33: t32_33.data,
                            }))
                            .compile(),
                    })
                    .compile();

                const one = world.getQuery('one').result;

                const t00: T00 = { type: 0, data: { a: true } };
                const t01: T01 = { type: 1, data: { b: 'foo' } };
                const t32: T32 = { type: 32, data: { c: 42 } };
                const t33: T33 = { type: 33, data: { d: {} } };

                const e0 = world.spawn(0, [t00]);
                const e1 = world.spawn(1, [t00]);
                const e2 = world.spawn(2, [t00]);

                const e3 = world.spawn(3, [t01]);
                const e4 = world.spawn(4, [t01]);
                const e5 = world.spawn(5, [t01]);

                const e6 = world.spawn(6, [t00, t32]);
                const e7 = world.spawn(7, [t00, t32]);
                const e8 = world.spawn(8, [t00, t32]);

                const e9 = world.spawn(9, [t01, t33]);
                const e10 = world.spawn(10, [t01, t33]);
                const e11 = world.spawn(11, [t01, t33]);

                expect(one).toEqual([
                    { id: e6, t00_01: t00.data, t32_33: t32.data },
                    { id: e7, t00_01: t00.data, t32_33: t32.data },
                    { id: e8, t00_01: t00.data, t32_33: t32.data },

                    { id: e9, t00_01: t01.data, t32_33: t33.data },
                    { id: e10, t00_01: t01.data, t32_33: t33.data },
                    { id: e11, t00_01: t01.data, t32_33: t33.data },
                ]);

                world.addComponent(e0, t33);
                world.addComponent(e1, t33);
                world.addComponent(e2, t33);

                expect(one).toEqual([
                    { id: e6, t00_01: t00.data, t32_33: t32.data },
                    { id: e7, t00_01: t00.data, t32_33: t32.data },
                    { id: e8, t00_01: t00.data, t32_33: t32.data },

                    { id: e9, t00_01: t01.data, t32_33: t33.data },
                    { id: e10, t00_01: t01.data, t32_33: t33.data },
                    { id: e11, t00_01: t01.data, t32_33: t33.data },

                    { id: e0, t00_01: t00.data, t32_33: t33.data },
                    { id: e1, t00_01: t00.data, t32_33: t33.data },
                    { id: e2, t00_01: t00.data, t32_33: t33.data },
                ]);

                world.addComponent(e3, t32);
                world.addComponent(e4, t32);
                world.addComponent(e5, t32);

                expect(one).toEqual([
                    { id: e6, t00_01: t00.data, t32_33: t32.data },
                    { id: e7, t00_01: t00.data, t32_33: t32.data },
                    { id: e8, t00_01: t00.data, t32_33: t32.data },

                    { id: e9, t00_01: t01.data, t32_33: t33.data },
                    { id: e10, t00_01: t01.data, t32_33: t33.data },
                    { id: e11, t00_01: t01.data, t32_33: t33.data },

                    { id: e0, t00_01: t00.data, t32_33: t33.data },
                    { id: e1, t00_01: t00.data, t32_33: t33.data },
                    { id: e2, t00_01: t00.data, t32_33: t33.data },

                    { id: e3, t00_01: t01.data, t32_33: t32.data },
                    { id: e4, t00_01: t01.data, t32_33: t32.data },
                    { id: e5, t00_01: t01.data, t32_33: t32.data },
                ]);

                world.removeComponent(e0, T.T00);
                world.removeComponent(e1, T.T00);
                world.removeComponent(e2, T.T00);

                expect(one).toEqual([
                    { id: e6, t00_01: t00.data, t32_33: t32.data },
                    { id: e7, t00_01: t00.data, t32_33: t32.data },
                    { id: e8, t00_01: t00.data, t32_33: t32.data },

                    { id: e9, t00_01: t01.data, t32_33: t33.data },
                    { id: e10, t00_01: t01.data, t32_33: t33.data },
                    { id: e11, t00_01: t01.data, t32_33: t33.data },

                    { id: e5, t00_01: t01.data, t32_33: t32.data },
                    { id: e4, t00_01: t01.data, t32_33: t32.data },
                    { id: e3, t00_01: t01.data, t32_33: t32.data },
                ]);

                world.despawn(e3);
                world.despawn(e4);
                world.despawn(e5);

                expect(one).toEqual([
                    { id: e6, t00_01: t00.data, t32_33: t32.data },
                    { id: e7, t00_01: t00.data, t32_33: t32.data },
                    { id: e8, t00_01: t00.data, t32_33: t32.data },

                    { id: e9, t00_01: t01.data, t32_33: t33.data },
                    { id: e10, t00_01: t01.data, t32_33: t33.data },
                    { id: e11, t00_01: t01.data, t32_33: t33.data },
                ]);

                world.removeComponent(e6, T.T00);
                world.removeComponent(e9, T.T01);

                world.removeComponent(e7, T.T32);
                world.removeComponent(e10, T.T33);

                expect(one).toEqual([
                    { id: e11, t00_01: t01.data, t32_33: t33.data },
                    { id: e8, t00_01: t00.data, t32_33: t32.data },
                ]);
            });

            it('should handle spawning and adding of component types correctly.', () => {
                const T = defineComponentTypes([
                    'T00',
                    'T01',
                    'T02',
                    'T03',
                    'T04',
                    'T05',
                    'T06',
                    'T07',

                    'T08',
                    'T09',
                    'T10',
                    'T11',
                    'T12',
                    'T13',
                    'T14',
                    'T15',

                    'T16',
                    'T17',
                    'T18',
                    'T19',
                    'T20',
                    'T21',
                    'T22',
                    'T23',

                    'T24',
                    'T25',
                    'T26',
                    'T27',
                    'T28',
                    'T29',
                    'T30',
                    'T31',

                    // Should use index: 1 for bitset arrays
                    'T32',
                    'T33',
                ]);

                type T00 = Component<typeof T.T00, { a: string }>;
                type T01 = Component<typeof T.T01, { b: string }>;
                type T32 = Component<typeof T.T32, { c: string }>;
                type T33 = Component<typeof T.T33, { d: string }>;

                type WorldComp = T00 | T01 | T32 | T33;

                const world = worldBuilder<WorldComp, WorldEvent, WorldResources>()
                    .defineQueries({
                        testQuery: queryBuilder<WorldComp>()
                            .includeEntity()
                            .withAny([T.T00, T.T01])
                            .withAny([T.T32, T.T33])
                            .map(([id, comp1, comp2]) => ({
                                id,
                                first: comp1.data,
                                second: comp2.data,
                            }))
                            .compile(),
                    })
                    .compile();

                const query = world.getQuery('testQuery').result;

                const t00: T00 = { type: 0, data: { a: 'has-t00' } };
                const t32: T32 = { type: 32, data: { c: 'has-t32' } };

                const e0 = world.spawn(0, [t00]);

                // no match yet - missing either t32 or t33
                expect(query).toEqual([]);

                world.addComponent(e0, t32);

                // match for e0 - has t00 and t32
                expect(query).toEqual([
                    {
                        id: e0,
                        first: { a: 'has-t00' },
                        second: { c: 'has-t32' },
                    },
                ]);

                const e1 = world.spawn(1, [t32]);

                // no match yet for e1 - only e0 is in the query
                expect(query).toEqual([
                    {
                        id: e0,
                        first: { a: 'has-t00' },
                        second: { c: 'has-t32' },
                    },
                ]);

                world.addComponent(e1, t00);

                // Now query contains e0 and e1
                expect(query).toEqual([
                    {
                        id: e0,
                        first: { a: 'has-t00' },
                        second: { c: 'has-t32' },
                    },
                    {
                        id: e1,
                        first: { a: 'has-t00' },
                        second: { c: 'has-t32' },
                    },
                ]);
            });
        });

        describe('combined with and withAny queries', () => {
            it('should respect the query order and ignore the component order', () => {
                const world = worldBuilder<WorldComponent, WorldEvent, WorldResources>()
                    .defineQueries({
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
                    .defineQueries({
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

    describe('systems', () => {
        it('should get and set the active state of a system by name', () => {
            const spawnWorld = createAsyncSystem({ stage: 'startup', fn: async () => {} });
            const spawnPlaver = createAsyncSystem({ stage: 'startup', fn: async () => {} });
            const spawnCamera = createAsyncSystem({ stage: 'startup', fn: async () => {} });

            const handleInput = createSystem({ stage: 'update', fn: () => {} });
            const applyGravity = createSystem({ stage: 'update', fn: () => {} });
            const handleMovement = createSystem({ stage: 'update', fn: () => {} });
            const checkCollisions = createSystem({ stage: 'update', fn: () => {} });

            const depthPreRenderPass = createAsyncSystem({ stage: 'render', fn: async () => {} });
            const shadowRenderPass = createAsyncSystem({ stage: 'render', fn: async () => {} });
            const mainRenderPass = createSystem({ stage: 'render', fn: () => {} });
            const postProcessRenderPass = createSystem({ stage: 'render', fn: () => {} });

            const world = worldBuilder<WorldComponent>()
                .defineSystemGraph({
                    systems: {
                        spawnWorld,
                        spawnPlaver,
                        spawnCamera,
                        handleInput,
                        applyGravity,
                        handleMovement,
                        checkCollisions,
                        depthPreRenderPass,
                        shadowRenderPass,
                        mainRenderPass,
                        postProcessRenderPass,
                    },
                    orderByStage: {
                        startup: [['spawnPlaver', 'spawnWorld'], 'spawnCamera'],
                        update: ['handleInput', 'applyGravity', 'handleMovement', 'checkCollisions'],
                        render: [['depthPreRenderPass', 'shadowRenderPass'], 'mainRenderPass', 'postProcessRenderPass'],
                    },
                })
                .compile();

            expect({
                a: world.getSystemActiveState('spawnCamera'),
                b: world.getSystemActiveState('spawnPlaver'),
                c: world.getSystemActiveState('spawnWorld'),

                d: world.getSystemActiveState('handleInput'),
                e: world.getSystemActiveState('applyGravity'),
                f: world.getSystemActiveState('handleMovement'),
                g: world.getSystemActiveState('checkCollisions'),

                h: world.getSystemActiveState('depthPreRenderPass'),
                i: world.getSystemActiveState('shadowRenderPass'),
                j: world.getSystemActiveState('mainRenderPass'),
                k: world.getSystemActiveState('postProcessRenderPass'),
            }).toEqual({
                a: true,
                b: true,
                c: true,
                d: true,
                e: true,
                f: true,
                g: true,
                h: true,
                i: true,
                j: true,
                k: true,
            });

            world.setSystemActiveState('spawnCamera', false);
            world.setSystemActiveState('spawnWorld', false);
            world.setSystemActiveState('handleInput', false);
            world.setSystemActiveState('shadowRenderPass', false);
            world.setSystemActiveState('postProcessRenderPass', false);

            expect({
                a: world.getSystemActiveState('spawnCamera'),
                b: world.getSystemActiveState('spawnPlaver'),
                c: world.getSystemActiveState('spawnWorld'),

                d: world.getSystemActiveState('handleInput'),
                e: world.getSystemActiveState('applyGravity'),
                f: world.getSystemActiveState('handleMovement'),
                g: world.getSystemActiveState('checkCollisions'),

                h: world.getSystemActiveState('depthPreRenderPass'),
                i: world.getSystemActiveState('shadowRenderPass'),
                j: world.getSystemActiveState('mainRenderPass'),
                k: world.getSystemActiveState('postProcessRenderPass'),
            }).toEqual({
                a: false,
                b: true,
                c: false,
                d: false,
                e: true,
                f: true,
                g: true,
                h: true,
                i: false,
                j: true,
                k: false,
            });
        });

        it('should allow to pass the result of defineSystemGraph as well', () => {
            const spawnWorld = createAsyncSystem({ stage: 'startup', fn: async () => {} });
            const spawnPlaver = createAsyncSystem({ stage: 'startup', fn: async () => {} });
            const spawnCamera = createAsyncSystem({ stage: 'startup', fn: async () => {} });

            const handleInput = createSystem({ stage: 'update', fn: () => {} });
            const applyGravity = createSystem({ stage: 'update', fn: () => {} });
            const handleMovement = createSystem({ stage: 'update', fn: () => {} });
            const checkCollisions = createSystem({ stage: 'update', fn: () => {} });

            const depthPreRenderPass = createAsyncSystem({ stage: 'render', fn: async () => {} });
            const shadowRenderPass = createAsyncSystem({ stage: 'render', fn: async () => {} });
            const mainRenderPass = createSystem({ stage: 'render', fn: () => {} });
            const postProcessRenderPass = createSystem({ stage: 'render', fn: () => {} });

            const systemGraph = defineSystemGraph({
                systems: {
                    spawnWorld,
                    spawnPlaver,
                    spawnCamera,
                    handleInput,
                    applyGravity,
                    handleMovement,
                    checkCollisions,
                    depthPreRenderPass,
                    shadowRenderPass,
                    mainRenderPass,
                    postProcessRenderPass,
                },
                orderByStage: {
                    startup: [['spawnPlaver', 'spawnWorld'], 'spawnCamera'],
                    update: ['handleInput', 'applyGravity', 'handleMovement', 'checkCollisions'],
                    render: [['depthPreRenderPass', 'shadowRenderPass'], 'mainRenderPass', 'postProcessRenderPass'],
                },
            });

            // TODO: Fixme
            const world = worldBuilder<WorldComponent>().defineSystemGraph(systemGraph).compile();

            expect({
                a: world.getSystemActiveState('spawnCamera'),
                b: world.getSystemActiveState('spawnPlaver'),
                c: world.getSystemActiveState('spawnWorld'),

                d: world.getSystemActiveState('handleInput'),
                e: world.getSystemActiveState('applyGravity'),
                f: world.getSystemActiveState('handleMovement'),
                g: world.getSystemActiveState('checkCollisions'),

                h: world.getSystemActiveState('depthPreRenderPass'),
                i: world.getSystemActiveState('shadowRenderPass'),
                j: world.getSystemActiveState('mainRenderPass'),
                k: world.getSystemActiveState('postProcessRenderPass'),
            }).toEqual({
                a: true,
                b: true,
                c: true,
                d: true,
                e: true,
                f: true,
                g: true,
                h: true,
                i: true,
                j: true,
                k: true,
            });
        });
    });
});
