import {
    Component,
    createWorld,
    defineQueries,
    defineResources,
    defineSystem,
    defineSystemGraph,
    queryBuilder,
} from '@timefold/ecs';
import { Vec2 } from '@timefold/math';
import {
    CircleShape,
    createCollider,
    createInputMapping,
    createPlayerTag,
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
    collidable: queryBuilder<WorldComponent>()
        .with(T.Position)
        .with(T.Shape)
        .with(T.Collider)
        .map(([position, shape]) => ({
            position: position.data,
            shape: shape.data,
        }))
        .compile(),
    movable: queryBuilder<WorldComponent>()
        .with(T.Position)
        .with(T.Shape)
        .with(T.Velocity)
        .with(T.PlayerTag)
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

const movable = world.getQueryResults('movable');
const collidable = world.getQueryResults('collidable');

const ball = {
    position: createPosition(Vec2.create(canvas.width / 2, 150)),
    shape: createShape({ type: Shape.Circle, radius: 30 }) as Component<typeof T.Shape, CircleShape>,
    velocity: createVelocity(Vec2.create(0, 0)),
};

const ballInputMap = { Left: 'ArrowLeft', Right: 'ArrowRight', Jump: ' ' };
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
            createCollider(),
        ]);

        world.spawn(nextEntityId(), [
            createPosition(Vec2.create(canvas.width / 2, canvas.height - 50)),
            createShape({ type: Shape.Box, halfExtends: Vec2.create(canvas.width / 8, 20) }),
            createCollider(),
        ]);

        world.spawn(nextEntityId(), [
            createPosition(Vec2.create(canvas.width - 150, canvas.height - 50)),
            createShape({ type: Shape.Box, halfExtends: Vec2.create(canvas.width / 8, 20) }),
            createCollider(),
        ]);

        world.spawn(nextEntityId(), [
            ball.position,
            ball.shape,
            ball.velocity,
            createInputMapping(ballInputMap),
            createPlayerTag(),
        ]);
    },
    handleInput: () => {
        if (input.jump) {
            ball.velocity.data[1] = -500;
            input.jump = false;
        }

        if (input.left && input.right) {
            ball.velocity.data[0] = 0;
        } else if (input.left) {
            ball.velocity.data[0] = -300;
        } else if (input.right) {
            ball.velocity.data[0] = 300;
        } else {
            ball.velocity.data[0] = 0;
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

        for (const item of collidable) {
            if (
                item.shape.type === Shape.Box &&
                circleBoxCollision(
                    collisionResult,
                    { position: ball.position.data, radius: ball.shape.data.radius },
                    { position: item.position, halfExtends: item.shape.halfExtends },
                )
            ) {
                ball.position.data[0] += collisionResult.normal[0] * collisionResult.penetration;
                ball.position.data[1] += collisionResult.normal[1] * collisionResult.penetration;

                const dotProduct = Vec2.dot(ball.velocity.data, collisionResult.normal);
                if (dotProduct < 0) {
                    ball.velocity.data[0] -= collisionResult.normal[0] * dotProduct;
                    ball.velocity.data[1] -= collisionResult.normal[1] * dotProduct;
                }

                if (collisionResult.normal[1] < -0.5) {
                    isGrounded = true;
                }
            }
        }
    },
    render: () => {
        renderer.render();
    },
});

void world.startup();
