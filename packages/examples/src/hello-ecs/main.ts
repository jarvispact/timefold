import { createComponent, defineComponents, InferComponents, query, system, worldBuilder } from '@timefold/ecs';
import * as S from '@timefold/ecs/schema';
import { Vec2 } from '@timefold/math';

// 1. Define components

const components = defineComponents({
    Position: S.vec2,
    Velocity: S.vec2,
    Moveable: undefined,
});

type WorldComponent = InferComponents<typeof components>;

// 2. Define queries

const moveQuery = query<WorldComponent>()
    .name('move')
    .with('Position')
    .with('Velocity')
    .with('Moveable', { include: false })
    .map(([pos, vel]) => ({ position: pos.data, velocity: vel.data }))
    .compile();

const renderQuery = query<WorldComponent>()
    .name('render')
    .includeEntity()
    .with('Position')
    .map(([entity, pos]) => ({ entity, position: pos.data }))
    .compile();

// 3. Build world

const world = worldBuilder().withComponents(components).withQueries(moveQuery, renderQuery).compile();

// 4. Get query result references (stable arrays, updated by world.update)

const moveables = world.getQueryResults('move');
const renderables = world.getQueryResults('render');

// 5. Define systems

const spawnSystem = system(() => {
    world.spawn([
        createComponent('Position', Vec2.create(0, 0)),
        createComponent('Velocity', Vec2.create(1, 0)),
        createComponent('Moveable'),
    ]);
    world.spawn([
        createComponent('Position', Vec2.create(0, 0)),
        createComponent('Velocity', Vec2.create(0, 2)),
        createComponent('Moveable'),
    ]);
    world.spawn([createComponent('Position', Vec2.create(5, 5)), createComponent('Velocity', Vec2.create(0, 0))]);
});

const movementSystem = system(() => {
    for (let i = 0; i < moveables.length; i++) {
        Vec2.add(moveables[i].position, moveables[i].velocity);
    }
});

let nextPrintTime = 0;

const renderSystem = system(() => {
    const now = performance.now();
    if (now < nextPrintTime) return;

    nextPrintTime = now + 1000;

    for (let i = 0; i < renderables.length; i++) {
        const { entity, position } = renderables[i];
        console.log(`entity ${entity} at (${position[0]}, ${position[1]})`);
    }
});

// 6. Run

world.run({
    startup: [spawnSystem],
    update: [movementSystem, renderSystem],
});
