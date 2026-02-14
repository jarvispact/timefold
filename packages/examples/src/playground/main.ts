/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WorldBuilder } from '@timefold/ecs';
import { DirLight, DomUtils, EngineComponent, PerspectiveCamera, T, Transform } from '@timefold/engine';
import { Quat, Vec3 } from '@timefold/math';
import { createRenderer } from './renderer';

const canvas = DomUtils.getCanvasById('canvas');
const aspect = canvas.width / canvas.height;

const world = WorldBuilder<EngineComponent>().compile();

const main = () => {
    const camera = world.createEntity();
    const light = world.createEntity();
    const cube = world.createEntity();

    world.spawn(camera, [
        Transform.createAndLookAt({ translation: Vec3.create(-3, 4, 8), target: Vec3.zero() }),
        PerspectiveCamera.create({ aspect }),
    ]);

    const lightTransformComponent = Transform.createAndLookAt({
        translation: Vec3.create(0, 3, 3),
        target: Vec3.zero(),
    });
    world.spawn(light, [
        lightTransformComponent,
        DirLight.create({
            direction: Transform.extractForward(Vec3.create(), lightTransformComponent.data),
            color: Vec3.create(1, 1, 1),
            intensity: 1,
        }),
    ]);

    world.spawn(cube, [Transform.create({ translation: Vec3.zero() })]);

    // Extract component data for the renderer
    const cameraTransform = world.getComponent(camera, T.Transform)!.data;
    const cameraData = world.getComponent(camera, T.PerspectiveCamera)!.data;
    const lightData = world.getComponent(light, T.DirLight)!.data;
    const cubeTransform = world.getComponent(cube, T.Transform)!.data;

    const lightTransform = world.getComponent(light, T.Transform)!.data;

    const renderer = createRenderer(canvas, {
        cameraTransform,
        cameraData,
        lightData,
        lightTransform,
        cubeTransform,
    });

    // Rotate cube each frame
    let lastTime = 0;
    const rotationSpeed = 0.8; // radians per second

    const update = (time: number) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        if (dt > 0 && dt < 0.5) {
            Quat.rotationY(cubeTransform.rotation, cubeTransform.rotation, rotationSpeed * dt);
        }

        requestAnimationFrame(update);
    };

    renderer.start();
    requestAnimationFrame(update);
};

main();
