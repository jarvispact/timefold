import { worldBuilder } from '@timefold/ecs';
import { Data, EngineComponent, Transform } from '@timefold/engine';
import { Quat, Vec3 } from '@timefold/math';

const world = worldBuilder<EngineComponent>().compile();

const spawnSimpleEntity = () => {
    const entity = world.createEntity();
    world.spawn(entity, [Transform.create({ position: Vec3.create(), rotation: Quat.create(), scale: Vec3.create() })]);
};

const spawnBufferBackedEntity = () => {
    const entity = world.createEntity();

    // position: 3 floats, rotation: 4 floats, scale: 3 floats
    const bufferSize = 3 * 4 + 4 * 4 + 3 * 4;
    const data = new ArrayBuffer(bufferSize);

    const rotationOffset = 3 * 4;
    const scaleOffset = rotationOffset + 4 * 4;

    const position = new Float32Array(data, 0, 3);
    const rotation = new Float32Array(data, rotationOffset, 4);
    const scale = new Float32Array(data, scaleOffset, 3);

    position.set([0, 0, 0]);
    rotation.set([0, 0, 0, 1]);
    scale.set([1, 1, 1]);

    world.spawn(entity, [Data.create(data), Transform.create({ position, rotation, scale })]);
};

spawnSimpleEntity();
spawnBufferBackedEntity();
