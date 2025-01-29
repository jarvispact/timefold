import { Mat4x4Type, QuatType, Vec3Type } from './types';
import { EPSILON } from './utils';
import { one as vec3One } from './vec3';

export const create = (): Mat4x4Type => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export const copy = (out: Mat4x4Type, mat4x4: Mat4x4Type): Mat4x4Type => {
    out[0] = mat4x4[0];
    out[1] = mat4x4[1];
    out[2] = mat4x4[2];
    out[3] = mat4x4[3];
    out[4] = mat4x4[4];
    out[5] = mat4x4[5];
    out[6] = mat4x4[6];
    out[7] = mat4x4[7];
    out[8] = mat4x4[8];
    out[9] = mat4x4[9];
    out[10] = mat4x4[10];
    out[11] = mat4x4[11];
    out[12] = mat4x4[12];
    out[13] = mat4x4[13];
    out[14] = mat4x4[14];
    out[15] = mat4x4[15];
    return out;
};

export const createCopy = (mat4x4: Mat4x4Type): Mat4x4Type => {
    return copy(create(), mat4x4);
};

export const identity = (out: Mat4x4Type) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

export const transpose = (out: Mat4x4Type, mat4x4: Mat4x4Type) => {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === mat4x4) {
        const a01 = mat4x4[1],
            a02 = mat4x4[2],
            a03 = mat4x4[3];
        const a12 = mat4x4[6],
            a13 = mat4x4[7];
        const a23 = mat4x4[11];

        out[1] = mat4x4[4];
        out[2] = mat4x4[8];
        out[3] = mat4x4[12];
        out[4] = a01;
        out[6] = mat4x4[9];
        out[7] = mat4x4[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = mat4x4[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = mat4x4[0];
        out[1] = mat4x4[4];
        out[2] = mat4x4[8];
        out[3] = mat4x4[12];
        out[4] = mat4x4[1];
        out[5] = mat4x4[5];
        out[6] = mat4x4[9];
        out[7] = mat4x4[13];
        out[8] = mat4x4[2];
        out[9] = mat4x4[6];
        out[10] = mat4x4[10];
        out[11] = mat4x4[14];
        out[12] = mat4x4[3];
        out[13] = mat4x4[7];
        out[14] = mat4x4[11];
        out[15] = mat4x4[15];
    }

    return out;
};

export const transposed = (out: Mat4x4Type) => transpose(out, out);

export const invert = (out: Mat4x4Type, mat4x4: Mat4x4Type) => {
    const a00 = mat4x4[0],
        a01 = mat4x4[1],
        a02 = mat4x4[2],
        a03 = mat4x4[3];
    const a10 = mat4x4[4],
        a11 = mat4x4[5],
        a12 = mat4x4[6],
        a13 = mat4x4[7];
    const a20 = mat4x4[8],
        a21 = mat4x4[9],
        a22 = mat4x4[10],
        a23 = mat4x4[11];
    const a30 = mat4x4[12],
        a31 = mat4x4[13],
        a32 = mat4x4[14],
        a33 = mat4x4[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return identity(out);
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

export const inverted = (out: Mat4x4Type) => invert(out, out);

export const multiplication = (out: Mat4x4Type, a: Mat4x4Type, b: Mat4x4Type) => {
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];

    // Cache only the current line of the second matrix
    let b0 = b[0],
        b1 = b[1],
        b2 = b[2],
        b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
};

export const multiply = (out: Mat4x4Type, mat4x4: Mat4x4Type) => multiplication(out, out, mat4x4);

export const fromRotationTranslationScale = (out: Mat4x4Type, q: QuatType, v: Vec3Type, s: Vec3Type) => {
    // Quaternion math
    const x = q[0],
        y = q[1],
        z = q[2],
        w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const sx = s[0];
    const sy = s[1];
    const sz = s[2];

    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;

    return out;
};

export const createFromRotationTranslationScale = (q: QuatType, v: Vec3Type, s: Vec3Type) =>
    fromRotationTranslationScale(create(), q, v, s);

export const fromRotationTranslationScaleOrigin = (
    out: Mat4x4Type,
    q: QuatType,
    v: Vec3Type,
    s: Vec3Type,
    o: Vec3Type,
) => {
    // Quaternion math
    const x = q[0],
        y = q[1],
        z = q[2],
        w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    const sx = s[0];
    const sy = s[1];
    const sz = s[2];

    const ox = o[0];
    const oy = o[1];
    const oz = o[2];

    const out0 = (1 - (yy + zz)) * sx;
    const out1 = (xy + wz) * sx;
    const out2 = (xz - wy) * sx;
    const out4 = (xy - wz) * sy;
    const out5 = (1 - (xx + zz)) * sy;
    const out6 = (yz + wx) * sy;
    const out8 = (xz + wy) * sz;
    const out9 = (yz - wx) * sz;
    const out10 = (1 - (xx + yy)) * sz;

    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = 0;
    out[4] = out4;
    out[5] = out5;
    out[6] = out6;
    out[7] = 0;
    out[8] = out8;
    out[9] = out9;
    out[10] = out10;
    out[11] = 0;
    out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
    out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
    out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
    out[15] = 1;

    return out;
};

export const createFromRotationTranslationScaleOrigin = (q: QuatType, v: Vec3Type, s: Vec3Type, o: Vec3Type) =>
    fromRotationTranslationScaleOrigin(create(), q, v, s, o);

export const perspective = (out: Mat4x4Type, fovy: number, aspect: number, near: number, far?: number) => {
    const f = 1.0 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
        const nf = 1 / (near - far);
        out[10] = far * nf;
        out[14] = far * near * nf;
    } else {
        out[10] = -1;
        out[14] = -near;
    }
    return out;
};

export const createPerspective = (fovy: number, aspect: number, near: number, far?: number) =>
    perspective(create(), fovy, aspect, near, far);

export const ortho = (
    out: Mat4x4Type,
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
) => {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return out;
};

export const createOrtho = (left: number, right: number, bottom: number, top: number, near: number, far: number) =>
    ortho(create(), left, right, bottom, top, near, far);

export const lookAt = (out: Mat4x4Type, eye: Vec3Type, center: Vec3Type, up: Vec3Type) => {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    const centerx = center[0];
    const centery = center[1];
    const centerz = center[2];

    if (
        Math.abs(eyex - centerx) < EPSILON &&
        Math.abs(eyey - centery) < EPSILON &&
        Math.abs(eyez - centerz) < EPSILON
    ) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

export const createLookAt = (eye: Vec3Type, center: Vec3Type, up: Vec3Type) => lookAt(create(), eye, center, up);

export const targetTo = (out: Mat4x4Type, eye: Vec3Type, target: Vec3Type, up: Vec3Type) => {
    const eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2];

    let z0 = eyex - target[0],
        z1 = eyey - target[1],
        z2 = eyez - target[2];

    let len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        z0 *= len;
        z1 *= len;
        z2 *= len;
    }

    let x0 = upy * z2 - upz * z1,
        x1 = upz * z0 - upx * z2,
        x2 = upx * z1 - upy * z0;

    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eyex;
    out[13] = eyey;
    out[14] = eyez;
    out[15] = 1;
    return out;
};

export const createTargetTo = (eye: Vec3Type, target: Vec3Type, up: Vec3Type) => targetTo(create(), eye, target, up);

export const rotationX = (out: Mat4x4Type, mat4x4: Mat4x4Type, rad: number) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a10 = mat4x4[4];
    const a11 = mat4x4[5];
    const a12 = mat4x4[6];
    const a13 = mat4x4[7];
    const a20 = mat4x4[8];
    const a21 = mat4x4[9];
    const a22 = mat4x4[10];
    const a23 = mat4x4[11];

    if (mat4x4 !== out) {
        // If the source and destination differ, copy the unchanged rows
        out[0] = mat4x4[0];
        out[1] = mat4x4[1];
        out[2] = mat4x4[2];
        out[3] = mat4x4[3];
        out[12] = mat4x4[12];
        out[13] = mat4x4[13];
        out[14] = mat4x4[14];
        out[15] = mat4x4[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

export const rotateX = (out: Mat4x4Type, rad: number) => rotationX(out, out, rad);

export const rotationY = (out: Mat4x4Type, mat4x4: Mat4x4Type, rad: number) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = mat4x4[0];
    const a01 = mat4x4[1];
    const a02 = mat4x4[2];
    const a03 = mat4x4[3];
    const a20 = mat4x4[8];
    const a21 = mat4x4[9];
    const a22 = mat4x4[10];
    const a23 = mat4x4[11];

    if (mat4x4 !== out) {
        // If the source and destination differ, copy the unchanged rows
        out[4] = mat4x4[4];
        out[5] = mat4x4[5];
        out[6] = mat4x4[6];
        out[7] = mat4x4[7];
        out[12] = mat4x4[12];
        out[13] = mat4x4[13];
        out[14] = mat4x4[14];
        out[15] = mat4x4[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

export const rotateY = (out: Mat4x4Type, rad: number) => rotationY(out, out, rad);

export const rotationZ = (out: Mat4x4Type, mat4x4: Mat4x4Type, rad: number) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = mat4x4[0];
    const a01 = mat4x4[1];
    const a02 = mat4x4[2];
    const a03 = mat4x4[3];
    const a10 = mat4x4[4];
    const a11 = mat4x4[5];
    const a12 = mat4x4[6];
    const a13 = mat4x4[7];

    if (mat4x4 !== out) {
        // If the source and destination differ, copy the unchanged last row
        out[8] = mat4x4[8];
        out[9] = mat4x4[9];
        out[10] = mat4x4[10];
        out[11] = mat4x4[11];
        out[12] = mat4x4[12];
        out[13] = mat4x4[13];
        out[14] = mat4x4[14];
        out[15] = mat4x4[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

export const rotateZ = (out: Mat4x4Type, rad: number) => rotationZ(out, out, rad);

export function extractScale(out: Vec3Type, mat4x4: Mat4x4Type) {
    const m11 = mat4x4[0];
    const m12 = mat4x4[1];
    const m13 = mat4x4[2];
    const m21 = mat4x4[4];
    const m22 = mat4x4[5];
    const m23 = mat4x4[6];
    const m31 = mat4x4[8];
    const m32 = mat4x4[9];
    const m33 = mat4x4[10];

    out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);

    return out;
}

export function extractRotation(out: QuatType, mat4x4: Mat4x4Type) {
    const scaling = vec3One();
    extractScale(scaling, mat4x4);

    const is1 = 1 / scaling[0];
    const is2 = 1 / scaling[1];
    const is3 = 1 / scaling[2];

    const sm11 = mat4x4[0] * is1;
    const sm12 = mat4x4[1] * is2;
    const sm13 = mat4x4[2] * is3;
    const sm21 = mat4x4[4] * is1;
    const sm22 = mat4x4[5] * is2;
    const sm23 = mat4x4[6] * is3;
    const sm31 = mat4x4[8] * is1;
    const sm32 = mat4x4[9] * is2;
    const sm33 = mat4x4[10] * is3;

    const trace = sm11 + sm22 + sm33;
    let S = 0;

    if (trace > 0) {
        S = Math.sqrt(trace + 1.0) * 2;
        out[3] = 0.25 * S;
        out[0] = (sm23 - sm32) / S;
        out[1] = (sm31 - sm13) / S;
        out[2] = (sm12 - sm21) / S;
    } else if (sm11 > sm22 && sm11 > sm33) {
        S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
        out[3] = (sm23 - sm32) / S;
        out[0] = 0.25 * S;
        out[1] = (sm12 + sm21) / S;
        out[2] = (sm31 + sm13) / S;
    } else if (sm22 > sm33) {
        S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
        out[3] = (sm31 - sm13) / S;
        out[0] = (sm12 + sm21) / S;
        out[1] = 0.25 * S;
        out[2] = (sm23 + sm32) / S;
    } else {
        S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
        out[3] = (sm12 - sm21) / S;
        out[0] = (sm31 + sm13) / S;
        out[1] = (sm23 + sm32) / S;
        out[2] = 0.25 * S;
    }

    return out;
}

export const modelToNormal = (out: Mat4x4Type, modelMatrix: Mat4x4Type) => {
    transpose(out, modelMatrix);
    inverted(out);
    return out;
};

export const createNormalFromModel = (modelMatrix: Mat4x4Type) => modelToNormal(create(), modelMatrix);

export const translation = (out: Mat4x4Type, mat4x4: Mat4x4Type, vec3: Vec3Type) => {
    const x = vec3[0],
        y = vec3[1],
        z = vec3[2];
    let a00, a01, a02, a03;
    let a10, a11, a12, a13;
    let a20, a21, a22, a23;

    if (mat4x4 === out) {
        out[12] = mat4x4[0] * x + mat4x4[4] * y + mat4x4[8] * z + mat4x4[12];
        out[13] = mat4x4[1] * x + mat4x4[5] * y + mat4x4[9] * z + mat4x4[13];
        out[14] = mat4x4[2] * x + mat4x4[6] * y + mat4x4[10] * z + mat4x4[14];
        out[15] = mat4x4[3] * x + mat4x4[7] * y + mat4x4[11] * z + mat4x4[15];
    } else {
        a00 = mat4x4[0];
        a01 = mat4x4[1];
        a02 = mat4x4[2];
        a03 = mat4x4[3];
        a10 = mat4x4[4];
        a11 = mat4x4[5];
        a12 = mat4x4[6];
        a13 = mat4x4[7];
        a20 = mat4x4[8];
        a21 = mat4x4[9];
        a22 = mat4x4[10];
        a23 = mat4x4[11];

        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + mat4x4[12];
        out[13] = a01 * x + a11 * y + a21 * z + mat4x4[13];
        out[14] = a02 * x + a12 * y + a22 * z + mat4x4[14];
        out[15] = a03 * x + a13 * y + a23 * z + mat4x4[15];
    }

    return out;
};

export const translate = (out: Mat4x4Type, vec3: Vec3Type) => translation(out, out, vec3);

export const fromTranslation = (out: Mat4x4Type, vec3: Vec3Type) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = vec3[0];
    out[13] = vec3[1];
    out[14] = vec3[2];
    out[15] = 1;
    return out;
};
