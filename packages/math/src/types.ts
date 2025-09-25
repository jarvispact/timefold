import * as Easings from './easings';

export type Mat4x4Type = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
];

export type QuatType = [number, number, number, number];
export type QuatAngleOrder = 'xyz' | 'xzy' | 'yxz' | 'yzx' | 'zxy' | 'zyx';

export type ScalarType = [number];

export type Vec2Type = [number, number];

export type Vec3Type = [number, number, number];

export type EasingFunction = keyof typeof Easings;
