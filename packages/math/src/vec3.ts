import { TypedArray } from './internal';
import * as Vec2 from './vec2';

export type Type = [number, number, number] | TypedArray;

export const create = (x: number, y: number, z: number): Type => [x, y, z];
export const fromScalar = (scalar: number): Type => [scalar, scalar, scalar];
export const fromVec2 = (vec2: Vec2.Type, z: number): Type => [vec2[0], vec2[1], z];

export const zero = (): Type => [0, 0, 0];
export const one = (): Type => [1, 1, 1];
export const left = (): Type => [-1, 0, 0];
export const right = (): Type => [1, 0, 0];
export const up = (): Type => [0, 1, 0];
export const down = (): Type => [0, -1, 0];
export const front = (): Type => [0, 0, 1];
export const back = (): Type => [0, 0, -1];

export const copy = (out: Type, vec3: Type): Type => {
    out[0] = vec3[0];
    out[1] = vec3[1];
    out[2] = vec3[2];
    return out;
};

export const createCopy = (vec3: Type): Type => {
    return copy(create(0, 0, 0), vec3);
};

export const set = (out: Type, x: number, y: number, z: number) => {
    out[0] = x;
    out[1] = y;
    out[2] = z;
};

export const addition = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

export const add = (out: Type, vec3: Type) => {
    return addition(out, out, vec3);
};

export const subtraction = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

export const subtract = (out: Type, vec3: Type) => {
    return subtraction(out, out, vec3);
};

export const multiplication = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

export const multiply = (out: Type, vec3: Type) => {
    return multiplication(out, out, vec3);
};

export const scaling = (out: Type, vec3: Type, factor: number) => {
    out[0] = vec3[0] * factor;
    out[1] = vec3[1] * factor;
    out[2] = vec3[2] * factor;
    return out;
};

export const scale = (out: Type, factor: number) => {
    return scaling(out, out, factor);
};

export const normalization = (out: Type, vec3: Type) => {
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

export const normalize = (out: Type) => normalization(out, out);

export const dot = (a: Type, b: Type) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

export const linerInterpolation = (out: Type, a: Type, b: Type, t: number) => {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

export const lerp = (out: Type, vec3: Type, t: number) => linerInterpolation(out, out, vec3, t);
