import { Component, createSystem } from '@timefold/ecs';
import {
    Aabb,
    CameraBundle,
    AabbCollisionResult,
    createWorld,
    EngineComponent,
    EngineEvent,
    ImageLoader,
    OrthographicCamera,
    Transform,
    UnlitEntityBundle,
    UnlitMaterial,
    UpdateAabbFromTransformPlugin,
    UpdateCameraFromTransformPlugin,
    UpdateTransformMatricesPlugin,
    EngineResources,
} from '@timefold/engine';
import { Gltf2Loader } from '@timefold/gltf2';
import { Vec3, Vec3Type } from '@timefold/math';
import { resolveEntitiesFromGltf } from './resolve-entities-from-gltf';
import { createSimpleUnlitRenderPlugin } from './render-plugin';
import { setupInputListeners } from './input';
import { updateUi } from './ui';

// TODO: Should functions that operate on components only take their data?
// Might not work for genericly typed components

type Paddle = Component<'Paddle', { inputBinds: { up: string; down: string } }>;
type Ball = Component<'Ball'>;
type Velocity = Component<'Velocity', { direction: Vec3Type; speed: number }>;

const createVelocity = (direction: Vec3Type, speed: number): Velocity => ({
    type: 'Velocity',
    data: { direction, speed },
});

type WorldComponent = EngineComponent | Paddle | Ball | Velocity;
type WorldResources = EngineResources & { scoreBoard: { player1: number; player2: number } };

const scoreBoard: WorldResources['scoreBoard'] = { player1: 0, player2: 0 };
updateUi(scoreBoard);

const world = createWorld<WorldComponent, EngineEvent, WorldResources>();
world.setResource('scoreBoard', scoreBoard);

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const Input = setupInputListeners(window);

const main = async () => {
    const [circleTexture, gltf2Result] = await Promise.all([
        ImageLoader.loadImage('./pong/circle.png'),
        Gltf2Loader.load('./pong/pong-optimized.glb'),
    ]);

    const { primitiveLayout, primitive, camera, walls, player1, player2, ball } = resolveEntitiesFromGltf(gltf2Result);
    const cameraComponent = OrthographicCamera.createFromGltf2({ camera, aspect: canvas.width / canvas.height });
    const ballTransform = Transform.createFromTRS(ball);
    const ballAabb = Aabb.create('auto');
    const ballVelocity = createVelocity(Vec3.create(0.7, 0.3, 0), 0);
    const ballInitialPosition = Vec3.createCopy(ball.translation);

    const RenderPlugin = createSimpleUnlitRenderPlugin({
        canvas,
        primitiveLayout,
        primitive,
        onResize: ({ aspect }) => OrthographicCamera.updateFromGltf2(cameraComponent, camera, aspect),
    });

    document.addEventListener('keypress', (e) => {
        if (e.key === ' ') {
            ballVelocity.data.speed = 10 + scoreBoard.player1 + scoreBoard.player2;
        } else if (e.key === 'p') {
            ballVelocity.data.speed = 0;
        }
    });

    const StartupSystem = createSystem({
        stage: 'startup',
        fn: () => {
            world.spawnBundle({
                id: 'camera',
                bundle: CameraBundle.create({
                    transform: Transform.createAndLookAt({ translation: camera.translation, target: Vec3.zero() }),
                    camera: cameraComponent,
                }),
            });

            walls.forEach((entity) => {
                world.spawnBundle({
                    id: entity.name,
                    bundle: UnlitEntityBundle.create({
                        transform: Transform.createFromTRS(entity),
                        material: UnlitMaterial.create({ color: Vec3.one() }),
                    }),
                    components: [Aabb.create('auto')],
                });
            });

            [player1, player2].forEach((entity, idx) => {
                world.spawnBundle({
                    id: entity.name,
                    bundle: UnlitEntityBundle.create({
                        transform: Transform.createFromTRS(entity),
                        material: UnlitMaterial.create({ color: Vec3.one() }),
                    }),
                    components: [
                        Aabb.create('auto'),
                        { type: 'Velocity', data: { direction: Vec3.zero(), speed: 0 } },
                        idx === 0
                            ? { type: 'Paddle', data: { inputBinds: { up: 'w', down: 's' } } }
                            : { type: 'Paddle', data: { inputBinds: { up: 'ArrowUp', down: 'ArrowDown' } } },
                    ],
                });
            });

            world.spawnBundle({
                id: ball.name,
                bundle: UnlitEntityBundle.create({
                    transform: ballTransform,
                    material: UnlitMaterial.create({ colorMap: circleTexture }),
                }),
                components: [ballAabb, ballVelocity, { type: 'Ball' }],
            });
        },
    });

    const playerInputQuery = world.createQuery({ query: { tuple: [{ has: 'Velocity' }, { has: 'Paddle' }] } });

    const PlayerInputSystem = createSystem({
        stage: 'before-update',
        fn: () => {
            for (const [velocity, paddle] of playerInputQuery) {
                velocity.data.speed = 0;

                const up = Input.keyDown(paddle.data.inputBinds.up);
                const down = Input.keyDown(paddle.data.inputBinds.down);

                if (up && !down) {
                    velocity.data.direction[1] = 1;
                    velocity.data.speed = 10;
                } else if (down && !up) {
                    velocity.data.direction[1] = -1;
                    velocity.data.speed = 10;
                }
            }
        },
    });

    const updatePositionQuery = world.createQuery({
        query: { tuple: [{ has: '@tf/Transform' }, { has: 'Velocity' }] },
        map: ([transform, velocity]) => ({
            translation: transform.data.translation,
            velocity: velocity.data,
        }),
    });

    const UpdatePositionSystem = createSystem({
        stage: 'update',
        fn: (delta) => {
            for (const { translation, velocity } of updatePositionQuery) {
                Vec3.scaleAndAdd(translation, velocity.direction, velocity.speed * delta);
            }
        },
    });

    const collisionQuery = world.createQuery({ query: { includeId: true, tuple: [{ has: '@tf/Aabb' }] } });
    const collisionResult = { collided: false, direction: undefined } as AabbCollisionResult;

    const CollisionSystem = createSystem({
        stage: 'update',
        fn: () => {
            const board = world.getResource('scoreBoard');

            for (const [id, aabb] of collisionQuery) {
                Aabb.intersection(collisionResult, ballAabb, aabb);
                if (!collisionResult.collided) continue;

                if (collisionResult.direction === 'up') {
                    ballTransform.data.translation[1] = aabb.data.min[1] - (ballTransform.data.scale[1] + 0.01);
                    ballVelocity.data.direction[1] *= -1;
                } else if (collisionResult.direction === 'bottom') {
                    ballTransform.data.translation[1] = aabb.data.max[1] + (ballTransform.data.scale[1] + 0.01);
                    ballVelocity.data.direction[1] *= -1;
                } else if (collisionResult.direction === 'left') {
                    ballTransform.data.translation[0] = aabb.data.max[0] + (ballTransform.data.scale[0] + 0.01);
                    ballVelocity.data.direction[0] *= -1;
                    if (id === 'WallLeft') {
                        ballVelocity.data.speed = 0;
                        Vec3.copy(ballTransform.data.translation, ballInitialPosition);
                        board.player2++;
                    }
                } else if (collisionResult.direction === 'right') {
                    ballTransform.data.translation[0] = aabb.data.min[0] - (ballTransform.data.scale[0] + 0.01);
                    ballVelocity.data.direction[0] *= -1;
                    if (id === 'WallRight') {
                        ballVelocity.data.speed = 0;
                        Vec3.copy(ballTransform.data.translation, ballInitialPosition);
                        board.player1++;
                    }
                }

                updateUi(board);
            }
        },
    });

    world
        .registerPlugins([
            RenderPlugin,
            UpdateCameraFromTransformPlugin,
            UpdateTransformMatricesPlugin,
            UpdateAabbFromTransformPlugin,
        ])
        .registerSystems([StartupSystem, PlayerInputSystem, UpdatePositionSystem, CollisionSystem]);

    await world.run();
};

void main();
