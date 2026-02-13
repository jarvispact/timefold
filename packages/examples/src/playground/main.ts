import { QueryBuilder, WorldBuilder } from '@timefold/ecs';
import { DirLight, DomUtils, EngineComponent, PerspectiveCamera, Transform, T } from '@timefold/engine';
import { Quat, Vec3 } from '@timefold/math';
import { RenderPlugin } from './render-plugin';

const canvas = DomUtils.getCanvasById('canvas');
const aspect = canvas.width / canvas.height;

const Movable = QueryBuilder<EngineComponent>()
    .name('Movable')
    .with(T.Transform)
    .with(T.PhongMaterial, { include: false })
    .compile();

const world = WorldBuilder<EngineComponent>().withPlugins(RenderPlugin).withQueries(Movable).compile();

const main = () => {
    const camera = world.createEntity();
    const light = world.createEntity();
    const cube = world.createEntity();

    world.spawn(camera, [
        Transform.create({ translation: Vec3.create(0, 0, 5), rotation: Quat.createFromEuler(0, Math.PI, 0) }),
        PerspectiveCamera.create({ aspect }),
    ]);

    world.spawn(light, [
        Transform.create({ translation: Vec3.create(0, 5, 5) }),
        DirLight.create({
            direction: Vec3.normalize(Vec3.create(0, -5, -5)),
            color: Vec3.create(1, 1, 1),
            intensity: 1,
        }),
    ]);

    world.spawn(cube, [Transform.create({ translation: Vec3.zero() })]);
};

main();
