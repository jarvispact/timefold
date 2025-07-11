console.log('hi');
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    CameraBundle,
    createRenderPlugin,
    createWorld,
    DirLight,
    DirLightBundle,
    DomUtils,
    Mesh,
    MeshBundle,
    MeshPart,
    NonInterleavedPrimitive,
    PerspectiveCamera,
    PhongMaterial,
    Transform,
    UpdateCameraFromTransformPlugin,
} from '@timefold/engine';
import { createSystem } from '@timefold/ecs';
import { MathUtils, Vec3 } from '@timefold/math';
import { Gltf2Loader } from '@timefold/gltf2';

const world = createWorld();
const canvas = DomUtils.getCanvasById('canvas');
const RenderPlugin = createRenderPlugin({ canvas, msaa: 4, enableDepthPrePass: false });

const Startup = createSystem({
    stage: 'startup',
    fn: async () => {
        const Loader = Gltf2Loader.createLoader({
            parserOptions: {
                resolveBufferUrl: (uri) => `./perf/${uri}`,
                resolveImageUrl: (uri) => `./perf/${uri}`,
            },
        });

        const result = await Loader.load('./perf/Sponza.glb');
        console.log(result);

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({
                    translation: Vec3.create(0, 5, 5),
                    target: Vec3.create(0, 4, 0),
                }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'sun',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.negate(Vec3.create(0, 400, 500))) }),
            }),
        });

        const mesh = Mesh.create(
            result.meshes[0].primitives
                .map(({ primitive, material }): MeshPart | undefined => {
                    if (material === undefined) return undefined;

                    const p = result.primitives[primitive];
                    const m = result.materials[material];
                    if (m.type !== 'pbr-metallic-roughness') return undefined;

                    const layout = result.primitiveLayouts[p.primitiveLayout];
                    if (layout.type !== 'non-interleaved' || p.type !== 'non-interleaved') return undefined;

                    return {
                        material: PhongMaterial.create({ diffuseColor: Vec3.create(0.42, 0.42, 0.42) }),
                        primitive: NonInterleavedPrimitive.create({
                            attributes: {
                                position: {
                                    format: layout.attributes.POSITION.format,
                                    data: p.attributes.POSITION,
                                },
                                uv: {
                                    format: layout.attributes.TEXCOORD_0!.format,
                                    data: p.attributes.TEXCOORD_0!,
                                },
                                normal: {
                                    format: layout.attributes.NORMAL!.format,
                                    data: p.attributes.NORMAL!,
                                },
                                tanget: {
                                    format: layout.attributes.TANGENT!.format,
                                    data: p.attributes.TANGENT!,
                                },
                            },
                            indices: p.indices ? p.indices.data : undefined,
                            primitive: { cullMode: 'none', topology: 'triangle-list' },
                        }),
                    };
                })
                .filter((part): part is MeshPart => Boolean(part)),
        );

        world.spawnBundle({
            id: Math.random().toString(),
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS(result.meshes[0]),
                mesh,
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
            Transform.rotateY(transform, MathUtils.degreesToRadians(10) * delta);
        }
    },
});

const main = async () => {
    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin])
        .registerSystems([Startup, RotationSystem])
        .run({ loop: true, printFps: true });
};

void main();
