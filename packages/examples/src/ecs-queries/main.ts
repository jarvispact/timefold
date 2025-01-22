import { Component, System, World } from '@timefold/ecs';
import { Vec2 } from '@timefold/math';

type PositionComponent = Component.Type<'Position', Vec2.Type>;
type VelocityComponent = Component.Type<'Velocity', Vec2.Type>;
type MoveableComponent = Component.Type<'Moveable'>;
type WorldComponent = PositionComponent | VelocityComponent | MoveableComponent;

const createComponents = (vel: Vec2.Type, isMoveable: boolean) => {
    const position = Component.create('Position', Vec2.create(0, 0));
    const velocity = Component.create('Velocity', vel);
    const moveable = Component.create('Moveable');
    return isMoveable ? [position, velocity, moveable] : [position, velocity];
};

const world = World.create<WorldComponent>();

const query = world.createQuery(
    { includeId: true, tuple: [{ has: 'Position' }, { has: 'Velocity' }, { has: 'Moveable', include: false }] },
    { map: ([id, pos, vel]) => ({ id, position: pos.data, velocity: vel.data }) },
);

const MyStartupSystem = System.create({
    stage: 'startup',
    fn: () => {
        world.spawnEntity('0', createComponents(Vec2.create(1, 0), true));
        world.spawnEntity('1', createComponents(Vec2.create(0, 0), false));
        world.spawnEntity('2', createComponents(Vec2.create(0, 2), true));
    },
});

let timeToPrintState = performance.now() + 1000;

const MyUpdateSystem = System.create({
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
