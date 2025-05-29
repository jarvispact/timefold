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
    UnlitMaterial,
} from '@timefold/engine';
import { MathUtils, Quat, Vec3 } from '@timefold/math';
import { MtlLoader, ObjLoader } from '@timefold/obj';

const canvas = DomUtils.getCanvasById('canvas');

const Startup = createSystem({
    stage: 'startup',
    fn: async (world: EngineWorld) => {
        const [{ objects }, { materials }] = await Promise.all([
            ObjLoader.load('./multi-material-test.obj'),
            MtlLoader.load('./multi-material-test.mtl'),
        ]);

        const multiMaterialPlanePrimitives = objects.Plane.primitives;
        const customPlanePrimitive = objects['Plane.001'].primitives.Custom;
        const pbrPlanePrimitive = objects['Plane.002'].primitives.Pbr;
        const phongPlanePrimitive = objects['Plane.003'].primitives.Phong;
        const unlitPlanePrimitive = objects['Plane.004'].primitives.Unlit;

        world.spawnBundle({
            id: 'light1',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({
                    direction: Vec3.normalize(Vec3.negate(Vec3.create(0, 5, -10))),
                    intensity: 1,
                }),
            }),
        });

        // world.spawnBundle({
        //     id: 'light2',
        //     bundle: DirLightBundle.create({
        //         dirLight: DirLight.create({
        //             direction: Vec3.normalize(Vec3.negate(Vec3.create(0, 5, 10))),
        //             intensity: 0.5,
        //         }),
        //     }),
        // });

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(0, 5, 10), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'multimaterialPlane',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create(
                    Object.keys(multiMaterialPlanePrimitives).map((key, idx) => {
                        return {
                            material:
                                idx === 0 || idx === 2
                                    ? UnlitMaterial.create({ color: materials[key].diffuseColor })
                                    : PhongMaterial.create({ diffuseColor: materials[key].diffuseColor }),
                            primitive: InterleavedPrimitive.fromObjPrimitive(multiMaterialPlanePrimitives[key]),
                        };
                    }),
                ),
            }),
        });

        world.spawnBundle({
            id: 'customPlanePrimitive',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({ diffuseColor: materials.Custom.diffuseColor }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(customPlanePrimitive),
                }),
            }),
        });

        world.spawnBundle({
            id: 'pbrPlanePrimitive',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({ diffuseColor: materials.Pbr.diffuseColor }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(pbrPlanePrimitive),
                }),
            }),
        });

        world.spawnBundle({
            id: 'phongPlanePrimitive',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({ diffuseColor: materials.Phong.diffuseColor }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(phongPlanePrimitive),
                }),
            }),
        });

        world.spawnBundle({
            id: 'unlitPlanePrimitive',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: UnlitMaterial.create({ color: materials.Unlit.diffuseColor }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(unlitPlanePrimitive),
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
