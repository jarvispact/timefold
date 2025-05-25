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
    MeshBundle,
    PrimitiveComponent,
} from '@timefold/engine';
import { Mat4x4, Vec3 } from '@timefold/math';
import { createSystem } from '@timefold/ecs';
import { MtlLoader, ObjLoader } from '@timefold/obj';
import { createRenderPlugin } from './render-plugin';

const main = async () => {
    const canvas = DomUtils.getCanvasById('canvas');
    const RenderPlugin = createRenderPlugin({ canvas });

    const InterleavedLoader = ObjLoader.createLoader({ mode: 'interleaved-typed-array-indexed' });
    const NonInterleavedLoader = ObjLoader.createLoader({ mode: 'non-interleaved-typed-array-indexed' });

    const [mtlResult, interleavedResult, nonInterleavedResult] = await Promise.all([
        MtlLoader.load('./multi-material-test.mtl'),
        InterleavedLoader.load('./multi-material-test.obj'),
        NonInterleavedLoader.load('./multi-material-test.obj'),
    ]);

    console.log({ mtlResult, interleavedResult, nonInterleavedResult });

    const interleavedPrimitives = Object.keys(interleavedResult.objects.Plane.primitives).reduce<
        Record<string, PrimitiveComponent>
    >((accum, key) => {
        accum[key] = Primitive.fromObjPrimitive(interleavedResult.objects.Plane.primitives[key]);
        return accum;
    }, {});

    const nonInterleavedPrimitives = Object.keys(nonInterleavedResult.objects.Plane.primitives).reduce<
        Record<string, PrimitiveComponent>
    >((accum, key) => {
        accum[key] = Primitive.fromObjPrimitive(nonInterleavedResult.objects.Plane.primitives[key]);
        return accum;
    }, {});

    console.log({ interleavedPrimitives, nonInterleavedPrimitives });

    const world = createWorld();

    const Startup = createSystem({
        stage: 'startup',
        fn: () => {
            world.spawnBundle({
                id: 'camera',
                bundle: CameraBundle.createFromBuffer({
                    transform: Transform.createAndLookAt({ translation: Vec3.create(5, 20, 45), target: Vec3.zero() }),
                    camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
                }),
            });

            world.spawnBundle({
                id: 'light',
                bundle: DirLightBundle.createFromBuffer({
                    dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.create(-2, 5, 10)) }),
                }),
            });

            const randomColor = () => Vec3.create(Math.random(), Math.random(), Math.random());

            const gridSize = { x: 20, z: 20 };
            const padding = 1.1;

            for (let x = 0; x < gridSize.x; x++) {
                for (let z = 0; z < gridSize.z; z++) {
                    const xPos = (x - gridSize.x / 2) * (1 + padding);
                    const zPos = (z - gridSize.z / 2) * (1 + padding);

                    // world.spawnBundle({
                    //     id: `entity-${x}-${z}`,
                    //     bundle: MeshBundle.create({
                    //         transform: Transform.createFromTRS({ translation: Vec3.create(xPos, 0, zPos) }),
                    //         mesh: Mesh.create(
                    //             Object.values(interleavedResult.objects.Plane.primitives).map((primitive) => {
                    //                 return {
                    //                     material: UnlitMaterial.create({
                    //                         color: randomColor(),
                    //                     }),
                    //                     primitive: Primitive.fromObjPrimitive(primitive),
                    //                 };
                    //             }),
                    //         ),
                    //     }),
                    // });

                    world.spawnBundle({
                        id: `entity-${x}-${z}`,
                        bundle: MeshBundle.create({
                            transform: Transform.createFromTRS({ translation: Vec3.create(xPos, 0, zPos) }),
                            mesh: Mesh.create({
                                material: UnlitMaterial.create({
                                    color: randomColor(),
                                }),
                                primitive: Primitive.fromObjPrimitive(
                                    interleavedResult.objects['Plane.001'].primitives.Custom,
                                ),
                            }),
                        }),
                    });
                }
            }
        },
    });

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

    const Update = createSystem({
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

    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin])
        .registerSystems([Startup, Update])
        .run();
};

void main();
