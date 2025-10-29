import {
    Component,
    createComponent,
    createEntitySequence,
    defineComponentTypes,
    defineQueries,
    defineSystem,
    defineSystemGraph,
    queryBuilder,
    worldBuilder,
} from '@timefold/ecs';
import { Vec2, Vec2Type } from '@timefold/math';

const { T } = defineComponentTypes(['Position', 'Velocity', 'Moveable']);

type PositionComponent = Component<typeof T.Position, Vec2Type>;
type VelocityComponent = Component<typeof T.Velocity, Vec2Type>;
type MoveableComponent = Component<typeof T.Moveable>;
type WorldComponent = PositionComponent | VelocityComponent | MoveableComponent;

const createComponents = (vel: Vec2Type, isMoveable: boolean) => {
    const position = createComponent(T.Position, Vec2.create(0, 0));
    const velocity = createComponent(T.Velocity, vel);
    const moveable = createComponent(T.Moveable);
    return isMoveable ? [position, velocity, moveable] : [position, velocity];
};

const queries = defineQueries({
    movable: queryBuilder<WorldComponent>()
        .includeEntity()
        .with(T.Position)
        .with(T.Velocity)
        .with(T.Moveable)
        .map(([id, pos, vel]) => ({ id, position: pos.data, velocity: vel.data }))
        .compile(),
});

const systemGraph = defineSystemGraph({
    systems: {
        spawnEntities: defineSystem({ stage: 'startup' }),
        moveEntities: defineSystem({ stage: 'update' }),
    },
});

const { nextId } = createEntitySequence();
const world = worldBuilder<WorldComponent>().withQueries(queries).withSystemGraph(systemGraph).compile();

const movable = world.getQueryResults('movable');

function spawnEntities() {
    world.spawn(nextId(), createComponents(Vec2.create(1, 0), true));
    world.spawn(nextId(), createComponents(Vec2.create(0, 0), false));
    world.spawn(nextId(), createComponents(Vec2.create(0, 2), true));
}

let timeToPrintState = performance.now() + 1000;

function moveEntities(delta: number, time: number) {
    let state = '';

    for (const { id, position, velocity } of movable) {
        Vec2.add(position, velocity, delta);
        state += `entity(${id}, [${position[0]}, ${position[1]}])\n`;
    }

    if (time > timeToPrintState) {
        console.log(state);
        timeToPrintState = performance.now() + 1000;
    }
}

world.insertSystems({ spawnEntities, moveEntities });

void (async () => {
    await world.start();
})();
