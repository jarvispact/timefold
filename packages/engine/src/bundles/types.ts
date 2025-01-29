import { Component, World, Event } from '@timefold/ecs';
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

export type BundleWorld = World.World<Component.Type, Event.EcsEvent<Component.Type[]>, EngineResources>;
