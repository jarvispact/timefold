import {
    CameraBundle,
    createRenderPlugin,
    createWorld,
    DirLight,
    DirLightBundle,
    DomUtils,
    PerspectiveCamera,
    Transform,
} from '@timefold/engine';
import { Mat4x4, Vec3, Vec3Type } from '@timefold/math';
import { createSystem } from '@timefold/ecs';

export const canvas = DomUtils.getCanvasById('canvas');
export const RenderPlugin = createRenderPlugin({ canvas });
export const world = createWorld();

export const spawnCamera = (translation: Vec3Type) => {
    world.spawnBundle({
        id: 'camera',
        bundle: CameraBundle.create({
            transform: Transform.createAndLookAt({ translation, target: Vec3.zero() }),
            camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height, near: 0.1, far: 1000 }),
        }),
    });
};

export const spawnLight = (translation: Vec3Type) => {
    world.spawnBundle({
        id: 'light',
        bundle: DirLightBundle.create({
            dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.negate(translation)) }),
        }),
    });
};

const query = world.createQuery({
    query: { tuple: [{ has: '@tf/Transform' }, { has: '@tf/Mesh', include: false }] },
    map: ([transform]) => ({
        translation: transform.data.translation,
        modelMatrix: transform.data.modelMatrix,
    }),
});

const tempVec3 = Vec3.create(0, 0, 0);
const waveAmplitude = 1; // Controls height of the wave
const waveSpeed = 3; // Controls how fast the wave oscillates (lower = slower)
const waveSpread = 0.15; // Controls distance between wave peaks
let accumulatedTime = 0;

export const Update = createSystem({
    stage: 'update',
    fn: (delta) => {
        accumulatedTime += delta * waveSpeed;

        for (const entry of query) {
            const x = entry.translation[0];
            const z = entry.translation[2];
            const distanceFromCenter = Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2));
            const y = waveAmplitude * Math.sin(accumulatedTime + distanceFromCenter * waveSpread);
            Vec3.set(tempVec3, x, y, z);
            Mat4x4.fromTranslation(entry.modelMatrix, tempVec3);
        }
    },
});
