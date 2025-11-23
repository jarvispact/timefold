import { it, describe, expect } from 'vitest';
import { createWorld } from './world';
import { Component, createComponent } from './component';

type Vec2 = [number, number];
type Vec3 = [number, number, number];

type A = Component<'A'>;
type B = Component<'B', Vec2>;
type C = Component<'C', Vec3>;
type D = Component<'D', Float32Array>;
type WorldComponent = A | B | C | D;

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

    describe('serialize/deserialize', () => {
        it('should serialize and deserialize the world state', () => {
            const world = createWorld<WorldComponent>();
            const e0 = world.createEntity();
            const e1 = world.createEntity();

            world.spawn(e0, [createA(), createB(1.1, 2.02)]);
            world.spawn(e1, [createB(-3, -4.4), createC(5.005, 6.0006, 7.00007)]);

            const serialized = world.serialize();

            const expectedState = `
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
        });
    });
});
