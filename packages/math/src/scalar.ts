import { ScalarType } from './types';

export const create = (value: number): ScalarType => [value];

export const set = (out: ScalarType, value: number): ScalarType => {
    out[0] = value;
    return out;
};

export const copy = (out: ScalarType, scalar: ScalarType): ScalarType => {
    out[0] = scalar[0];
    return out;
};

export const createCopy = (scalar: ScalarType): ScalarType => {
    return copy(create(0), scalar);
};

export const addition = (out: ScalarType, a: ScalarType, b: ScalarType) => {
    out[0] = a[0] + b[0];
    return out;
};

export const add = (out: ScalarType, scalar: ScalarType) => {
    return addition(out, out, scalar);
};

export const subtraction = (out: ScalarType, a: ScalarType, b: ScalarType) => {
    out[0] = a[0] - b[0];
    return out;
};

export const subtract = (out: ScalarType, scalar: ScalarType) => {
    return subtraction(out, out, scalar);
};

export const multiplication = (out: ScalarType, a: ScalarType, b: ScalarType) => {
    out[0] = a[0] * b[0];
    return out;
};

export const multiply = (out: ScalarType, scalar: ScalarType) => {
    return multiplication(out, out, scalar);
};

export const scaling = (out: ScalarType, scalar: ScalarType, factor: number) => {
    out[0] = scalar[0] * factor;
    return out;
};

export const scale = (out: ScalarType, factor: number) => {
    return scaling(out, out, factor);
};
