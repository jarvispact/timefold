import { createComponent } from '@timefold/ecs';
import { AabbComponent, AabbData, AabbType, AabbCollisionDirection, AabbCollisionResult } from './types';
import { Vec3, Vec3Type } from '@timefold/math';

export const type: AabbType = '@tf/Aabb';

export const create = (args: 'auto' | Omit<AabbData, 'center'>): AabbComponent => {
    const min = args === 'auto' ? Vec3.zero() : args.min;
    const max = args === 'auto' ? Vec3.zero() : args.max;

    const center = Vec3.create(0, 0, 0);
    Vec3.addition(center, min, max);
    Vec3.scale(center, 0.5);

    return createComponent(type, { min, center, max });
};

export const intersection = (result: AabbCollisionResult, a: AabbComponent, b: AabbComponent) => {
    if (a === b) {
        result.collided = false;
        result.direction = undefined;
        return result;
    }

    const xOverlap = a.data.min[0] <= b.data.max[0] && a.data.max[0] >= b.data.min[0];
    if (!xOverlap) {
        result.collided = false;
        result.direction = undefined;
        return result;
    }

    const yOverlap = a.data.min[1] <= b.data.max[1] && a.data.max[1] >= b.data.min[1];
    if (!yOverlap) {
        result.collided = false;
        result.direction = undefined;
        return result;
    }

    const zOverlap = a.data.min[2] <= b.data.max[2] && a.data.max[2] >= b.data.min[2];
    if (!zOverlap) {
        result.collided = false;
        result.direction = undefined;
        return result;
    }

    const xDepth = Math.min(a.data.max[0] - b.data.min[0], b.data.max[0] - a.data.min[0]);
    const yDepth = Math.min(a.data.max[1] - b.data.min[1], b.data.max[1] - a.data.min[1]);
    const zDepth = Math.min(a.data.max[2] - b.data.min[2], b.data.max[2] - a.data.min[2]);

    let direction: AabbCollisionDirection;

    if (xDepth <= yDepth && xDepth <= zDepth) {
        direction = a.data.center[0] > b.data.center[0] ? 'left' : 'right';
    } else if (yDepth <= xDepth && yDepth <= zDepth) {
        direction = a.data.center[1] > b.data.center[1] ? 'bottom' : 'up';
    } else {
        direction = a.data.center[2] > b.data.center[2] ? 'near' : 'far';
    }

    result.collided = true;
    result.direction = direction;
    return result;
};

export const pointIntersection = (result: AabbCollisionResult, aabb: AabbComponent, point: Vec3Type) => {
    const xOverlap = point[0] >= aabb.data.min[0] && point[0] <= aabb.data.max[0];
    if (!xOverlap) {
        result.collided = false;
        result.direction = undefined;
        return result;
    }

    const yOverlap = point[1] >= aabb.data.min[1] && point[1] <= aabb.data.max[1];
    if (!yOverlap) {
        result.collided = false;
        result.direction = undefined;
        return result;
    }

    const zOverlap = point[2] >= aabb.data.min[2] && point[2] <= aabb.data.max[2];
    if (!zOverlap) {
        result.collided = false;
        result.direction = undefined;
        return result;
    }

    const xDistToMin = Math.abs(point[0] - aabb.data.min[0]);
    const xDistToMax = Math.abs(aabb.data.max[0] - point[0]);
    const yDistToMin = Math.abs(point[1] - aabb.data.min[1]);
    const yDistToMax = Math.abs(aabb.data.max[1] - point[1]);
    const zDistToMin = Math.abs(point[2] - aabb.data.min[2]);
    const zDistToMax = Math.abs(aabb.data.max[2] - point[2]);

    const xMinDist = Math.min(xDistToMin, xDistToMax);
    const yMinDist = Math.min(yDistToMin, yDistToMax);
    const zMinDist = Math.min(zDistToMin, zDistToMax);

    let direction: AabbCollisionDirection;

    if (xMinDist <= yMinDist && xMinDist <= zMinDist) {
        direction = xDistToMin < xDistToMax ? 'left' : 'right';
    } else if (yMinDist <= xMinDist && yMinDist <= zMinDist) {
        direction = yDistToMin < yDistToMax ? 'bottom' : 'up';
    } else {
        direction = zDistToMin < zDistToMax ? 'near' : 'far';
    }

    result.collided = true;
    result.direction = direction;
    return result;
};

export const set = (out: AabbComponent, min: Vec3Type, max: Vec3Type) => {
    Vec3.copy(out.data.min, min);
    Vec3.addition(out.data.center, out.data.min, out.data.max);
    Vec3.scale(out.data.center, 0.5);
    Vec3.copy(out.data.max, max);
};
