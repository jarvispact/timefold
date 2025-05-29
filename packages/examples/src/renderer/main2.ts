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
    DirLightBundle,
    DirLight,
    PhongMaterial,
} from '@timefold/engine';
import { MathUtils, Quat, Vec3 } from '@timefold/math';
import { ObjLoader } from '@timefold/obj';

const canvas = DomUtils.getCanvasById('canvas');

const Startup = createSystem({
    stage: 'startup',
    fn: async (world: EngineWorld) => {
        const { objects } = await ObjLoader.load('./webgpu-plane.obj');
        const planePrimitive = objects.Plane.primitives.default;

        const suzanneResult = await ObjLoader.load('./suzanne.obj');
        const suzannePrimitive = suzanneResult.objects.Suzanne.primitives.default;

        world.spawnBundle({
            id: 'light1',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({
                    direction: Vec3.normalize(Vec3.negate(Vec3.create(0, 2, -3))),
                    intensity: 0.5,
                }),
            }),
        });

        world.spawnBundle({
            id: 'light2',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({
                    direction: Vec3.normalize(Vec3.negate(Vec3.create(0, 2, 3))),
                    intensity: 1,
                }),
            }),
        });

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(0, 2, 3), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'suzanne',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({
                    translation: Vec3.create(0, 1, 0),
                    scale: Vec3.create(0.5, 0.5, 0.5),
                }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({
                        diffuseColor: Vec3.create(1, 1, 0),
                        specularColor: Vec3.create(0.8, 0.8, 0.8),
                    }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(suzannePrimitive),
                }),
            }),
        });

        world.spawnBundle({
            id: 'plane1',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, -0.2, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({
                        diffuseColor: Vec3.create(0, 1, 0),
                        specularColor: Vec3.create(0.05, 0.05, 0.05),
                    }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(planePrimitive),
                }),
            }),
        });

        world.spawnBundle({
            id: 'plane2',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({
                        diffuseColor: Vec3.create(1, 0, 0),
                        specularColor: Vec3.create(0.05, 0.05, 0.05),
                    }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(planePrimitive),
                }),
            }),
        });

        world.spawnBundle({
            id: 'plane3',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0.2, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({
                        diffuseColor: Vec3.create(0, 0, 1),
                        specularColor: Vec3.create(0.05, 0.05, 0.05),
                    }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(planePrimitive),
                }),
            }),
        });
    },
});

const world = createWorld();

const query = world.createQuery({ query: { tuple: [{ has: '@tf/Transform' }, { has: '@tf/Mesh', include: false }] } });

const Update = createSystem({
    stage: 'update',
    fn: (delta) => {
        for (const [transform] of query) {
            Quat.rotateY(transform.data.rotation, MathUtils.degreesToRadians(90) * delta);
            Transform.updateMatrices(transform);
        }
    },
});

const run = async () => {
    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, createRenderPlugin({ canvas })])
        .registerSystems([Startup, Update])
        .run({ loop: false });
};

void run();
