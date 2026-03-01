import { createComponent, defineComponents, InferComponents, number, query, vec2, worldBuilder } from '@timefold/ecs';
import { Vec2 } from '@timefold/math';

const components = defineComponents({
    Position: vec2,
    Velocity: vec2,
    Health: number,
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
// world.updateQueries();
movementSystem();
updateHealthSystem();
renderSystem();
console.log({ movableEntities, livelyEntities });

/**
// =======================
// =======================
// =======================
// variant1

Register systems on the builder instance. The systems need to be passed everything as a argument because world does not exist yet.

Also we need to resolve the system order/dependencies inside the world. This could get very complex as i want to support various system stages and sync and async systems. Nested arrays express async systems that can be executed in parallel.

const spawnEnemies = (world) => { ... }
const spawnPlayers = (world) => { ... }
const positionCamera = (world) => { ... }
const applyGravity = (world) => { ... }
const movementSystem = (world) => { ... }
const updateHealthSystem = (world) => { ... }
const renderToTexture = (world) => { ... }
const postProcess = (world) => { ... }
const renderToScreen = (world) => { ... }

const world = worldBuilder()
    .withComponents(components)
    .withQueries(renderable, movable, lively)
    .withSystems(spawnEnemies, spawnPlayers, positionCamera, applyGravity, movementSystem, updateHealthSystem, renderToTexture, postProcess, renderToScreen)
    .compile();

So we need to define the order / dependencies for each stage. Something like:

{
    startup: [[spawnEnemies, spawnPlayers], positionCamera],
    update: [applyGravity, [movementSystem, updateHealthSystem]],
    render: [renderToTexture, postProcess, renderToScreen],
}

Then we kick off the frame:
world.run();

// =======================
// =======================
// =======================
// variant2

const world = worldBuilder().withComponents(components).withQueries(renderable, movable, lively).compile();

const spawnEnemies = (world) => { ... }
const spawnPlayers = (world) => { ... }
const positionCamera = () => { ... }
const applyGravity = () => { ... }
const movementSystem = () => { ... }
const updateHealthSystem = () => { ... }
const renderToTexture = () => { ... }
const postProcess = () => { ... }
const renderToScreen = () => { ... }

Final order can be composed by the consumer in a single array without stages. Nested arrays express async systems that can be executed in parallel.

const systemsInOrder = [[spawnEnemies, spawnPlayers], positionCamera, applyGravity, [movementSystem, updateHealthSystem], renderToTexture, postProcess, renderToScreen];

Then we kick off the frame:
world.run(systemsInOrder);
 */
