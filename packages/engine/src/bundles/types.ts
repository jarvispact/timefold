import { EcsEvent, World } from '@timefold/ecs';
import {
    DataComponent,
    DirLightComponent,
    OrthographicCameraComponent,
    PerspectiveCameraComponent,
    PhongMaterialComponent,
    TransformComponent,
    UnlitMaterialComponent,
} from '../components/types';
import { EngineResources } from '../types';

// Bundles

export type CameraBundle = {
    transform: TransformComponent;
    camera: PerspectiveCameraComponent | OrthographicCameraComponent;
};

export type DirLightBundle = {
    dirLight: DirLightComponent;
};

export type UnlitEntityBundle = {
    data?: DataComponent<ArrayBufferLike>;
    transform: TransformComponent;
    material: UnlitMaterialComponent;
};

export type PhongEntityBundle = {
    data?: DataComponent<ArrayBufferLike>;
    transform: TransformComponent;
    material: PhongMaterialComponent;
};

// BundleWorld

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BundleWorld = World<any, EcsEvent<any[]>, EngineResources>;
