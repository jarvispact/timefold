/* eslint-disable @typescript-eslint/no-unused-vars */
import { it, describe, expect, expectTypeOf, vitest } from 'vitest';
import { createWorld } from './world';
import { Component, createComponent } from './component';
import { DefineEcsEvent, EcsEvent } from './event';

type Vec2 = [number, number];
type Vec3 = [number, number, number];

type A = Component<'A'>;
type B = Component<'B', Vec2>;
type C = Component<'C', Vec3>;
type D = Component<'D', Float32Array>;
type WorldComponent = A | B | C | D;

type EventA = DefineEcsEvent<'E1'>;
type EventB = DefineEcsEvent<'E2', { a: string }>;
type EventC = DefineEcsEvent<'E3', { b: number }>;
type WorldEvent = EventA | EventB | EventC;

function createA(): A {
    return createComponent('A');
}

function createB(x: number, y: number): B {
    return createComponent('B', [x, y]);
}

function createC(x: number, y: number, z: number): C {
    return createComponent('C', [x, y, z]);
}

function createD(data: Float32Array): D {
    return createComponent('D', data);
}

describe('world', () => {
    describe('createEntity', () => {
        it('should create a sequence of entity ids and reuse ids of previously despawned entities', () => {
            const world = createWorld<WorldComponent>();
            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();
            const e3 = world.createEntity();

            world.spawn(e0, [createA()]);
            world.spawn(e1, [createA()]);
            world.spawn(e2, [createA()]);
            world.spawn(e3, [createA()]);

            expect(e0).toEqual(0);
            expect(e1).toEqual(1);
            expect(e2).toEqual(2);
            expect(e3).toEqual(3);

            world.despawn(e1);
            world.despawn(e3);

            const e4 = world.createEntity();
            const e5 = world.createEntity();

            expect(e4).toEqual(3);
            expect(e5).toEqual(1);
        });
    });

    describe('getComponent', () => {
        it('should return the correct component for an entity', () => {
            const world = createWorld<WorldComponent>();
            const e0 = world.createEntity();
            const e1 = world.createEntity();

            world.spawn(e0, [createA(), createB(1, 2)]);
            world.spawn(e1, [createB(3, 4), createC(5, 6, 7)]);

            expect(world.getComponent(e0, 'A')).toEqual({ type: 'A' });
            expect(world.getComponent(e0, 'B')).toEqual({ type: 'B', data: [1, 2] });
            expect(world.getComponent(e1, 'B')).toEqual({ type: 'B', data: [3, 4] });
            expect(world.getComponent(e1, 'C')).toEqual({ type: 'C', data: [5, 6, 7] });

            expectTypeOf(world.getComponent(e0, 'A')).toEqualTypeOf<A | undefined>();
            expectTypeOf(world.getComponent(e0, 'B')).toEqualTypeOf<B | undefined>();
            expectTypeOf(world.getComponent(e1, 'C')).toEqualTypeOf<C | undefined>();
        });
    });

    describe('serialize/deserialize', () => {
        it('should serialize and deserialize the world state', () => {
            const world = createWorld<WorldComponent>();
            const e0 = world.createEntity();
            const e1 = world.createEntity();

            world.spawn(e0, [createA(), createB(1.1, 2.02)]);
            world.spawn(e1, [createB(-3, -4.4), createC(5.005, 6.0006, 7.00007)]);

            const serialized = world.serialize();

            const expectedState = `
[meta]
version=1
[componentTypes]
A=0
B=1
C=2
[entities]
0|{"type":"A"}|{"type":"B","data":[1.1,2.02]}
1|{"type":"B","data":[-3,-4.4]}|{"type":"C","data":[5.005,6.0006,7.00007]}
`.trim();

            expect(serialized).toEqual(expectedState);

            const newWorld = createWorld<WorldComponent>();
            newWorld.deserialize(serialized);

            expect(newWorld.getComponent(e0, 'A')).toEqual({ type: 'A' });
            expect(newWorld.getComponent(e0, 'B')).toEqual({ type: 'B', data: [1.1, 2.02] });
            expect(newWorld.getComponent(e1, 'B')).toEqual({ type: 'B', data: [-3, -4.4] });
            expect(newWorld.getComponent(e1, 'C')).toEqual({ type: 'C', data: [5.005, 6.0006, 7.00007] });

            expect(newWorld.createEntity()).toEqual(2);
        });

        it('should handle serialization and deserialization of non JSON-serializable components via custom functions', () => {
            const world = createWorld<WorldComponent>();
            const e0 = world.createEntity();

            world.spawn(e0, [createD(new Float32Array([1.5, 2.5, 3.5, 4.5]))]);

            const serialized = world.serialize({
                serializeComponent: (component) => {
                    switch (component.type) {
                        case 'D':
                            return JSON.stringify({
                                type: component.type,
                                data: Array.from(component.data),
                            });
                        default:
                            return JSON.stringify(component);
                    }
                },
            });

            const expectedState = `
[meta]
version=1
[componentTypes]
D=0
[entities]
0|{"type":"D","data":[1.5,2.5,3.5,4.5]}
`.trim();

            expect(serialized).toEqual(expectedState);

            const newWorld = createWorld<WorldComponent>();
            newWorld.deserialize(serialized, {
                deserializeComponent: (serialized) => {
                    const parsed = JSON.parse(serialized) as WorldComponent;
                    switch (parsed.type) {
                        case 'D':
                            return {
                                type: 'D',
                                data: new Float32Array(parsed.data),
                            };
                        default:
                            return parsed;
                    }
                },
            });

            expect(newWorld.getComponent(e0, 'D')).toEqual({ type: 'D', data: new Float32Array([1.5, 2.5, 3.5, 4.5]) });
            expect(newWorld.createEntity()).toEqual(1);
        });
    });

    describe('events', () => {
        it('should return the correct type when no event type was passed', () => {
            const world = createWorld<WorldComponent>();
            type World = typeof world;
            type Emit = Parameters<World['emit']>[0];
            type On = Parameters<World['on']>[0];

            expectTypeOf<Emit>().toExtend<{ type: string }>();
            expectTypeOf<On>().toExtend<EcsEvent<WorldComponent>['type']>();

            expectTypeOf<{ type: string }>().toExtend<Emit>();
            expectTypeOf<EcsEvent<WorldComponent>['type']>().toExtend<On>();
        });

        it('should return the correct type when passed as generic', () => {
            const world = createWorld<WorldComponent, WorldEvent>();
            type World = typeof world;
            type Emit = Parameters<World['emit']>[0];
            type On = Parameters<World['on']>[0];

            expectTypeOf<Emit>().toExtend<WorldEvent>();
            expectTypeOf<On>().toExtend<(WorldEvent | EcsEvent<WorldComponent>)['type']>();

            expectTypeOf<WorldEvent>().toExtend<Emit>();
            expectTypeOf<(WorldEvent | EcsEvent<WorldComponent>)['type']>().toExtend<On>();
        });

        it('should call all event handlers', () => {
            const world = createWorld<WorldComponent, WorldEvent>();

            const mockA = vitest.fn();
            world.on('E1', mockA);

            const mockB = vitest.fn();
            world.on('E2', mockB);

            const mockC = vitest.fn();
            world.on('E3', mockC);

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

            world.emit({ type: 'E1' });
            world.emit({ type: 'E2', payload: { a: 'foo' } });
            world.emit({ type: 'E3', payload: { b: 42 } });

            world.spawn(0, [{ type: 'A' }]);
            world.addComponent(0, { type: 'B', data: [0, 0] });
            world.removeComponent(0, 'B');
            world.despawn(0);

            world.setResource('deltaTime', 0.16);
            world.removeResource('deltaTime');

            expect(mockA.mock.lastCall).toEqual([undefined]);
            expect(mockB.mock.lastCall).toEqual([{ a: 'foo' }]);
            expect(mockC.mock.lastCall).toEqual([{ b: 42 }]);

            expect(mockSpawn.mock.lastCall).toEqual([{ entity: 0, components: [{ type: 'A' }] }]);
            expect(mockAdd.mock.lastCall).toEqual([{ entity: 0, component: { type: 'B', data: [0, 0] } }]);
            expect(mockRemove.mock.lastCall).toEqual([{ entity: 0, component: { type: 'B', data: [0, 0] } }]);
            expect(mockDespawn.mock.lastCall).toEqual([{ entity: 0 }]);
            expect(mockSetResource.mock.lastCall).toEqual([{ name: 'deltaTime', data: 0.16 }]);
            expect(mockRemoveResource.mock.lastCall).toEqual([{ name: 'deltaTime', data: 0.16 }]);
        });
    });
});
