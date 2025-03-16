export const objectKeys = <Obj extends Record<string, unknown>>(obj: Obj) => Object.keys(obj) as (keyof Obj)[];

export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export type Mat4x4 = [
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
