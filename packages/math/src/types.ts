import { TypedArray } from './internal';

export type ScalarType = [number] | TypedArray;
export type Vec2Type = [number, number] | TypedArray;
export type Vec3Type = [number, number, number] | TypedArray;
export type QuatType = [number, number, number, number] | TypedArray;

/* eslint-disable prettier/prettier */
export type Mat4Type =
    | [
          number, number, number, number,
          number, number, number, number,
          number, number, number, number,
          number, number, number, number,
      ]
    | TypedArray;
/* eslint-enable prettier/prettier */

export type QuatAngleOrder = 'xyz' | 'xzy' | 'yxz' | 'yzx' | 'zxy' | 'zyx';
