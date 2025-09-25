import { Vec2Type, Vec3Type } from './types';

export function create(x: number, y: number, z: number): Vec3Type {
    return [x, y, z];
}

export function fromScalar(scalar: number): Vec3Type {
    return [scalar, scalar, scalar];
}

export function fromVec2(vec2: Vec2Type, z: number): Vec3Type {
    return [vec2[0], vec2[1], z];
}

export function zero(): Vec3Type {
    return [0, 0, 0];
}

export function one(): Vec3Type {
    return [1, 1, 1];
}

export function left(): Vec3Type {
    return [-1, 0, 0];
}

export function right(): Vec3Type {
    return [1, 0, 0];
}

export function up(): Vec3Type {
    return [0, 1, 0];
}

export function down(): Vec3Type {
    return [0, -1, 0];
}

export function front(): Vec3Type {
    return [0, 0, 1];
}

export function back(): Vec3Type {
    return [0, 0, -1];
}

export function copy(out: Vec3Type, vec3: Vec3Type): Vec3Type {
    out[0] = vec3[0];
    out[1] = vec3[1];
    out[2] = vec3[2];
    return out;
}

// [INLINE]
export function createCopy(vec3: Vec3Type): Vec3Type {
    return copy(create(0, 0, 0), vec3);
}

export function set(out: Vec3Type, x: number, y: number, z: number) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
}

export function addition(out: Vec3Type, a: Vec3Type, b: Vec3Type) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
}

// [INLINE]
export function add(out: Vec3Type, vec3: Vec3Type) {
    return addition(out, out, vec3);
}

export function subtraction(out: Vec3Type, a: Vec3Type, b: Vec3Type) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
}

// [INLINE]
export function subtract(out: Vec3Type, vec3: Vec3Type) {
    return subtraction(out, out, vec3);
}

export function multiplication(out: Vec3Type, a: Vec3Type, b: Vec3Type) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
}

// [INLINE]
export function multiply(out: Vec3Type, vec3: Vec3Type) {
    return multiplication(out, out, vec3);
}

export function scaling(out: Vec3Type, vec3: Vec3Type, factor: number) {
    out[0] = vec3[0] * factor;
    out[1] = vec3[1] * factor;
    out[2] = vec3[2] * factor;
    return out;
}

// [INLINE]
export function scale(out: Vec3Type, factor: number) {
    return scaling(out, out, factor);
}

export function scalingAndAddition(out: Vec3Type, a: Vec3Type, b: Vec3Type, scale: number) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    return out;
}

// [INLINE]
export function scaleAndAdd(out: Vec3Type, vec3: Vec3Type, scale: number) {
    return scalingAndAddition(out, out, vec3, scale);
}

export function normalization(out: Vec3Type, vec3: Vec3Type) {
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
}

// [INLINE]
export function normalize(out: Vec3Type) {
    return normalization(out, out);
}

export function dot(a: Vec3Type, b: Vec3Type) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function linerInterpolation(out: Vec3Type, a: Vec3Type, b: Vec3Type, t: number) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
}

// [INLINE]
export function lerp(out: Vec3Type, vec3: Vec3Type, t: number) {
    return linerInterpolation(out, out, vec3, t);
}

export function inverse(out: Vec3Type, vec3: Vec3Type) {
    out[0] = vec3[0] === 0 ? 0 : 1.0 / vec3[0];
    out[1] = vec3[1] === 0 ? 0 : 1.0 / vec3[1];
    out[2] = vec3[2] === 0 ? 0 : 1.0 / vec3[2];
    return out;
}

// [INLINE]
export function invert(out: Vec3Type) {
    return inverse(out, out);
}

export function negation(out: Vec3Type, vec3: Vec3Type) {
    out[0] = vec3[0] === 0 ? 0 : -vec3[0];
    out[1] = vec3[1] === 0 ? 0 : -vec3[1];
    out[2] = vec3[2] === 0 ? 0 : -vec3[2];
    return out;
}

// [INLINE]
export function negate(out: Vec3Type) {
    return negation(out, out);
}
