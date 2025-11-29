import { Component, createComponent } from '@timefold/ecs';
import { EngineComponentType, RenderableComponent, RenderableData } from './types';

export const type = EngineComponentType.Renderable;

export function is(component: Component): component is RenderableComponent {
    return component.type === type;
}

export function create(data: RenderableData = { layer: 0 }): RenderableComponent {
    return createComponent(type, data);
}
