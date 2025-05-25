import { createSystem } from '@timefold/ecs';
import {
    createWorld,
    CameraBundle,
    DirLight,
    DirLightBundle,
    DomUtils,
    Mesh,
    MeshBundle,
    PerspectiveCamera,
    InterleavedPrimitive,
    NonInterleavedPrimitive,
    Transform,
    UnlitMaterial,
    UpdateCameraFromTransformPlugin,
    EngineWorld,
} from '@timefold/engine';
import { Vec3 } from '@timefold/math';
import { ObjLoader } from '@timefold/obj';
import { createRenderPlugin } from './render-plugin';

const canvas = DomUtils.getCanvasById('canvas');

const Startup = createSystem({
    stage: 'startup',
    fn: async (world: EngineWorld) => {
        const Loader = ObjLoader.createLoader({ mode: 'non-interleaved-typed-array-indexed' });
        const { objects } = await ObjLoader.load('./webgpu-plane.obj');
        const nonInterleaved = await Loader.load('./webgpu-plane.obj');
        const planePrimitive = objects.Plane.primitives.default;
        const nonInterleavedPlanePrimitive = nonInterleaved.objects.Plane.primitives.default;

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(1.5, 1, 3), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'light',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.create(-2, 5, 10)) }),
            }),
        });

        const material = UnlitMaterial.create({ color: Vec3.create(1, 0, 0) });
        const material2 = UnlitMaterial.create({ color: Vec3.create(0, 1, 0) });
        const primitive = InterleavedPrimitive.fromObjPrimitive(planePrimitive);
        const primitive2 = NonInterleavedPrimitive.fromObjPrimitive(nonInterleavedPlanePrimitive);

        world.spawnBundle({
            id: 'unlit',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, -0.2, 0) }),
                mesh: Mesh.create({ material, primitive }),
            }),
        });

        world.spawnBundle({
            id: 'unlit2',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0.2, 0) }),
                mesh: Mesh.create({ material, primitive }),
            }),
        });

        world.spawnBundle({
            id: 'unlit3',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({ material: material2, primitive: primitive2 }),
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
