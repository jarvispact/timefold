import { ScalarType } from './types';

export function create(value: number): ScalarType {
    return [value];
}

export function set(out: ScalarType, value: number): ScalarType {
    out[0] = value;
    return out;
}

export function copy(out: ScalarType, scalar: ScalarType): ScalarType {
    out[0] = scalar[0];
    return out;
}

// [INLINE]
export function createCopy(scalar: ScalarType): ScalarType {
    return copy(create(0), scalar);
}

export function addition(out: ScalarType, a: ScalarType, b: ScalarType) {
    out[0] = a[0] + b[0];
    return out;
}

// [INLINE]
export function add(out: ScalarType, scalar: ScalarType) {
    return addition(out, out, scalar);
}

export function subtraction(out: ScalarType, a: ScalarType, b: ScalarType) {
    out[0] = a[0] - b[0];
    return out;
}

// [INLINE]
export function subtract(out: ScalarType, scalar: ScalarType) {
    return subtraction(out, out, scalar);
}

export function multiplication(out: ScalarType, a: ScalarType, b: ScalarType) {
    out[0] = a[0] * b[0];
    return out;
}

// [INLINE]
export function multiply(out: ScalarType, scalar: ScalarType) {
    return multiplication(out, out, scalar);
}

export function scaling(out: ScalarType, scalar: ScalarType, factor: number) {
    out[0] = scalar[0] * factor;
    return out;
}

// [INLINE]
export function scale(out: ScalarType, factor: number) {
    return scaling(out, out, factor);
}
