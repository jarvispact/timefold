import { Component, createComponent, createWorld, createSystem } from '@timefold/ecs';
import { Vec2, Vec2Type } from '@timefold/math';

type PositionComponent = Component<'Position', Vec2Type>;
type VelocityComponent = Component<'Velocity', Vec2Type>;
type MoveableComponent = Component<'Moveable'>;
type WorldComponent = PositionComponent | VelocityComponent | MoveableComponent;

const createComponents = (vel: Vec2Type, isMoveable: boolean) => {
    const position = createComponent('Position', Vec2.create(0, 0));
    const velocity = createComponent('Velocity', vel);
    const moveable = createComponent('Moveable');
    return isMoveable ? [position, velocity, moveable] : [position, velocity];
};

const world = createWorld<WorldComponent>();

const query = world.createQuery({
    query: { includeId: true, tuple: [{ has: 'Position' }, { has: 'Velocity' }, { has: 'Moveable', include: false }] },
    map: ([id, pos, vel]) => ({ id, position: pos.data, velocity: vel.data }),
});

const MyStartupSystem = createSystem({
    stage: 'startup',
    fn: () => {
        world.spawnEntity('0', createComponents(Vec2.create(1, 0), true));
        world.spawnEntity('1', createComponents(Vec2.create(0, 0), false));
        world.spawnEntity('2', createComponents(Vec2.create(0, 2), true));
    },
});

let timeToPrintState = performance.now() + 1000;

const MyUpdateSystem = createSystem({
    stage: 'update',
    fn: (_, time) => {
        let state = '';

        for (const { id, position, velocity } of query) {
            Vec2.add(position, velocity);
            state += `entity(${id}, [${position[0]}, ${position[1]}])\n`;
        }

        if (time > timeToPrintState) {
            console.log(state);
            timeToPrintState = performance.now() + 1000;
        }
    },
});

world.registerSystems([MyStartupSystem, MyUpdateSystem]);

void (async () => {
    await world.run();
})();
