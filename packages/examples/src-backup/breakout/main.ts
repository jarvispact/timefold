import { createSystem } from '@timefold/ecs';
import {
    CameraBundle,
    ImageLoader,
    OrthographicCamera,
    Transform,
    UnlitEntityBundle,
    UnlitMaterial,
    UpdateCameraFromTransformPlugin,
} from '@timefold/engine';
import { canvas, world } from './constants';
import { Empty, getColorForBrick, level11 } from './level-data';
import { createRenderPlugin } from './render-plugin';

const main = async () => {
    const [circleImageBitmap, brickImageBitmap] = await Promise.all([
        ImageLoader.loadImage('./breakout/circle.png'),
        ImageLoader.loadImage('./breakout/brick.png'),
    ]);

    const Startup = createSystem({
        stage: 'startup',
        fn: () => {
            const brickWidth = 2;
            const brickHeight = 0.5;
            const brickPadding = 0.2;
            let x = 0;
            let y = 0;

            let minX = x;
            let minY = y;
            let maxX = x;
            let maxY = y;

            for (let i = 0; i < level11.data.length; i++) {
                const brick = level11.data[i];

                if (brick !== Empty) {
                    world.spawnBundle({
                        id: `Brick-${i}`,
                        bundle: UnlitEntityBundle.create({
                            transform: Transform.createFromTRS({
                                translation: [x, y, 0],
                                scale: [brickWidth, brickHeight, 1],
                            }),
                            material: UnlitMaterial.create({
                                color: getColorForBrick(brick),
                                colorMap: brickImageBitmap,
                                useColorMapAlpha: true,
                            }),
                        }),
                    });
                }

                x += brickWidth * 2 + brickPadding;
                if ((i + 1) % level11.bricksPerRow === 0) {
                    x = 0;
                    y -= brickHeight * 2 + brickPadding;
                }

                if (x <= minX) {
                    minX = x;
                }

                if (x >= maxX) {
                    maxX = x;
                }

                if (y <= minY) {
                    minY = y;
                }

                if (y >= maxY) {
                    maxY = y;
                }
            }

            console.log({ minX, maxX, minY, maxY });

            const centerX = maxX / 2;
            const centerY = minY / 2;
            const playerY = centerY - 25;
            const ballY = playerY + 2;

            const aspect = canvas.width / canvas.height;

            world.spawnBundle({
                id: 'Camera',
                bundle: CameraBundle.createFromBuffer({
                    transform: Transform.createFromTRS({ translation: [20, -15, 1] }),
                    camera: OrthographicCamera.create({
                        left: -30 * aspect,
                        right: 30 * aspect,
                        bottom: -30,
                        top: 30,
                        near: 0.1,
                        far: 2,
                    }),
                }),
            });

            world.spawnBundle({
                id: 'Player',
                bundle: UnlitEntityBundle.create({
                    transform: Transform.createFromTRS({
                        translation: [centerX, playerY, 0],
                        scale: [4, 0.5, 1],
                    }),
                    material: UnlitMaterial.create({ colorMap: brickImageBitmap, useColorMapAlpha: true }),
                }),
            });

            world.spawnBundle({
                id: 'Ball',
                bundle: UnlitEntityBundle.create({
                    transform: Transform.createFromTRS({
                        translation: [centerX, ballY, 0],
                        scale: [0.5, 0.5, 1],
                    }),
                    material: UnlitMaterial.create({ colorMap: circleImageBitmap, useColorMapAlpha: true }),
                }),
            });
        },
    });

    world.registerPlugins([UpdateCameraFromTransformPlugin, createRenderPlugin(canvas)]).registerSystems(Startup);

    await world.run();
};

void main();
