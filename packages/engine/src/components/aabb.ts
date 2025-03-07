import { createComponent } from '@timefold/ecs';
import { AabbComponent, AabbData, AabbType } from './types';
import { Vec3, Vec3Type } from '@timefold/math';

export const type: AabbType = '@tf/Aabb';

export const create = (args: Omit<AabbData, 'center'>): AabbComponent => {
    const center = Vec3.create(0, 0, 0);
    Vec3.addition(center, args.min, args.max);
    Vec3.scale(center, 0.5);

    return createComponent(type, {
        min: args.min,
        center,
        max: args.max,
    });
};

export const intersection = (a: AabbComponent, b: AabbComponent) => {
    return (
        a.data.min[0] <= b.data.max[0] &&
        a.data.max[0] >= b.data.min[0] &&
        a.data.min[1] <= b.data.max[1] &&
        a.data.max[1] >= b.data.min[1] &&
        a.data.min[2] <= b.data.max[2] &&
        a.data.max[2] >= b.data.min[2]
    );
};

export const pointIntersection = (aabb: AabbComponent, point: Vec3Type) => {
    return (
        point[0] >= aabb.data.min[0] &&
        point[0] <= aabb.data.max[0] &&
        point[1] >= aabb.data.min[1] &&
        point[1] <= aabb.data.max[1] &&
        point[2] >= aabb.data.min[2] &&
        point[2] <= aabb.data.max[2]
    );
};

export const set = (out: AabbComponent, min: Vec3Type, max: Vec3Type) => {
    Vec3.copy(out.data.min, min);
    Vec3.addition(out.data.center, out.data.min, out.data.max);
    Vec3.scale(out.data.center, 0.5);
    Vec3.copy(out.data.max, max);
};
