import { createComponent, defineComponentTypes } from '@timefold/ecs';
import { EngineComponent, EngineComponentTypeNames } from '@timefold/engine';
import { Vec2Type, Vec3Type } from '@timefold/math';

export const { T } = defineComponentTypes([...EngineComponentTypeNames, 'Color']);

export const createPosition2D = (vec2: Vec2Type) => createComponent(T.Position2D, vec2);
export const createColor = (color: Vec3Type) => createComponent(T.Color, color);
export type ColorComponent = ReturnType<typeof createColor>;

export type WorldComponent = EngineComponent | ColorComponent;
