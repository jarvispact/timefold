import { Vec2Type } from './types';

export function create(x: number, y: number): Vec2Type {
    return [x, y];
}

export function fromScalar(scalar: number): Vec2Type {
    return [scalar, scalar];
}

export function zero(): Vec2Type {
    return [0, 0];
}

export function one(): Vec2Type {
    return [1, 1];
}

export function left(): Vec2Type {
    return [-1, 0];
}

export function right(): Vec2Type {
    return [1, 0];
}

export function up(): Vec2Type {
    return [0, 1];
}

export function down(): Vec2Type {
    return [0, -1];
}

export function copy(out: Vec2Type, vec2: Vec2Type): Vec2Type {
    out[0] = vec2[0];
    out[1] = vec2[1];
    return out;
}

// [INLINE]
export function createCopy(vec2: Vec2Type): Vec2Type {
    return copy(create(0, 0), vec2);
}

export function set(out: Vec2Type, x: number, y: number): Vec2Type {
    out[0] = x;
    out[1] = y;
    return out;
}

export function addition(out: Vec2Type, a: Vec2Type, b: Vec2Type, dt = 1) {
    out[0] = a[0] + b[0] * dt;
    out[1] = a[1] + b[1] * dt;
    return out;
}

// [INLINE]
export function add(out: Vec2Type, vec2: Vec2Type, dt = 1) {
    return addition(out, out, vec2, dt);
}

export function subtraction(out: Vec2Type, a: Vec2Type, b: Vec2Type) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
}

// [INLINE]
export function subtract(out: Vec2Type, vec2: Vec2Type) {
    return subtraction(out, out, vec2);
}

export function multiplication(out: Vec2Type, a: Vec2Type, b: Vec2Type) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
}

// [INLINE]
export function multiply(out: Vec2Type, vec2: Vec2Type) {
    return multiplication(out, out, vec2);
}

export function scaling(out: Vec2Type, vec2: Vec2Type, factor: number) {
    out[0] = vec2[0] * factor;
    out[1] = vec2[1] * factor;
    return out;
}

// [INLINE]
export function scale(out: Vec2Type, factor: number) {
    return scaling(out, out, factor);
}

export function normalization(out: Vec2Type, vec2: Vec2Type) {
    const x = vec2[0],
        y = vec2[1];

    let len = x * x + y * y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
    }

    out[0] = vec2[0] * len;
    out[1] = vec2[1] * len;

    return out;
}

// [INLINE]
export function normalize(out: Vec2Type) {
    return normalization(out, out);
}

// [INLINE]
export function createNormalized(x: number, y: number) {
    return normalize(create(x, y));
}

export function linearInterpolation(out: Vec2Type, a: Vec2Type, b: Vec2Type, t: number) {
    const ax = a[0],
        ay = a[1];

    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);

    return out;
}

// [INLINE]
export function lerp(out: Vec2Type, vec2: Vec2Type, t: number) {
    return linearInterpolation(out, out, vec2, t);
}

export function rotation(out: Vec2Type, a: Vec2Type, b: Vec2Type, rad: number) {
    //Translate point to the origin
    const p0 = a[0] - b[0],
        p1 = a[1] - b[1],
        sinC = Math.sin(rad),
        cosC = Math.cos(rad);

    //perform rotation and translate to correct position
    out[0] = p0 * cosC - p1 * sinC + b[0];
    out[1] = p0 * sinC + p1 * cosC + b[1];

    return out;
}

// [INLINE]
export function rotate(out: Vec2Type, vec2: Vec2Type, rad: number) {
    return rotation(out, out, vec2, rad);
}
