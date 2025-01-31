import { EcsEvent, World } from '@timefold/ecs';
import {
    DataComponent,
    DirLightComponent,
    PerspectiveCameraComponent,
    PhongMaterialComponent,
    TransformComponent,
} from '../components/types';
import { EngineResources } from '../types';

// Bundles

export type CameraBundle = {
    transform: TransformComponent;
    camera: PerspectiveCameraComponent;
};

export type DirLightBundle = {
    dirLight: DirLightComponent;
};

export type PhongEntityBundle = {
    data?: DataComponent<ArrayBufferLike>;
    transform: TransformComponent;
    material: PhongMaterialComponent;
};

// BundleWorld

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BundleWorld = World<any, EcsEvent<any[]>, EngineResources>;
