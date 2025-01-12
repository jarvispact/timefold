import { World as EcsWorld } from '@timefold/ecs';
import { Transform, PerspectiveCamera, DirLight, PhongMaterial } from '@timefold/engine';

// TODO: there is a error when inferring the world type from the result of World.create()
// This is not a issue when
// the file does not export this variable OR
// when we set: `declaration: false` in tsconfig
// See also: https://github.com/microsoft/TypeScript/issues/30355

type WorldComponent =
    | Transform.TransformComponent
    | PerspectiveCamera.PerspectiveCameraComponent
    | DirLight.DirLightComponent
    | PhongMaterial.PhongComponent;

export type World = EcsWorld.World<WorldComponent>;
export const world: World = EcsWorld.create<WorldComponent>();
