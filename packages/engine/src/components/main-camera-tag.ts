import { Component, createComponent } from '@timefold/ecs';
import { EngineComponentType, MainCameraTagComponent } from './types';

export const type = EngineComponentType.MainCameraTag;

export function is(component: Component): component is MainCameraTagComponent {
    return component.type === type;
}

export function create(): MainCameraTagComponent {
    return createComponent(type);
}
