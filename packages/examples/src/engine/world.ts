import { World, EngineComponent, Structs } from '@timefold/engine';

type WorldComponent = EngineComponent | { type: 'Rotation'; data: number };

export const world = World.create<WorldComponent>({
    sceneData: Structs.Scene.create({ mode: 'shared-array-buffer' }),
});

export type World = typeof world;
