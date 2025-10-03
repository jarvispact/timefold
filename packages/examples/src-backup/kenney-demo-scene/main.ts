import { createSystem } from '@timefold/ecs';
import {
    createWorld,
    CameraBundle,
    DomUtils,
    Mesh,
    MeshBundle,
    PerspectiveCamera,
    InterleavedPrimitive,
    Transform,
    UpdateCameraFromTransformPlugin,
    EngineWorld,
    createRenderPlugin,
    PhongMaterial,
    DirLightBundle,
    DirLight,
} from '@timefold/engine';
import { Mat4x4, MathUtils, Quat, Vec3 } from '@timefold/math';
import { MtlLoader, ObjLoader } from '@timefold/obj';

const canvas = DomUtils.getCanvasById('canvas');

const Startup = createSystem({
    stage: 'startup',
    fn: async (world: EngineWorld) => {
        const [{ info, objects }, { materials }] = await Promise.all([
            ObjLoader.load('./kenney-demo-scene/kenney-demo-scene.obj'),
            MtlLoader.load('./kenney-demo-scene/kenney-demo-scene.mtl'),
        ]);

        const primitives = Object.values(objects.Boxes.primitives);

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(0, 15, 40), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'sun',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.negate(Vec3.create(10, 20, 50))) }),
            }),
        });

        world.spawnBundle({
            id: 'scene',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create(
                    primitives.map((primitive) => {
                        return {
                            material: PhongMaterial.create({
                                diffuseColor: materials[primitive.name].diffuseColor,
                                specularColor: Vec3.create(0.1, 0.1, 0.1),
                                shininess: 32,
                            }),
                            primitive: InterleavedPrimitive.fromObjPrimitive(primitive, info),
                        };
                    }),
                ),
            }),
        });
    },
});

const world = createWorld();

const query = world.createQuery({
    query: { tuple: [{ has: '@tf/Transform' }, { has: '@tf/Mesh', include: false }] },
    map: ([transform]) => transform.data,
});

const Update = createSystem({
    stage: 'update',
    fn: (delta) => {
        for (const entry of query) {
            Quat.rotateY(entry.rotation, MathUtils.degreesToRadians(10) * delta);
            Mat4x4.fromRotationTranslationScale(entry.modelMatrix, entry.rotation, entry.translation, entry.scale);
            Mat4x4.modelToNormal(entry.normalMatrix, entry.modelMatrix);
        }
    },
});

const run = async () => {
    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, createRenderPlugin({ canvas, msaa: 4 })])
        .registerSystems([Startup, Update])
        .run({ loop: true, printFps: true });
};

void run();
