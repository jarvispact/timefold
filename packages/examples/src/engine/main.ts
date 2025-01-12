import { System } from '@timefold/ecs';
import {
    PhongMaterial,
    DirLight,
    PerspectiveCamera,
    Transform,
    UpdateCameraFromTransformPlugin,
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
            world.spawnEntity('camera', [
                Transform.createAndLookAt(Vec3.create(0, 2, 5), Vec3.zero()),
                PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            ]);

            world.spawnEntity('light1', [DirLight.create({ direction: Vec3.normalize([-1, 2, -5]), intensity: 0.2 })]);

            world.spawnEntity('light2', [DirLight.create({ direction: Vec3.normalize([1, 2, -5]), intensity: 0.2 })]);

            world.spawnEntity('light3', [DirLight.create({ direction: Vec3.normalize([2, 1, 4]), intensity: 0.6 })]);

            world.spawnEntity('entity1', [
                Transform.createFromTRS({ translation: [-1, 0, 0] }),
                PhongMaterial.create({ diffuseColor: [0.965, 0.447, 0.502] }),
            ]);

            world.spawnEntity('entity2', [
                Transform.createFromTRS({ translation: [1, 0, 0] }),
                PhongMaterial.create({ diffuseColor: [0.208, 0.361, 0.49] }),
            ]);
        },
    });

    const query = world.createQuery(
        { tuple: [{ has: '@timefold/Transform' }, { has: '@timefold/PhongMaterial', include: false }] },
        {
            map: ([transform]) => [transform.data.modelMatrix, transform.data.normalMatrix] as const,
        },
    );

    const UpdateSystem = System.create({
        stage: 'update',
        fn: (delta) => {
            for (const [modelMatrix, normalMatrix] of query) {
                Mat4x4.rotateY(modelMatrix, MathUtils.degreesToRadians(90 * delta));
                Mat4x4.modelToNormal(normalMatrix, modelMatrix);
            }
        },
    });

    world.registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin]);
    world.registerSystems([StartupSystem, UpdateSystem]);
    await world.run();
};

void run();
