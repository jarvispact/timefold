import { WorldBuilder } from '@timefold/ecs';
import { DirLight, DomUtils, EngineComponent, PerspectiveCamera, Transform } from '@timefold/engine';
import { Vec3 } from '@timefold/math';

const canvas = DomUtils.getCanvasById('canvas');
const aspect = canvas.width / canvas.height;

const world = WorldBuilder<EngineComponent>().compile();

const main = () => {
    const camera = world.createEntity();
    const light = world.createEntity();
    const cube = world.createEntity();

    world.spawn(camera, [
        Transform.createAndLookAt({ translation: Vec3.create(0, 3, 5), target: Vec3.zero() }),
        PerspectiveCamera.create({ aspect }),
    ]);

    const lightTransform = Transform.createAndLookAt({ translation: Vec3.create(0, 5, 5), target: Vec3.zero() });
    world.spawn(light, [
        lightTransform,
        DirLight.create({
            direction: Transform.extractForward(Vec3.create(), lightTransform.data),
            color: Vec3.create(1, 1, 1),
            intensity: 1,
        }),
    ]);

    world.spawn(cube, [Transform.create({ translation: Vec3.zero() })]);
};

main();
