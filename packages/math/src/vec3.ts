import { Vec2Type, Vec3Type } from './types';

export const create = (): Vec3Type => [0.0, 0.0, 0.0];
export const fromScalar = (scalar: number): Vec3Type => [scalar, scalar, scalar];
export const fromVec2 = (vec2: Vec2Type, z: number): Vec3Type => [vec2[0], vec2[1], z];

export const zero = (): Vec3Type => [0.0, 0.0, 0.0];
export const one = (): Vec3Type => [1.0, 1.0, 1.0];
export const left = (): Vec3Type => [-1.0, 0.0, 0.0];
export const right = (): Vec3Type => [1.0, 0.0, 0.0];
export const up = (): Vec3Type => [0.0, 1.0, 0.0];
export const down = (): Vec3Type => [0.0, -1.0, 0.0];
export const front = (): Vec3Type => [0.0, 0.0, 1.0];
export const back = (): Vec3Type => [0.0, 0.0, -1.0];
