import { createSystem } from '@timefold/ecs';
import {
    createWorld,
    CameraBundle,
    DomUtils,
    Mesh,
    MeshBundle,
    PerspectiveCamera,
    Transform,
    UpdateCameraFromTransformPlugin,
    EngineWorld,
    createRenderPlugin,
    DirLightBundle,
    DirLight,
    PhongMaterial,
    InterleavedPrimitive,
} from '@timefold/engine';
import { MathUtils, Quat, Vec3 } from '@timefold/math';
import { MtlLoader, ObjLoader } from '@timefold/obj';

const canvas = DomUtils.getCanvasById('canvas');

const Startup = createSystem({
    stage: 'startup',
    fn: async (world: EngineWorld) => {
        const [cubeSpikesObj, cubeSpikesMtl, cubeBricksObj, cubeBricksMtl, treeObj, treeMtl] = await Promise.all([
            ObjLoader.load('./kenney-platformer-kit/Cube_Spikes.obj'),
            MtlLoader.load('./kenney-platformer-kit/Cube_Spikes.mtl'),
            ObjLoader.load('./kenney-platformer-kit/Cube_Bricks.obj'),
            MtlLoader.load('./kenney-platformer-kit/Cube_Bricks.mtl'),
            ObjLoader.load('./kenney-platformer-kit/Tree.obj'),
            MtlLoader.load('./kenney-platformer-kit/Tree.mtl'),
        ]);

        const cubeSpikesPrimitives = cubeSpikesObj.objects['Cube_Spikes_Cube.060'].primitives;
        const cubeBricksPrimitives = cubeBricksObj.objects['Cube_Bricks_Cube.042'].primitives;
        const treePrimitives = treeObj.objects['Tree_Cube.118'].primitives;

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
                transform: Transform.createAndLookAt({ translation: Vec3.create(0, 10, 25), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height, near: 0.1, far: 30 }),
            }),
        });

        world.spawnBundle({
            id: 'cube-spikes',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create(
                    Object.keys(cubeSpikesPrimitives).map((key) => {
                        return {
                            material: PhongMaterial.create({ diffuseColor: cubeSpikesMtl.materials[key].diffuseColor }),
                            primitive: InterleavedPrimitive.fromObjPrimitive(
                                cubeSpikesPrimitives[key],
                                cubeSpikesObj.info,
                            ),
                        };
                    }),
                ),
            }),
        });

        world.spawnBundle({
            id: 'cube-bricks1',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(2, 0, 5) }),
                mesh: Mesh.create(
                    Object.keys(cubeBricksPrimitives).map((key) => {
                        return {
                            material: PhongMaterial.create({ diffuseColor: cubeBricksMtl.materials[key].diffuseColor }),
                            primitive: InterleavedPrimitive.fromObjPrimitive(
                                cubeBricksPrimitives[key],
                                cubeBricksObj.info,
                            ),
                        };
                    }),
                ),
            }),
        });

        world.spawnBundle({
            id: 'cube-bricks2',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(-2, 0, 5) }),
                mesh: Mesh.create(
                    Object.keys(cubeBricksPrimitives).map((key) => {
                        return {
                            material: PhongMaterial.create({ diffuseColor: cubeBricksMtl.materials[key].diffuseColor }),
                            primitive: InterleavedPrimitive.fromObjPrimitive(
                                cubeBricksPrimitives[key],
                                cubeBricksObj.info,
                            ),
                        };
                    }),
                ),
            }),
        });

        world.spawnBundle({
            id: 'tree1',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(-5, 0, 0) }),
                mesh: Mesh.create(
                    Object.keys(treePrimitives).map((key) => {
                        return {
                            material: PhongMaterial.create({ diffuseColor: treeMtl.materials[key].diffuseColor }),
                            primitive: InterleavedPrimitive.fromObjPrimitive(treePrimitives[key], treeObj.info),
                        };
                    }),
                ),
            }),
        });

        world.spawnBundle({
            id: 'tree2',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(5, 0, 0) }),
                mesh: Mesh.create(
                    Object.keys(treePrimitives).map((key) => {
                        return {
                            material: PhongMaterial.create({ diffuseColor: treeMtl.materials[key].diffuseColor }),
                            primitive: InterleavedPrimitive.fromObjPrimitive(treePrimitives[key], treeObj.info),
                        };
                    }),
                ),
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
        .run();
};

void run();
