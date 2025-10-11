import { Vec2, Vec2Type } from '@timefold/math';

type Box = {
    position: Vec2Type;
    halfExtends: Vec2Type;
};

type Circle = {
    position: Vec2Type;
    radius: number;
};

export type CollisionResult = {
    normal: Vec2Type;
    penetration: number;
    contactPoint: Vec2Type;
};

export function createCollisionResult(): CollisionResult {
    return {
        normal: Vec2.create(0, 0),
        penetration: 0,
        contactPoint: Vec2.create(0, 0),
    };
}

export function circleBoxCollision(result: CollisionResult, circle: Circle, box: Box): boolean {
    const halfW = box.halfExtends[0];
    const halfH = box.halfExtends[1];

    const closestX = Math.max(box.position[0] - halfW, Math.min(circle.position[0], box.position[0] + halfW));
    const closestY = Math.max(box.position[1] - halfH, Math.min(circle.position[1], box.position[1] + halfH));

    const dx = circle.position[0] - closestX;
    const dy = circle.position[1] - closestY;
    const distSq = dx * dx + dy * dy;

    const intersection = distSq < circle.radius * circle.radius;
    if (!intersection) return false;

    const dist = Math.sqrt(distSq);
    const penetration = circle.radius - dist;

    let normalX = 0;
    let normalY = 0;

    if (dist > 0.0001) {
        // Sphere center is outside or on edge of box
        normalX = dx / dist;
        normalY = dy / dist;
    } else {
        // Sphere center is inside box - find closest edge
        const distLeft = circle.position[0] - (box.position[0] - halfW);
        const distRight = box.position[0] + halfW - circle.position[0];
        const distTop = circle.position[1] - (box.position[1] - halfH);
        const distBottom = box.position[1] + halfH - circle.position[1];

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        if (minDist === distLeft) {
            normalX = -1;
            normalY = 0;
        } else if (minDist === distRight) {
            normalX = 1;
            normalY = 0;
        } else if (minDist === distTop) {
            normalX = 0;
            normalY = -1;
        } else {
            normalX = 0;
            normalY = 1;
        }
    }

    Vec2.set(result.normal, normalX, normalY);
    result.penetration = penetration;
    Vec2.set(result.contactPoint, closestX, closestY);
    return true;
}
