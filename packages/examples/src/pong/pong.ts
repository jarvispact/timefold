import { createSystem } from '@timefold/ecs';
import {
    CameraBundle,
    createSimpleUnlitRenderPlugin,
    createWorld,
    EngineComponent,
    EngineEvent,
    ImageLoader,
    OrthographicCamera,
    Transform,
    UnlitEntityBundle,
    UnlitMaterial,
    UpdateCameraFromTransformPlugin,
} from '@timefold/engine';
import { Gltf2Loader, Gltf2Utils } from '@timefold/gltf2';
import { Vec3 } from '@timefold/math';

const world = createWorld<EngineComponent, EngineEvent>();

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const main = async () => {
    const [circleTexture, gltf2Result] = await Promise.all([
        ImageLoader.loadImage('./pong/circle.png'),
        Gltf2Loader.load('./pong/pong-optimized.glb'),
    ]);

    const primitiveLayout = gltf2Result.primitiveLayouts[0];
    const primitive = gltf2Result.primitives[0];
    const camera = gltf2Result.cameras[0];

    const walls = gltf2Result.meshes.filter((m) => m.name.startsWith('Wall'));
    const player1 = gltf2Result.meshes.find((m) => m.name === 'Player1');
    const player2 = gltf2Result.meshes.find((m) => m.name === 'Player2');
    const ball = gltf2Result.meshes.find((m) => m.name === 'Ball');

    console.log({ walls, player1, player2, ball });

    if (
        !Gltf2Utils.isInterleavedPrimitive(primitive) ||
        !Gltf2Utils.isOrthographicCamera(camera) ||
        !Gltf2Utils.primitiveLayoutHasRequiredAttribs(primitiveLayout, ['TEXCOORD_0']) ||
        Gltf2Utils.primitiveIsNonInterleaved(primitive) ||
        !Gltf2Utils.primitiveHasIndices(primitive) ||
        !player1 ||
        !player2 ||
        !ball
    ) {
        throw new Error('Provided glb file did not meet the requirements');
    }

    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        const aspect = canvas.width / canvas.height;
        const cameraComponent = world.getComponent('camera', '@tf/OrthographicCamera');
        if (cameraComponent) {
            OrthographicCamera.updateFromGltf2(cameraComponent, camera, aspect);
        }
    });

    const StartupSystem = createSystem({
        stage: 'startup',
        fn: () => {
            world.spawnBundle({
                id: 'camera',
                bundle: CameraBundle.create({
                    transform: Transform.createAndLookAt({ translation: camera.translation, target: Vec3.zero() }),
                    camera: OrthographicCamera.createFromGltf2({ camera, aspect: canvas.width / canvas.height }),
                }),
            });

            walls.forEach((mesh) => {
                world.spawnBundle({
                    id: mesh.name,
                    bundle: UnlitEntityBundle.create({
                        transform: Transform.createFromTRS(mesh),
                        material: UnlitMaterial.create({ color: Vec3.one() }),
                    }),
                });
            });

            world.spawnBundle({
                id: player1.name,
                bundle: UnlitEntityBundle.create({
                    transform: Transform.createFromTRS(player1),
                    material: UnlitMaterial.create({ color: Vec3.one() }),
                }),
            });

            world.spawnBundle({
                id: player2.name,
                bundle: UnlitEntityBundle.create({
                    transform: Transform.createFromTRS(player2),
                    material: UnlitMaterial.create({ color: Vec3.one() }),
                }),
            });

            world.spawnBundle({
                id: ball.name,
                bundle: UnlitEntityBundle.create({
                    transform: Transform.createFromTRS(ball),
                    material: UnlitMaterial.create({ colorMap: circleTexture }),
                }),
            });
        },
    });

    const RenderPlugin = createSimpleUnlitRenderPlugin({ canvas, primitiveLayout, primitive });
    world.registerPlugins([RenderPlugin, UpdateCameraFromTransformPlugin]).registerSystems(StartupSystem);
    await world.run();
};

void main();
