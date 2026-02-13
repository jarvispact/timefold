import { TypedArray } from './internal';

export type ScalarArrayType = [number];
export type ScalarType = ScalarArrayType | TypedArray;

export type Vec2ArrayType = [number, number];
export type Vec2Type = Vec2ArrayType | TypedArray;

export type Vec3ArrayType = [number, number, number];
export type Vec3Type = Vec3ArrayType | TypedArray;

export type QuatArrayType = [number, number, number, number];
export type QuatType = QuatArrayType | TypedArray;

/* eslint-disable prettier/prettier */
export type Mat3ArrayType =[
    number, number, number,
    number, number, number,
    number, number, number,
]
/* eslint-enable prettier/prettier */
export type Mat3Type = Mat3ArrayType | TypedArray;

/* eslint-disable prettier/prettier */
export type Mat4ArrayType =[
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
]
/* eslint-enable prettier/prettier */
export type Mat4Type = Mat4ArrayType | TypedArray;

export type QuatAngleOrder = 'xyz' | 'xzy' | 'yxz' | 'yzx' | 'zxy' | 'zyx';
