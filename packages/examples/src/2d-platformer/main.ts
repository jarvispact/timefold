import { createSystem } from '@timefold/ecs';
import { world } from './world';
import {
    Aabb,
    CameraBundle,
    PerspectiveCamera,
    Transform,
    UnlitEntityBundle,
    UnlitMaterial,
    UpdateAabbFromTransformPlugin,
    UpdateCameraFromTransformPlugin,
    UpdateTransformMatricesPlugin,
} from '@timefold/engine';
import { Vec3 } from '@timefold/math';
import { createRenderPlugin } from './render-plugin';
import { ObjLoader } from '../../../obj/src/obj';
import { PlayerControllerPlugin, playerEntityId } from './player-controller-plugin';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;
const RenderPlugin = createRenderPlugin(canvas);

const Startup = createSystem({
    stage: 'startup',
    fn: () => {
        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(0, 0, 25), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'brick1',
            bundle: UnlitEntityBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, -5, 0) }),
                material: UnlitMaterial.create({ color: Vec3.create(1, 0, 0) }),
            }),
            components: [Aabb.create({ min: Vec3.zero(), max: Vec3.zero() })],
        });

        world.spawnBundle({
            id: 'brick2',
            bundle: UnlitEntityBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(-5, -5, 0) }),
                material: UnlitMaterial.create({ color: Vec3.create(0, 0, 1) }),
            }),
            components: [Aabb.create({ min: Vec3.zero(), max: Vec3.zero() })],
        });

        world.spawnBundle({
            id: 'brick3',
            bundle: UnlitEntityBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(5, -5, 0) }),
                material: UnlitMaterial.create({ color: Vec3.create(0, 1, 0) }),
            }),
            components: [Aabb.create({ min: Vec3.zero(), max: Vec3.zero() })],
        });

        world.spawnBundle({
            id: playerEntityId,
            bundle: UnlitEntityBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                material: UnlitMaterial.create({ color: Vec3.one() }),
            }),
            components: [
                Aabb.create({ min: Vec3.zero(), max: Vec3.zero() }),
                { type: 'TargetPosition', data: { position: Vec3.create(0, 0, 0) } },
            ],
        });

        world.spawnBundle({
            id: 'brick-left',
            bundle: UnlitEntityBundle.create({
                transform: Transform.createFromTRS({
                    translation: Vec3.create(-10, 0, 0),
                    scale: Vec3.create(2, 1, 0),
                }),
                material: UnlitMaterial.create({ color: Vec3.create(0, 1, 0) }),
            }),
            components: [Aabb.create({ min: Vec3.zero(), max: Vec3.zero() })],
        });

        world.spawnBundle({
            id: 'brick-right',
            bundle: UnlitEntityBundle.create({
                transform: Transform.createFromTRS({
                    translation: Vec3.create(10, 0, 0),
                    scale: Vec3.create(1, 2, 0),
                }),
                material: UnlitMaterial.create({ color: Vec3.create(0, 1, 0) }),
            }),
            components: [Aabb.create({ min: Vec3.zero(), max: Vec3.zero() })],
        });
    },
});

// before update
//      handle input
// update
//      update transform
//      update aabb
//      apply gravity
//      handle collision
// after update
//      update model and normal matrix
//      update camera from modelmatrix
// render
//      render scene

const run = async () => {
    const Loader = ObjLoader.createLoader({ mode: 'interleaved-typed-array' });
    const objResult = await Loader.load('./2d-platformer/plane.obj');
    const planePrimitive = objResult.objects.Plane.primitives.default;

    world
        .setResource('planeGeometry', { vertices: planePrimitive.vertices, info: objResult.info })
        .registerPlugins([
            UpdateAabbFromTransformPlugin,
            PlayerControllerPlugin,
            UpdateTransformMatricesPlugin,
            UpdateCameraFromTransformPlugin,
            RenderPlugin,
        ])
        .registerSystems([Startup]);

    await world.run();
};

void run();
