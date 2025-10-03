import { EcsEvent, World } from '@timefold/ecs';
import {
    DataComponent,
    DirLightComponent,
    MeshComponent,
    OrthographicCameraComponent,
    PerspectiveCameraComponent,
    TransformComponent,
} from '../components/types';
import { EngineResources } from '../types';

// Bundles

export type CameraBundle = {
    data?: DataComponent<ArrayBufferLike>;
    transform: TransformComponent;
    camera: PerspectiveCameraComponent | OrthographicCameraComponent;
};

export type DirLightBundle = {
    data?: DataComponent<ArrayBufferLike>;
    dirLight: DirLightComponent;
};

export type MeshBundle = {
    transform: TransformComponent;
    mesh: MeshComponent;
};

// BundleWorld

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BundleWorld = World<any, EcsEvent<any[]>, EngineResources>;
