/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, it, describe, expectTypeOf } from 'vitest';
import { worldBuilder } from './world';
import { Component } from './component';

type A = Component<0>;
type B = Component<1, { pos: [number, number] }>;
type C = Component<2, { pos: [number, number, number] }>;
type D = Component<3, { vel: [number, number] }>;
type E = Component<4, { health: number }>;
type WorldComponent = A | B | C | D | E;

describe('world', () => {
    describe('entities and components', () => {
        it('should return the correct component type', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const id = world.spawn([a]);
            const component = world.getComponent(id, 0);
            expectTypeOf(component).toExtend<A | undefined>();
        });

        it('should spawn a collection of components and return the id of the entity', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const b: B = { type: 1, data: { pos: [0, 0] } };

            {
                const id = world.spawn([a, b]);
                expect(id).toEqual(0);
            }
            {
                const id = world.spawn([a, b]);
                expect(id).toEqual(1);
            }
        });

        it('should get components by entity id and component type', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const b: B = { type: 1, data: { pos: [0, 0] } };

            const id = world.spawn([a, b]);
            expect(world.getComponent(id, 0)).toEqual(a);
            expect(world.getComponent(id, 1)).toEqual(b);
            expect(world.getComponent(id, 2)).toEqual(undefined);
        });

        it('should add a component to an entity', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const b: B = { type: 1, data: { pos: [0, 0] } };
            const c: C = { type: 2, data: { pos: [0, 0, 0] } };

            const id = world.spawn([a, b]);
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
            const id = world.spawn([a]);

            const result = world.addComponent(id, newA);
            expect(result).toEqual(false);
            expect(world.getComponent(id, 0)).toBe(a);
        });

        it('should remove a component from an entity', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const a: A = { type: 0 };
            const id = world.spawn([a]);
            expect(world.getComponent(id, 0)).toEqual(a);

            const result = world.removeComponent(id, 0);
            expect(result).toEqual(true);
            expect(world.getComponent(id, 0)).toEqual(undefined);
        });

        it('should not remove a component from an entity if it does not have this component', () => {
            const world = worldBuilder<WorldComponent>().compile();
            const b: B = { type: 1, data: { pos: [0, 0] } };
            const id = world.spawn([b]);

            const result = world.removeComponent(id, 0);
            expect(result).toEqual(false);
            expect(world.getComponent(id, 0)).toBe(undefined);
        });
    });

    describe('resources', () => {
        it('should return the correct type when passed as generic', () => {
            const world = worldBuilder<
                WorldComponent,
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
            const world = worldBuilder<WorldComponent, { res1: string }>().compile();
            expect(world.getResource('res1')).toEqual(undefined);
            world.setResource('res1', 'data');
            expect(world.getResource('res1')).toEqual('data');
            world.removeResource('res1');
            expect(world.getResource('res1')).toEqual(undefined);
        });
    });
});
