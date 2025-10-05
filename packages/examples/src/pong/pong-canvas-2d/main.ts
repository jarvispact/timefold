import { worldBuilder, queryBuilder, createSystem } from '@timefold/ecs';
import { Vec2 } from '@timefold/math';
import { createRenderer } from './renderer';
import {
    createBallTag,
    createColor,
    createPlayerTag,
    createPosition,
    createShape,
    createVelocity,
    Shape,
    T,
    WorldComponent,
} from './components';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const renderer = createRenderer(canvas);

// TODO: system functions cannot be statically defined. They need access to the compiled world for queries and resources.
// Remove fn and spawn them instead?

const world = worldBuilder<WorldComponent>()
    .defineQueries({
        renderable: queryBuilder<WorldComponent>()
            .includeEntity()
            .with(T.Position)
            .with(T.Color)
            .with(T.Shape)
            .map(([id, position, color, shape]) => ({
                id,
                position: position.data,
                color: color.data,
                shape: shape.data,
            }))
            .onAdd((_id, renderEntity) => {
                renderer.addEntity(renderEntity);
            })
            .onRemove((entity) => {
                renderer.removeEntity(entity);
            })
            .compile(),
    })
    .defineSystemGraph({
        systems: {
            render: createSystem({
                stage: 'render',
                fn: () => {
                    renderer.render();
                },
            }),
        },
    })
    .compile();

const query = world.getQuery('renderable');

let entity = 0;
const nextEntityId = () => entity++;

const player1 = nextEntityId();
const player2 = nextEntityId();
const ball = nextEntityId();

world.spawn(player1, [
    createPlayerTag(),
    createPosition(Vec2.create(10, 10)),
    createVelocity(Vec2.create(1, 1)),
    createShape({ type: Shape.Box, halfExtends: Vec2.create(100, 200) }),
    createColor('red'),
]);
world.spawn(player2, [
    createPlayerTag(),
    createPosition(Vec2.create(300, 300)),
    createVelocity(Vec2.create(1, 1)),
    createShape({ type: Shape.Box, halfExtends: Vec2.create(200, 100) }),
    createColor('green'),
]);
world.spawn(ball, [
    createBallTag(),
    createPosition(Vec2.create(600, 600)),
    createVelocity(Vec2.create(1, 1)),
    createShape({ type: Shape.Circle, radius: 50 }),
    createColor('blue'),
]);

renderer.render();

setTimeout(() => {
    world.despawn(player1);
    renderer.render();
}, 2000);
console.log({ query });
