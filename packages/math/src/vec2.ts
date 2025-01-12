import { TypedArray } from './internal';

export type Type = [number, number] | TypedArray;

export const create = (x: number, y: number): Type => [x, y];
export const fromScalar = (scalar: number): Type => [scalar, scalar];

export const copy = (out: Type, vec2: Type): Type => {
    out[0] = vec2[0];
    out[1] = vec2[1];
    return out;
};

export const createCopy = (vec2: Type): Type => {
    return copy(create(0, 0), vec2);
};

export const addition = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

export const add = (out: Type, vec2: Type) => {
    return addition(out, out, vec2);
};

export const subtraction = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

export const subtract = (out: Type, vec2: Type) => {
    return subtraction(out, out, vec2);
};

export const multiplication = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

export const multiply = (out: Type, vec2: Type) => {
    return multiplication(out, out, vec2);
};

export const scaling = (out: Type, vec2: Type, factor: number) => {
    out[0] = vec2[0] * factor;
    out[1] = vec2[1] * factor;
    return out;
};

export const scale = (out: Type, factor: number) => {
    return scaling(out, out, factor);
};

export const normalization = (out: Type, vec2: Type) => {
    const x = vec2[0],
        y = vec2[1];

    let len = x * x + y * y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }

    out[0] = vec2[0] * len;
    out[1] = vec2[1] * len;

    return out;
};

export const normalize = (out: Type) => {
    return normalization(out, out);
};

export const createNormalized = (x: number, y: number) => {
    return normalize(create(x, y));
};

export const linearInterpolation = (out: Type, a: Type, b: Type, t: number) => {
    const ax = a[0],
        ay = a[1];

    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);

    return out;
};

export const lerp = (out: Type, vec2: Type, t: number) => {
    return linearInterpolation(out, out, vec2, t);
};

export const rotation = (out: Type, a: Type, b: Type, rad: number) => {
    //Translate point to the origin
    const p0 = a[0] - b[0],
        p1 = a[1] - b[1],
        sinC = Math.sin(rad),
        cosC = Math.cos(rad);

    //perform rotation and translate to correct position
    out[0] = p0 * cosC - p1 * sinC + b[0];
    out[1] = p0 * sinC + p1 * cosC + b[1];

    return out;
};

export const rotate = (out: Type, vec2: Type, rad: number) => {
    return rotation(out, out, vec2, rad);
};
