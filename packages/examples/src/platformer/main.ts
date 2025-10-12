import {
    createWorld,
    defineQueries,
    defineResources,
    defineSystem,
    defineSystemGraph,
    queryBuilder,
} from '@timefold/ecs';
import { Vec2 } from '@timefold/math';
import {
    createInputMapping,
    createPosition,
    createShape,
    createVelocity,
    Shape,
    T,
    WorldComponent,
} from './components';
import { createRenderer } from './renderer';
import { circleBoxCollision, createCollisionResult } from './collision-utils';

// canvas

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const renderer = createRenderer(canvas);

// entity

let entity = 0;
const nextEntityId = () => entity++;

// world

const resources = defineResources({
    gravity: Vec2.scale(Vec2.up(), 600),
});

const queries = defineQueries({
    renderable: queryBuilder<WorldComponent>()
        .with(T.Position)
        .with(T.Shape)
        .map(([position, shape]) => ({
            position: position.data,
            shape: shape.data,
        }))
        .onAdd((_entity, renderable) => {
            renderer.addEntity(renderable);
        })
        .compile(),
    movable: queryBuilder<WorldComponent>()
        .with(T.Position)
        .with(T.Shape)
        .with(T.Velocity)
        .map(([position, shape, velocity]) => ({
            position: position.data,
            shape: shape.data,
            velocity: velocity.data,
        }))
        .compile(),
});

const systemGraph = defineSystemGraph({
    systems: {
        spawnLevel: defineSystem({ stage: 'startup' }),
        handleInput: defineSystem({ stage: 'update' }),
        applyGravity: defineSystem({ stage: 'update' }),
        handleMovement: defineSystem({ stage: 'update' }),
        checkCollisions: defineSystem({ stage: 'update' }),
        render: defineSystem({ stage: 'render' }),
    },
    orderByStage: {
        update: ['handleInput', 'applyGravity', 'handleMovement', 'checkCollisions'],
    },
});

const world = createWorld<WorldComponent>().withResources(resources).withQueries(queries).withSystemGraph(systemGraph);

const movable = world.getQuery('movable');
const renderable = world.getQuery('renderable');

const ballInputMap = { Left: 'ArrowLeft', Right: 'ArrowRight', Jump: ' ' };
const ballVelocity = Vec2.create(0, 0);
let isGrounded = false;
const input = { left: false, right: false, jump: false };

const gravity = world.getResource('gravity');
const collisionResult = createCollisionResult();

document.addEventListener('keydown', (event) => {
    if (event.key === ballInputMap.Jump && isGrounded) {
        input.jump = true;
    }

    if (event.key === ballInputMap.Left) {
        input.left = true;
    }
    if (event.key === ballInputMap.Right) {
        input.right = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === ballInputMap.Left) {
        input.left = false;
    }
    if (event.key === ballInputMap.Right) {
        input.right = false;
    }
});

world.insertSystems({
    spawnLevel: () => {
        world.spawn(nextEntityId(), [
            createPosition(Vec2.create(150, canvas.height - 50)),
            createShape({ type: Shape.Box, halfExtends: Vec2.create(canvas.width / 8, 20) }),
        ]);

        world.spawn(nextEntityId(), [
            createPosition(Vec2.create(canvas.width / 2, canvas.height - 50)),
            createShape({ type: Shape.Box, halfExtends: Vec2.create(canvas.width / 8, 20) }),
        ]);

        world.spawn(nextEntityId(), [
            createPosition(Vec2.create(canvas.width - 150, canvas.height - 50)),
            createShape({ type: Shape.Box, halfExtends: Vec2.create(canvas.width / 8, 20) }),
        ]);

        world.spawn(nextEntityId(), [
            createPosition(Vec2.create(canvas.width / 2, 150)),
            createShape({ type: Shape.Circle, radius: 30 }),
            createVelocity(ballVelocity),
            createInputMapping(ballInputMap),
        ]);
    },
    handleInput: () => {
        if (input.jump) {
            ballVelocity[1] = -500;
            input.jump = false;
        }

        if (input.left && input.right) {
            ballVelocity[0] = 0;
        } else if (input.left) {
            ballVelocity[0] = -300;
        } else if (input.right) {
            ballVelocity[0] = 300;
        } else {
            ballVelocity[0] = 0;
        }
    },
    applyGravity: (delta) => {
        for (const item of movable) {
            Vec2.add(item.velocity, gravity, delta);
        }
    },
    handleMovement: (delta) => {
        for (const item of movable) {
            Vec2.add(item.position, item.velocity, delta);
        }
    },
    checkCollisions: () => {
        isGrounded = false;

        for (const item of renderable) {
            for (const item2 of renderable) {
                if (item === item2) continue;

                if (
                    item.shape.type === Shape.Circle &&
                    item2.shape.type === Shape.Box &&
                    circleBoxCollision(
                        collisionResult,
                        { position: item.position, radius: item.shape.radius },
                        { position: item2.position, halfExtends: item2.shape.halfExtends },
                    )
                ) {
                    item.position[0] += collisionResult.normal[0] * collisionResult.penetration;
                    item.position[1] += collisionResult.normal[1] * collisionResult.penetration;
                    isGrounded = true;
                    ballVelocity[0] = 0;
                    ballVelocity[1] = 0;
                }
            }
        }
    },
    render: () => {
        renderer.render();
    },
});

void world.start();
