import { Component, worldBuilder } from '@timefold/ecs';

const T = {
    Position: 0,
    Rotation: 1,
    Scale: 2,
    Renderable: 3,
    Data: 4,
} as const;

type T = typeof T;

type Vec3 = [number, number, number] | Float32Array;
type Quat = [number, number, number, number] | Float32Array;

type PositionComponent = Component<T['Position'], Vec3>;
type RotationComponent = Component<T['Rotation'], Quat>;
type ScaleComponent = Component<T['Scale'], Vec3>;
type RenderableComponent = Component<T['Renderable']>;
type DataComponent = Component<T['Data'], ArrayBufferLike>;

type WorldComponent = PositionComponent | RotationComponent | ScaleComponent | RenderableComponent | DataComponent;

const world = worldBuilder<WorldComponent>().compile();

const spawnSimpleEntity = () => {
    const entity = world.createEntity();
    world.spawn(entity, [
        { type: T.Position, data: [0, 0, 0] },
        { type: T.Rotation, data: [0, 0, 0, 1] },
        { type: T.Scale, data: [1, 1, 1] },
        { type: T.Renderable },
    ]);
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

    world.spawn(entity, [
        { type: T.Position, data: position },
        { type: T.Rotation, data: rotation },
        { type: T.Scale, data: scale },
        { type: T.Data, data: data },
    ]);
};

spawnSimpleEntity();
spawnBufferBackedEntity();
