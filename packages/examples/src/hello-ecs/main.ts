import { createComponent, defineComponents, InferComponents, query, worldBuilder } from '@timefold/ecs';
import * as S from '@timefold/ecs/schema';
import { Vec2 } from '@timefold/math';

const components = defineComponents({
    Position: S.vec2,
    Velocity: S.vec2,
    Health: S.number,
    Renderable: undefined,
});

type WorldComponent = InferComponents<typeof components>;

const renderable = query<WorldComponent>()
    .name('renderable')
    .with('Position')
    .with('Renderable', { include: false })
    .map(([pos]) => ({ pos: pos.data }))
    .compile();

const movable = query<WorldComponent>()
    .name('movable')
    .with('Position')
    .with('Velocity')
    .map(([pos, vel]) => ({ pos: pos.data, vel: vel.data }))
    .compile();

const lively = query<WorldComponent>()
    .name('lively')
    .with('Health')
    .map(([health]) => ({ health: health.data }))
    .compile();

const world = worldBuilder().withComponents(components).withQueries(renderable, movable, lively).compile();

const renderableEntities = world.getQueryResults('renderable');
const movableEntities = world.getQueryResults('movable');
const livelyEntities = world.getQueryResults('lively');

const spawnSystem = () => {
    for (let i = 0; i < 10; i++) {
        const entity = world.createEntity();
        world.spawn(entity, [
            createComponent('Position', Vec2.create(i, i)),
            createComponent('Velocity', Vec2.create(1, 0)),
            createComponent('Health', 100),
        ]);
    }
};

const movementSystem = () => {
    console.log('movement system', movableEntities.length);

    for (const item of movableEntities) {
        Vec2.add(item.pos, item.vel);
    }
};

const updateHealthSystem = () => {
    console.log('health system', livelyEntities.length);

    for (const item of livelyEntities) {
        item.health -= 1;
    }
};

const renderSystem = () => {
    console.log('render system', renderableEntities.length);

    for (const item of renderableEntities) {
        console.log(`Entity at position (${item.pos[0]}, ${item.pos[1]})`);
    }
};

spawnSystem();
movementSystem();
updateHealthSystem();
renderSystem();
console.log({ movableEntities, livelyEntities });
