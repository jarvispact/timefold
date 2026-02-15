import { Mat4Type, QuatType, Vec2Type, Vec3ArrayType, Vec3Type } from './types';

export const create = (...args: Vec3ArrayType | []): Vec3Type =>
    args.length === 3 ? [args[0], args[1], args[2]] : [0.0, 0.0, 0.0];

export const fromScalar = (scalar: number): Vec3Type => [scalar, scalar, scalar];
export const fromVec2 = (vec2: Vec2Type, z: number): Vec3Type => [vec2[0], vec2[1], z];

export const zero = (): Vec3Type => [0.0, 0.0, 0.0];
export const one = (): Vec3Type => [1.0, 1.0, 1.0];
export const left = (): Vec3Type => [-1.0, 0.0, 0.0];
export const right = (): Vec3Type => [1.0, 0.0, 0.0];
export const up = (): Vec3Type => [0.0, 1.0, 0.0];
export const down = (): Vec3Type => [0.0, -1.0, 0.0];
export const forward = (): Vec3Type => [0.0, 0.0, -1.0];
export const backward = (): Vec3Type => [0.0, 0.0, 1.0];

export const set = (out: Vec3Type, x: number, y: number, z: number) => {
    out[0] = x;
    out[1] = y;
    out[2] = z;
};

export const copy = (out: Vec3Type, vec3: Vec3Type): Vec3Type => {
    out[0] = vec3[0];
    out[1] = vec3[1];
    out[2] = vec3[2];
    return out;
};

export const createCopy = (vec3: Vec3Type): Vec3Type => copy(create(0, 0, 0), vec3);

export const addition = (out: Vec3Type, a: Vec3Type, b: Vec3Type) => {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

export const add = (out: Vec3Type, vec3: Vec3Type) => addition(out, out, vec3);

export const subtraction = (out: Vec3Type, a: Vec3Type, b: Vec3Type) => {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

export const subtract = (out: Vec3Type, vec3: Vec3Type) => subtraction(out, out, vec3);

export const multiplication = (out: Vec3Type, a: Vec3Type, b: Vec3Type) => {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

export const multiply = (out: Vec3Type, vec3: Vec3Type) => multiplication(out, out, vec3);

export const scaling = (out: Vec3Type, vec3: Vec3Type, factor: number) => {
    out[0] = vec3[0] * factor;
    out[1] = vec3[1] * factor;
    out[2] = vec3[2] * factor;
    return out;
};

export const scale = (out: Vec3Type, factor: number) => scaling(out, out, factor);

export const crossProduct = (out: Vec3Type, a: Vec3Type, b: Vec3Type): Vec3Type => {
    const ax = a[0],
        ay = a[1],
        az = a[2];
    const bx = b[0],
        by = b[1],
        bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

export const cross = (out: Vec3Type, vec3: Vec3Type) => crossProduct(out, out, vec3);

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

export const length = (a: Vec3Type): number => {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    return Math.sqrt(x * x + y * y + z * z);
};

export const transformQuat = (out: Vec3Type, a: Vec3Type, q: QuatType): Vec3Type => {
    // Fast Vector Rotation using Quaternions by Robert Eisele
    // https://raw.org/proof/vector-rotation-using-quaternions/

    const qx = q[0],
        qy = q[1],
        qz = q[2],
        qw = q[3];

    const vx = a[0],
        vy = a[1],
        vz = a[2];

    // t = q x v
    let tx = qy * vz - qz * vy;
    let ty = qz * vx - qx * vz;
    let tz = qx * vy - qy * vx;

    // t = 2t
    tx = tx + tx;
    ty = ty + ty;
    tz = tz + tz;

    // v + w t + q x t
    out[0] = vx + qw * tx + qy * tz - qz * ty;
    out[1] = vy + qw * ty + qz * tx - qx * tz;
    out[2] = vz + qw * tz + qx * ty - qy * tx;

    return out;
};

export const transformMat4 = (out: Vec3Type, a: Vec3Type, m: Mat4Type): Vec3Type => {
    const x = a[0],
        y = a[1],
        z = a[2];

    let w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1.0;

    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;

    return out;
};
