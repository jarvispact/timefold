import {
    Component,
    createComponent,
    defineComponents,
    InferComponents,
    InferSchemaType,
    number,
    struct,
} from '@timefold/ecs';
import { quat, vec3 } from '../math-schemas';

const TransformSchema = struct('Transform', {
    translation: vec3,
    rotation: quat,
    scale: vec3,
});

const PhongMaterialSchema = struct('PhongMaterial', {
    ambientColor: vec3,
    diffuseColor: vec3,
    specularColor: vec3,
    shininess: number,
    opacity: number,
});

const PerspectiveCameraSchema = struct('PerspectiveCamera', {
    aspect: number,
    fovy: number,
    near: number,
    far: number,
});

const DirLightSchema = struct('DirLight', {
    direction: vec3,
    color: vec3,
    intensity: number,
});

export const engineComponents = defineComponents({
    Transform: TransformSchema,
    PhongMaterial: PhongMaterialSchema,
    PerspectiveCamera: PerspectiveCameraSchema,
    DirLight: DirLightSchema,
});

export type TransformData = InferSchemaType<typeof TransformSchema>;
export type TransformComponent = Component<'Transform', TransformData>;

export type PhongMaterialData = InferSchemaType<typeof PhongMaterialSchema>;
export type PhongMaterialComponent = Component<'PhongMaterial', PhongMaterialData>;

export type PerspectiveCameraData = InferSchemaType<typeof PerspectiveCameraSchema>;
export type PerspectiveCameraComponent = Component<'PerspectiveCamera', PerspectiveCameraData>;

export type DirLightData = InferSchemaType<typeof DirLightSchema>;
export type DirLightComponent = Component<'DirLight', DirLightData>;

export type EngineComponent = InferComponents<typeof engineComponents>;

export { createComponent };
