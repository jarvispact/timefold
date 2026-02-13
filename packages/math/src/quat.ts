import { QuatAngleOrder, QuatType } from './types';

export const create = (...args: [number, number, number, number] | []): QuatType =>
    args.length === 4 ? [args[0], args[1], args[2], args[3]] : [0.0, 0.0, 0.0, 1.0];

let angleOrder: QuatAngleOrder = 'zyx';

export const getAngleOrder = () => angleOrder;

export const setAngleOrder = (order: QuatAngleOrder) => {
    angleOrder = order;
};

export const fromEuler = (
    out: QuatType,
    x: number,
    y: number,
    z: number,
    order: QuatAngleOrder = angleOrder,
): QuatType => {
    const halfToRad = Math.PI / 360.0;
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
            return out;
        case 'xzy':
            out[0] = sx * cy * cz - cx * sy * sz;
            out[1] = cx * sy * cz - sx * cy * sz;
            out[2] = cx * cy * sz + sx * sy * cz;
            out[3] = cx * cy * cz + sx * sy * sz;
            return out;
        case 'yxz':
            out[0] = sx * cy * cz + cx * sy * sz;
            out[1] = cx * sy * cz - sx * cy * sz;
            out[2] = cx * cy * sz - sx * sy * cz;
            out[3] = cx * cy * cz + sx * sy * sz;
            return out;
        case 'yzx':
            out[0] = sx * cy * cz + cx * sy * sz;
            out[1] = cx * sy * cz + sx * cy * sz;
            out[2] = cx * cy * sz - sx * sy * cz;
            out[3] = cx * cy * cz - sx * sy * sz;
            return out;
        case 'zxy':
            out[0] = sx * cy * cz - cx * sy * sz;
            out[1] = cx * sy * cz + sx * cy * sz;
            out[2] = cx * cy * sz + sx * sy * cz;
            out[3] = cx * cy * cz - sx * sy * sz;
            return out;
        case 'zyx':
            out[0] = sx * cy * cz - cx * sy * sz;
            out[1] = cx * sy * cz + sx * cy * sz;
            out[2] = cx * cy * sz - sx * sy * cz;
            out[3] = cx * cy * cz + sx * sy * sz;
            return out;
    }
};

export const rotationX = (out: QuatType, quat: QuatType, radians: number): QuatType => {
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
};

export const rotationY = (out: QuatType, quat: QuatType, radians: number): QuatType => {
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
};

export const rotationZ = (out: QuatType, quat: QuatType, radians: number): QuatType => {
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
};

export const multiply = (out: QuatType, a: QuatType, b: QuatType): QuatType => {
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
};

export const createFromEuler = (x: number, y: number, z: number, order: QuatAngleOrder = angleOrder) =>
    fromEuler(create(), x, y, z, order);
