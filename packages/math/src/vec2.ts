import { Vec2Type } from './types';

export const create = (...args: [number, number] | []): Vec2Type =>
    args.length === 2 ? [args[0], args[1]] : [0.0, 0.0];

export const fromScalar = (scalar: number): Vec2Type => [scalar, scalar];

export const zero = (): Vec2Type => [0.0, 0.0];
export const one = (): Vec2Type => [1.0, 1.0];
export const left = (): Vec2Type => [-1.0, 0.0];
export const right = (): Vec2Type => [1.0, 0.0];
export const up = (): Vec2Type => [0.0, 1.0];
export const down = (): Vec2Type => [0.0, -1.0];
