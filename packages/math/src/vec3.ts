import { Vec2Type, Vec3Type } from './types';

export const create = (x: number, y: number, z: number): Vec3Type => [x, y, z];
export const fromScalar = (scalar: number): Vec3Type => [scalar, scalar, scalar];
export const fromVec2 = (vec2: Vec2Type, z: number): Vec3Type => [vec2[0], vec2[1], z];

export const zero = (): Vec3Type => [0, 0, 0];
export const one = (): Vec3Type => [1, 1, 1];
export const left = (): Vec3Type => [-1, 0, 0];
export const right = (): Vec3Type => [1, 0, 0];
export const up = (): Vec3Type => [0, 1, 0];
export const down = (): Vec3Type => [0, -1, 0];
export const front = (): Vec3Type => [0, 0, 1];
export const back = (): Vec3Type => [0, 0, -1];

export const copy = (out: Vec3Type, vec3: Vec3Type): Vec3Type => {
    out[0] = vec3[0];
    out[1] = vec3[1];
    out[2] = vec3[2];
    return out;
};

export const createCopy = (vec3: Vec3Type): Vec3Type => {
    return copy(create(0, 0, 0), vec3);
};

export const set = (out: Vec3Type, x: number, y: number, z: number) => {
    out[0] = x;
    out[1] = y;
    out[2] = z;
};

export const addition = (out: Vec3Type, a: Vec3Type, b: Vec3Type) => {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

export const add = (out: Vec3Type, vec3: Vec3Type) => {
    return addition(out, out, vec3);
};

export const subtraction = (out: Vec3Type, a: Vec3Type, b: Vec3Type) => {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

export const subtract = (out: Vec3Type, vec3: Vec3Type) => {
    return subtraction(out, out, vec3);
};

export const multiplication = (out: Vec3Type, a: Vec3Type, b: Vec3Type) => {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

export const multiply = (out: Vec3Type, vec3: Vec3Type) => {
    return multiplication(out, out, vec3);
};

export const scaling = (out: Vec3Type, vec3: Vec3Type, factor: number) => {
    out[0] = vec3[0] * factor;
    out[1] = vec3[1] * factor;
    out[2] = vec3[2] * factor;
    return out;
};

export const scale = (out: Vec3Type, factor: number) => {
    return scaling(out, out, factor);
};

export const normalization = (out: Vec3Type, vec3: Vec3Type) => {
    const x = vec3[0];
    const y = vec3[1];
    const z = vec3[2];
    let len = x * x + y * y + z * z;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }
    out[0] = vec3[0] * len;
    out[1] = vec3[1] * len;
    out[2] = vec3[2] * len;
    return out;
};

export const normalize = (out: Vec3Type) => normalization(out, out);

export const dot = (a: Vec3Type, b: Vec3Type) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

export const linerInterpolation = (out: Vec3Type, a: Vec3Type, b: Vec3Type, t: number) => {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

export const lerp = (out: Vec3Type, vec3: Vec3Type, t: number) => linerInterpolation(out, out, vec3, t);
