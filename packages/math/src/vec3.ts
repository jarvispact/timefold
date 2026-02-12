import { Vec3Type } from './types';

export const create = (): Vec3Type => [0, 0, 0];

export const add = (out: Vec3Type, a: Vec3Type, b: Vec3Type): Vec3Type => {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};
