import { TypedArray } from './internal';

export type Type = [number] | TypedArray;

export const create = (value: number): Type => [value];

export const copy = (out: Type, scalar: Type): Type => {
    out[0] = scalar[0];
    return out;
};

export const createCopy = (scalar: Type): Type => {
    return copy(create(0), scalar);
};

export const addition = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] + b[0];
    return out;
};

export const add = (out: Type, scalar: Type) => {
    return addition(out, out, scalar);
};

export const subtraction = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] - b[0];
    return out;
};

export const subtract = (out: Type, scalar: Type) => {
    return subtraction(out, out, scalar);
};

export const multiplication = (out: Type, a: Type, b: Type) => {
    out[0] = a[0] * b[0];
    return out;
};

export const multiply = (out: Type, scalar: Type) => {
    return multiplication(out, out, scalar);
};

export const scaling = (out: Type, scalar: Type, factor: number) => {
    out[0] = scalar[0] * factor;
    return out;
};

export const scale = (out: Type, factor: number) => {
    return scaling(out, out, factor);
};
