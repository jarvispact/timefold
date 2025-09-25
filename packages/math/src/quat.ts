import { QuatAngleOrder, QuatType } from './types';
import { EPSILON } from './utils';

export const angleOrder: QuatAngleOrder = 'zyx';

export function create(x: number, y: number, z: number, w: number): QuatType {
    return [x, y, z, w];
}

export function createIdentity(): QuatType {
    return [0, 0, 0, 1];
}

export function copy(out: QuatType, quat: QuatType): QuatType {
    out[0] = quat[0];
    out[1] = quat[1];
    out[2] = quat[2];
    out[3] = quat[3];
    return out;
}

// [INLINE]
export function createCopy(quat: QuatType): QuatType {
    return copy(create(0, 0, 0, 1), quat);
}

export function set(out: QuatType, x: number, y: number, z: number, w: number) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
}

export function fromEuler(out: QuatType, x: number, y: number, z: number, order: QuatAngleOrder = angleOrder) {
    const halfToRad = Math.PI / 360;
    x *= halfToRad;
    z *= halfToRad;
    y *= halfToRad;

    const sx = Math.sin(x);
    const cx = Math.cos(x);
    const sy = Math.sin(y);
    const cy = Math.cos(y);
    const sz = Math.sin(z);
    const cz = Math.cos(z);

    switch (order) {
        case 'xyz':
            out[0] = sx * cy * cz + cx * sy * sz;
            out[1] = cx * sy * cz - sx * cy * sz;
            out[2] = cx * cy * sz + sx * sy * cz;
            out[3] = cx * cy * cz - sx * sy * sz;
            break;
        case 'xzy':
            out[0] = sx * cy * cz - cx * sy * sz;
            out[1] = cx * sy * cz - sx * cy * sz;
            out[2] = cx * cy * sz + sx * sy * cz;
            out[3] = cx * cy * cz + sx * sy * sz;
            break;
        case 'yxz':
            out[0] = sx * cy * cz + cx * sy * sz;
            out[1] = cx * sy * cz - sx * cy * sz;
            out[2] = cx * cy * sz - sx * sy * cz;
            out[3] = cx * cy * cz + sx * sy * sz;
            break;
        case 'yzx':
            out[0] = sx * cy * cz + cx * sy * sz;
            out[1] = cx * sy * cz + sx * cy * sz;
            out[2] = cx * cy * sz - sx * sy * cz;
            out[3] = cx * cy * cz - sx * sy * sz;
            break;
        case 'zxy':
            out[0] = sx * cy * cz - cx * sy * sz;
            out[1] = cx * sy * cz + sx * cy * sz;
            out[2] = cx * cy * sz + sx * sy * cz;
            out[3] = cx * cy * cz - sx * sy * sz;
            break;
        case 'zyx':
            out[0] = sx * cy * cz - cx * sy * sz;
            out[1] = cx * sy * cz + sx * cy * sz;
            out[2] = cx * cy * sz - sx * sy * cz;
            out[3] = cx * cy * cz + sx * sy * sz;
            break;
        default:
            console.error(`Unknown angle order ${order}`);
    }

    return out;
}

// [INLINE]
export function createFromEuler(x: number, y: number, z: number, order: QuatAngleOrder = angleOrder) {
    return fromEuler(createIdentity(), x, y, z, order);
}

export function rotationX(out: QuatType, quat: QuatType, radians: number) {
    radians *= 0.5;

    const ax = quat[0],
        ay = quat[1],
        az = quat[2],
        aw = quat[3];

    const bx = Math.sin(radians),
        bw = Math.cos(radians);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;

    return out;
}

// [INLINE]
export function rotateX(out: QuatType, radians: number) {
    return rotationX(out, out, radians);
}

export function rotationY(out: QuatType, quat: QuatType, radians: number) {
    radians *= 0.5;

    const ax = quat[0],
        ay = quat[1],
        az = quat[2],
        aw = quat[3];

    const by = Math.sin(radians),
        bw = Math.cos(radians);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;

    return out;
}

// [INLINE]
export function rotateY(out: QuatType, radians: number) {
    return rotationY(out, out, radians);
}

export function rotationZ(out: QuatType, quat: QuatType, radians: number) {
    radians *= 0.5;

    const ax = quat[0],
        ay = quat[1],
        az = quat[2],
        aw = quat[3];

    const bz = Math.sin(radians),
        bw = Math.cos(radians);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;

    return out;
}

// [INLINE]
export function rotateZ(out: QuatType, radians: number) {
    return rotationZ(out, out, radians);
}

export function multiplication(out: QuatType, a: QuatType, b: QuatType) {
    const ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];

    const bx = b[0],
        by = b[1],
        bz = b[2],
        bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;

    return out;
}

// [INLINE]
export function multiply(out: QuatType, quat: QuatType) {
    return multiplication(out, out, quat);
}

export function linearInterpolation(out: QuatType, a: QuatType, b: QuatType, t: number) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
}

// [INLINE]
export function lerp(out: QuatType, quat: QuatType, t: number) {
    return linearInterpolation(out, out, quat, t);
}

export function sphericalLinearInterpolation(out: QuatType, a: QuatType, b: QuatType, t: number) {
    const ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    let bx = b[0],
        by = b[1],
        bz = b[2],
        bw = b[3];

    let omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }
    // calculate coefficients
    if (1.0 - cosom > EPSILON) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;

    return out;
}

// [INLINE]
export function slerp(out: QuatType, quat: QuatType, t: number) {
    return sphericalLinearInterpolation(out, out, quat, t);
}
