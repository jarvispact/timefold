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
    UnlitMaterial,
    UpdateCameraFromTransformPlugin,
    EngineWorld,
    createRenderPlugin,
} from '@timefold/engine';
import { Vec3 } from '@timefold/math';
import { ObjLoader } from '@timefold/obj';

const canvas = DomUtils.getCanvasById('canvas');

const Startup = createSystem({
    stage: 'startup',
    fn: async (world: EngineWorld) => {
        const { objects } = await ObjLoader.load('./webgpu-plane.obj');
        const planePrimitive = objects.Plane.primitives.default;

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(1.5, 1, 3), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'plane',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: UnlitMaterial.create({ color: Vec3.create(1, 0, 0) }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(planePrimitive),
                }),
            }),
        });
    },
});

const run = async () => {
    await createWorld()
        .registerPlugins([UpdateCameraFromTransformPlugin, createRenderPlugin({ canvas })])
        .registerSystems(Startup)
        .run();
};

void run();
