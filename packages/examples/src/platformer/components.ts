import { createComponent, defineComponentTypes } from '@timefold/ecs';
import { Vec2Type } from '@timefold/math';

export const T = defineComponentTypes(['Position', 'Velocity', 'InputMapping', 'Shape']);

export const Shape = { Box: 0, Circle: 1 } as const;

export type BoxShape = {
    type: typeof Shape.Box;
    halfExtends: Vec2Type;
};

export type CircleShape = {
    type: typeof Shape.Circle;
    radius: number;
};

export type Shape = BoxShape | CircleShape;

export const createPosition = (vec2: Vec2Type) => createComponent(T.Position, vec2);
export const createVelocity = (vec2: Vec2Type) => createComponent(T.Velocity, vec2);
export const createInputMapping = (mapping: Record<string, string>) => createComponent(T.InputMapping, mapping);
export const createShape = (shape: Shape) => createComponent(T.Shape, shape);

export type PositionComponent = ReturnType<typeof createPosition>;
export type VelocityComponent = ReturnType<typeof createVelocity>;
export type InputMappingComponent = ReturnType<typeof createInputMapping>;
export type ShapeComponent = ReturnType<typeof createShape>;
export type WorldComponent = PositionComponent | VelocityComponent | InputMappingComponent | ShapeComponent;
