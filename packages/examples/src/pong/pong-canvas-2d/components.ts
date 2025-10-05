import { createComponent, defineComponentTypes } from '@timefold/ecs';
import { Vec2Type } from '@timefold/math';

export const T = defineComponentTypes(['Position', 'Velocity', 'Shape', 'Player', 'Ball', 'Color']);

export const createPosition = (pos: Vec2Type) => createComponent(T.Position, pos);
export type PositionComponent = ReturnType<typeof createPosition>;

export const createVelocity = (pos: Vec2Type) => createComponent(T.Velocity, pos);
export type VelocityComponent = ReturnType<typeof createVelocity>;

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

export const createShape = (shape: Shape) => createComponent(T.Shape, shape);
export type ShapeComponent = ReturnType<typeof createShape>;

export const createPlayerTag = () => createComponent(T.Player);
export type PlayerTag = ReturnType<typeof createPlayerTag>;

export const createBallTag = () => createComponent(T.Ball);
export type BallTag = ReturnType<typeof createBallTag>;

export const createColor = (color: string) => createComponent(T.Color, color);
export type ColorComponent = ReturnType<typeof createColor>;

export type WorldComponent =
    | PositionComponent
    | VelocityComponent
    | ShapeComponent
    | PlayerTag
    | BallTag
    | ColorComponent;
