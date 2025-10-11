import {
    queryBuilder,
    defineSystem,
    defineResources,
    defineQueries,
    defineSystemGraph,
    createWorld,
} from '@timefold/ecs';
import { Vec2 } from '@timefold/math';
import { createRenderer } from './renderer';
import {
    createBallTag,
    createColor,
    createPosition,
    createShape,
    createVelocity,
    Shape,
    T,
    WorldComponent,
} from './components';
import {
    ARENA_BOTTOM,
    ARENA_LEFT,
    ARENA_RIGHT,
    ARENA_TOP,
    ball,
    BALL_RADIUS,
    BALL_START_POSITION,
    BALL_START_VELOCITY,
    canvas,
    player1,
    PLAYER1_HALF_EXTENDS,
    PLAYER1_START_POSITION,
    PLAYER1_START_VELOCITY,
    player2,
    PLAYER2_HALF_EXTENDS,
    PLAYER2_START_POSITION,
    PLAYER2_START_VELOCITY,
} from './constants';
import { checkCircleBoxCollision } from './collision-utils';

const renderer = createRenderer(canvas);

const resources = defineResources({ delta: 0 });

const queries = defineQueries({
    movable: queryBuilder<WorldComponent>()
        .with(T.Position)
        .with(T.Velocity)
        .map(([position, velocity]) => ({
            position: position.data,
            velocity: velocity.data,
        }))
        .compile(),
    collidable: queryBuilder<WorldComponent>()
        .with(T.Position)
        .with(T.Shape)
        .with(T.Velocity)
        .with(T.Color)
        .map(([position, shape, velocity]) => ({
            position: position.data,
            shape: shape.data,
            velocity: velocity.data,
        }))
        .compile(),
    renderable: queryBuilder<WorldComponent>()
        .with(T.Position)
        .with(T.Color)
        .with(T.Shape)
        .map(([position, color, shape]) => ({
            position: position.data,
            color: color.data,
            shape: shape.data,
        }))
        .onAdd((_entity, renderable) => {
            console.log(renderable);

            renderer.addEntity(renderable);
        })
        .compile(),
});

const systemGraph = defineSystemGraph({
    systems: {
        spawnPlayerAndBall: defineSystem({ stage: 'startup' }),
        checkCollisions: defineSystem({ stage: 'update' }),
        handleMovement: defineSystem({ stage: 'update' }),
        render: defineSystem({ stage: 'render' }),
    },
    orderByStage: {
        update: ['handleMovement', 'checkCollisions'],
    },
});

const world = createWorld<WorldComponent>().withResources(resources).withQueries(queries).withSystemGraph(systemGraph);

const movable = world.getQuery('movable');
const collidable = world.getQuery('collidable');

world.insertSystems({
    spawnPlayerAndBall: () => {
        world.spawn(ball, [
            createBallTag(),
            createPosition(BALL_START_POSITION),
            createVelocity(BALL_START_VELOCITY),
            createShape({ type: Shape.Circle, radius: BALL_RADIUS }),
            createColor('white'),
        ]);

        world.spawn(player1, [
            createBallTag(),
            createPosition(PLAYER1_START_POSITION),
            createVelocity(PLAYER1_START_VELOCITY),
            createShape({ type: Shape.Box, halfExtends: PLAYER1_HALF_EXTENDS }),
            createColor('white'),
        ]);

        world.spawn(player2, [
            createBallTag(),
            createPosition(PLAYER2_START_POSITION),
            createVelocity(PLAYER2_START_VELOCITY),
            createShape({ type: Shape.Box, halfExtends: PLAYER2_HALF_EXTENDS }),
            createColor('white'),
        ]);
    },
    checkCollisions: () => {
        for (const item of collidable) {
            if (item.shape.type === Shape.Circle) {
                const radius = item.shape.radius;

                // Left wall
                if (item.position[0] - radius < ARENA_LEFT[0]) {
                    item.position[0] = ARENA_LEFT[0] + radius;
                    item.velocity[0] = -item.velocity[0];
                }

                // Right wall
                if (item.position[0] + radius > ARENA_RIGHT[0]) {
                    item.position[0] = ARENA_RIGHT[0] - radius;
                    item.velocity[0] = -item.velocity[0];
                }

                // Top wall
                if (item.position[1] - radius < ARENA_TOP[1]) {
                    item.position[1] = ARENA_TOP[1] + radius;
                    item.velocity[1] = -item.velocity[1];
                }

                // Bottom wall
                if (item.position[1] + radius > ARENA_BOTTOM[1]) {
                    item.position[1] = ARENA_BOTTOM[1] - radius;
                    item.velocity[1] = -item.velocity[1];
                }
            } else {
                const halfW = item.shape.halfExtends[0];
                const halfH = item.shape.halfExtends[1];
                // Left wall
                if (item.position[0] - halfW < ARENA_LEFT[0]) {
                    item.position[0] = ARENA_LEFT[0] + halfW;
                    item.velocity[0] = -item.velocity[0];
                }
                // Right wall
                if (item.position[0] + halfW > ARENA_RIGHT[0]) {
                    item.position[0] = ARENA_RIGHT[0] - halfW;
                    item.velocity[0] = -item.velocity[0];
                }
                // Top wall
                if (item.position[1] - halfH < ARENA_TOP[1]) {
                    item.position[1] = ARENA_TOP[1] + halfH;
                    item.velocity[1] = -item.velocity[1];
                }
                // Bottom wall
                if (item.position[1] + halfH > ARENA_BOTTOM[1]) {
                    item.position[1] = ARENA_BOTTOM[1] - halfH;
                    item.velocity[1] = -item.velocity[1];
                }
            }

            for (const item2 of collidable) {
                if (item === item2) continue;

                if (item.shape.type === Shape.Circle && item2.shape.type === Shape.Box) {
                    if (
                        checkCircleBoxCollision(
                            { position: item.position, radius: item.shape.radius },
                            { position: item2.position, halfExtends: item2.shape.halfExtends },
                        )
                    ) {
                        console.log('collision');
                    }
                }
            }
        }
    },
    handleMovement: (dt) => {
        for (const item of movable) {
            Vec2.add(item.position, item.velocity, dt);
        }
    },
    render: () => {
        renderer.render();
    },
});

void world.start();
