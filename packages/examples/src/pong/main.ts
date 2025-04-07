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
} from '@timefold/engine';
import { Gltf2Loader } from '@timefold/gltf2';
import { Vec3, Vec3Type } from '@timefold/math';
import { resolveEntitiesFromGltf } from './resolve-entities-from-gltf';
import { setupResizeHandler } from './resize-canvas';
import { createSimpleUnlitRenderPlugin } from './render-plugin';

type MovementComponent = Component<'Movement', { speed: Vec3Type }>;
const createMovement = (speed: Vec3Type): MovementComponent => ({ type: 'Movement', data: { speed } });

type WorldComponent = EngineComponent | MovementComponent;
const world = createWorld<WorldComponent, EngineEvent>();

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const main = async () => {
    const [circleTexture, gltf2Result] = await Promise.all([
        ImageLoader.loadImage('./pong/circle.png'),
        Gltf2Loader.load('./pong/pong-optimized.glb'),
    ]);

    const { primitiveLayout, primitive, camera, walls, player1, player2, ball } = resolveEntitiesFromGltf(gltf2Result);
    const cameraComponent = OrthographicCamera.createFromGltf2({ camera, aspect: canvas.width / canvas.height });
    const ballTransform = Transform.createFromTRS(ball);
    const ballAabb = Aabb.create('auto');
    const ballMovement = createMovement(Vec3.zero());

    setupResizeHandler(canvas, cameraComponent, camera);

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

            [...walls, player1, player2].forEach((entity) => {
                world.spawnBundle({
                    id: entity.name,
                    bundle: UnlitEntityBundle.create({
                        transform: Transform.createFromTRS(entity),
                        material: UnlitMaterial.create({ color: Vec3.one() }),
                    }),
                    components: [Aabb.create('auto')],
                });
            });

            world.spawnBundle({
                id: ball.name,
                bundle: UnlitEntityBundle.create({
                    transform: ballTransform,
                    material: UnlitMaterial.create({ colorMap: circleTexture }),
                }),
                components: [ballAabb, ballMovement],
            });
        },
    });

    const updatePositionQuery = world.createQuery({
        query: { tuple: [{ has: '@tf/Transform' }, { has: 'Movement' }] },
        map: ([transform, movement]) => ({
            translation: transform.data.translation,
            speed: movement.data.speed,
        }),
    });

    document.addEventListener('keypress', (e) => {
        if (e.key === ' ') {
            Vec3.set(ballMovement.data.speed, 8, 5, 0);
        } else if (e.key === 'p') {
            Vec3.set(ballMovement.data.speed, 0, 0, 0);
        }
    });

    const UpdatePositionSystem = createSystem({
        stage: 'update',
        fn: (delta) => {
            for (const { translation, speed } of updatePositionQuery) {
                Vec3.scaleAndAdd(translation, speed, delta);
            }
        },
    });

    const collisionQuery = world.createQuery({ query: { tuple: [{ has: '@tf/Aabb' }] } });
    const collisionResult = { collided: false, direction: undefined } as AabbCollisionResult;

    const CollisionSystem = createSystem({
        stage: 'update',
        fn: () => {
            for (const [aabb] of collisionQuery) {
                Aabb.intersection(collisionResult, ballAabb, aabb);
                if (!collisionResult.collided) continue;
                if (collisionResult.direction === 'up') {
                    ballTransform.data.translation[1] = aabb.data.min[1] - (ballTransform.data.scale[1] + 0.01);
                    ballMovement.data.speed[1] *= -1;
                } else if (collisionResult.direction === 'bottom') {
                    ballTransform.data.translation[1] = aabb.data.max[1] + (ballTransform.data.scale[1] + 0.01);
                    ballMovement.data.speed[1] *= -1;
                } else if (collisionResult.direction === 'left') {
                    ballTransform.data.translation[0] = aabb.data.max[0] + (ballTransform.data.scale[0] + 0.01);
                    ballMovement.data.speed[0] *= -1;
                } else if (collisionResult.direction === 'right') {
                    ballTransform.data.translation[0] = aabb.data.min[0] - (ballTransform.data.scale[0] + 0.01);
                    ballMovement.data.speed[0] *= -1;
                }
            }
        },
    });

    const RenderPlugin = createSimpleUnlitRenderPlugin({ canvas, primitiveLayout, primitive });

    world
        .registerPlugins([
            RenderPlugin,
            UpdateCameraFromTransformPlugin,
            UpdateTransformMatricesPlugin,
            UpdateAabbFromTransformPlugin,
        ])
        .registerSystems([StartupSystem, UpdatePositionSystem, CollisionSystem]);

    await world.run();
};

void main();
