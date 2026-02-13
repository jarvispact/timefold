import { Vec2Type, Vec3Type } from './types';

export const create = (...args: [number, number, number] | []): Vec3Type =>
    args.length === 3 ? [args[0], args[1], args[2]] : [0.0, 0.0, 0.0];

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

export const normalization = (out: Vec3Type, a: Vec3Type): Vec3Type => {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    let len = x * x + y * y + z * z;

    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }

    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
    return out;
};

export const normalize = (vec: Vec3Type): Vec3Type => normalization(vec, vec);
