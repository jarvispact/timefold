import {
    CameraBundle,
    createWorld,
    DirLight,
    DirLightBundle,
    Mesh,
    PerspectiveCamera,
    Transform,
    UnlitMaterial,
    UpdateCameraFromTransformPlugin,
    DomUtils,
    Primitive,
    UnlitEntityBundle,
    PhongEntityBundle,
    PhongMaterial,
} from '@timefold/engine';
import { Vec3 } from '@timefold/math';
import { createSystem } from '@timefold/ecs';
import { ObjLoader } from '@timefold/obj';
import { createRenderPlugin } from './render-plugin';

// Current bundle setup is tied to a single entity with a single material
// A mesh can hold multiple primitives, each with their own material
// There is only one DataComponent for a entity which sets transform and material
//      splitting them could cause overhead in the render loop but is more flexible
//      keeping them combined would require additional logic in the engine
//      maybe we can sort the entities in a clever way to reduce the amount of uniform updates
// Primitives require a template to be set at init time of the renderer

// We could allow multi-material meshes only with the same material-template
// Probably does not make sense to allow a mesh to reference different shading models?

const main = async () => {
    const canvas = DomUtils.getCanvasById('canvas');

    const InterleavedLoader = ObjLoader.createLoader({ mode: 'interleaved-typed-array-indexed' });
    const NonInterleavedLoader = ObjLoader.createLoader({ mode: 'non-interleaved-typed-array-indexed' });

    const interleaved = await InterleavedLoader.load('./suzanne.obj');
    const nonInterleaved = await NonInterleavedLoader.load('./suzanne.obj');
    const suzanneInterleaved = interleaved.objects.Suzanne.primitives.default;
    const suzanneNonInterleaved = nonInterleaved.objects.Suzanne.primitives.default;

    const world = createWorld();

    // TODO: test multi-material object to see if the mesh/bundle stuff works

    // TODO: Give startup systems access to the world
    const Startup = createSystem({
        stage: 'startup',
        fn: () => {
            world.spawnBundle({
                id: 'camera',
                bundle: CameraBundle.createFromBuffer({
                    transform: Transform.createAndLookAt({ translation: Vec3.create(5, 5, 8), target: Vec3.zero() }),
                    camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
                }),
            });

            world.spawnBundle({
                id: 'light',
                bundle: DirLightBundle.createFromBuffer({
                    dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.create(-2, 5, 10)) }),
                }),
            });

            world.spawnBundle({
                id: 'unlit-interleaved',
                bundle: UnlitEntityBundle.create2({
                    transform: Transform.createFromTRS({ translation: Vec3.create(-2, 0, 2) }),
                    mesh: Mesh.create({
                        material: UnlitMaterial.create({ color: Vec3.create(1, 0, 0) }),
                        primitive: Primitive.fromObjPrimitive(suzanneInterleaved),
                    }),
                }),
            });

            world.spawnBundle({
                id: 'unlit-non-interleaved',
                bundle: UnlitEntityBundle.create2({
                    transform: Transform.createFromTRS({ translation: Vec3.create(-2, 0, -2) }),
                    mesh: Mesh.create({
                        material: UnlitMaterial.create({ color: Vec3.create(0, 0, 1) }),
                        primitive: Primitive.fromObjPrimitive(suzanneNonInterleaved),
                    }),
                }),
            });

            world.spawnBundle({
                id: 'phong-interleaved',
                bundle: PhongEntityBundle.create2({
                    transform: Transform.createFromTRS({ translation: Vec3.create(2, 0, -2) }),
                    mesh: Mesh.create({
                        material: PhongMaterial.create({ diffuseColor: Vec3.create(0, 1, 0) }),
                        primitive: Primitive.fromObjPrimitive(suzanneInterleaved),
                    }),
                }),
            });

            world.spawnBundle({
                id: 'phong-non-interleaved',
                bundle: PhongEntityBundle.create2({
                    transform: Transform.createFromTRS({ translation: Vec3.create(2, 0, 2) }),
                    mesh: Mesh.create({
                        material: PhongMaterial.create({ diffuseColor: Vec3.create(1, 1, 0) }),
                        primitive: Primitive.fromObjPrimitive(suzanneNonInterleaved),
                    }),
                }),
            });
        },
    });

    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, createRenderPlugin({ canvas })])
        .registerSystems(Startup)
        .run();
};

void main();
