import { System } from '@timefold/ecs';
import {
    PhongMaterial,
    DirLightBundle,
    PerspectiveCamera,
    Transform,
    UpdateCameraFromTransformPlugin,
    DirLight,
    CameraBundle,
    PhongBundle,
    Data,
    Structs,
} from '@timefold/engine';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { createRenderPlugin } from './render-plugin';
import { world } from './world';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const run = async () => {
    const RenderPlugin = await createRenderPlugin(canvas);

    const StartupSystem = System.create({
        stage: 'startup',
        fn: () => {
            world.spawnBundle({
                id: 'camera',
                bundle: CameraBundle.create({
                    transform: Transform.createAndLookAt(Vec3.create(0, 2, 5), Vec3.zero()),
                    camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
                }),
            });

            world.spawnBundle({
                id: 'light1',
                bundle: DirLightBundle.create({
                    dirLight: DirLight.create({ direction: Vec3.normalize([-1, 2, -5]), intensity: 0.2 }),
                }),
            });

            world.spawnBundle({
                id: 'light2',
                bundle: DirLightBundle.create({
                    dirLight: DirLight.create({ direction: Vec3.normalize([1, 2, -5]), intensity: 0.2 }),
                }),
            });

            world.spawnBundle({
                id: 'light3',
                bundle: DirLightBundle.create({
                    dirLight: DirLight.create({ direction: Vec3.normalize([2, 1, 4]), intensity: 0.6 }),
                }),
            });

            world.spawnBundle({
                id: 'entity1',
                bundle: PhongBundle.create({
                    data: Data.create(new SharedArrayBuffer(Structs.PhongEntity.bufferSize)),
                    transform: Transform.createFromTRS({ translation: [-1, 0, 0] }),
                    material: PhongMaterial.create({ diffuseColor: [0.965, 0.447, 0.502] }),
                }),
                components: [{ type: 'Rotation', data: 45 }],
            });

            world.spawnBundle({
                id: 'entity2',
                bundle: PhongBundle.create({
                    transform: Transform.createFromTRS({ translation: [1, 0, 0] }),
                    material: PhongMaterial.create({ diffuseColor: [0.208, 0.361, 0.49] }),
                }),
                components: [{ type: 'Rotation', data: 90 }],
            });
        },
    });

    const query = world.createQuery(
        {
            tuple: [{ has: '@tf/Transform' }, { has: 'Rotation' }],
        },
        {
            map: ([transform, rotation]) =>
                [transform.data.modelMatrix, transform.data.normalMatrix, rotation.data] as const,
        },
    );

    const UpdateSystem = System.create({
        stage: 'update',
        fn: (delta) => {
            for (const [modelMatrix, normalMatrix, rotation] of query) {
                Mat4x4.rotateY(modelMatrix, MathUtils.degreesToRadians(rotation * delta));
                Mat4x4.modelToNormal(normalMatrix, modelMatrix);
            }
        },
    });

    world.registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin]);
    world.registerSystems([StartupSystem, UpdateSystem]);
    await world.run();
};

void run();
