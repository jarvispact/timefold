import {
    CameraBundle,
    createRenderPlugin,
    createWorld,
    DirLight,
    DirLightBundle,
    DomUtils,
    InterleavedPrimitive,
    Mesh,
    MeshBundle,
    PerspectiveCamera,
    PhongMaterial,
    Transform,
    UpdateCameraFromTransformPlugin,
} from '@timefold/engine';
import { createSystem } from '@timefold/ecs';
import { ObjLoader } from '@timefold/obj';
import { MathUtils, Vec3 } from '@timefold/math';

const world = createWorld();
const canvas = DomUtils.getCanvasById('canvas');
const RenderPlugin = createRenderPlugin({ canvas });

const Startup = createSystem({
    stage: 'startup',
    fn: async () => {
        const { info, objects } = await ObjLoader.load('./suzanne.obj');

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(1, 2, 3), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'sun',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.negate(Vec3.create(-3, 5, 10))) }),
            }),
        });

        world.spawnBundle({
            id: 'suzanne',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({ diffuseColor: Vec3.create(0.42, 0.42, 0.42) }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(objects.Suzanne.primitives.default, info),
                }),
            }),
        });
    },
});

const updateQuery = world.createQuery({
    query: { tuple: [{ has: '@tf/Transform' }, { has: '@tf/Mesh', include: false }] },
});

const RotationSystem = createSystem({
    stage: 'update',
    fn: (delta) => {
        for (const [transform] of updateQuery) {
            Transform.rotateY(transform, MathUtils.degreesToRadians(45) * delta);
        }
    },
});

const main = async () => {
    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin])
        .registerSystems([Startup, RotationSystem])
        .run();
};

void main();
