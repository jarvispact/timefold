import { World } from '@timefold/ecs';
import { Transform, PerspectiveCamera, DirLight } from './components';

export type EngineComponent =
    | Transform.TransformComponent
    | PerspectiveCamera.PerspectiveCameraComponent
    | DirLight.DirLightComponent;

export type EngineWorld = World.World<EngineComponent>;
