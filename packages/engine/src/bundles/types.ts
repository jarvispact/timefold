import { Component, EcsEvent, World } from '@timefold/ecs';
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

export type BundleWorld = World<Component, EcsEvent<Component[]>, EngineResources>;
