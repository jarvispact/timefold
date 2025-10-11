import { Vec2, Vec2Type } from '@timefold/math';

type Box = {
    position: Vec2Type;
    halfExtends: Vec2Type;
};

type Circle = {
    position: Vec2Type;
    radius: number;
};

interface CollisionMetadata {
    intersects: boolean;
    normal: Vec2Type;
    penetration: number;
    contactPoint: Vec2Type;
}

export function checkCircleBoxCollision(circle: Circle, box: Box): boolean {
    const halfW = box.halfExtends[0];
    const halfH = box.halfExtends[1];

    const closestX = Math.max(box.position[0] - halfW, Math.min(circle.position[0], box.position[0] + halfW));
    const closestY = Math.max(box.position[1] - halfH, Math.min(circle.position[1], box.position[1] + halfH));

    const dx = circle.position[0] - closestX;
    const dy = circle.position[1] - closestY;
    const distSq = dx * dx + dy * dy;

    return distSq < circle.radius * circle.radius;
}

export function getCircleBoxCollisionMetadata(sphere: Circle, box: Box): CollisionMetadata {
    const halfW = box.halfExtends[0];
    const halfH = box.halfExtends[1];

    // Find closest point on box to sphere center
    const closestX = Math.max(box.position[0] - halfW, Math.min(sphere.position[0], box.position[0] + halfW));
    const closestY = Math.max(box.position[1] - halfH, Math.min(sphere.position[1], box.position[1] + halfH));

    // Vector from closest point to sphere center
    const dx = sphere.position[0] - closestX;
    const dy = sphere.position[1] - closestY;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    // Check if intersecting
    const intersects = distSq < sphere.radius * sphere.radius;

    if (!intersects) {
        return {
            intersects: false,
            normal: Vec2.create(0, 0),
            penetration: 0,
            contactPoint: Vec2.create(closestX, closestY),
        };
    }

    // Calculate penetration depth
    const penetration = sphere.radius - dist;

    // Calculate normal (direction to push sphere out)
    let normalX = 0;
    let normalY = 0;

    if (dist > 0.0001) {
        // Sphere center is outside or on edge of box
        normalX = dx / dist;
        normalY = dy / dist;
    } else {
        // Sphere center is inside box - find closest edge
        const distLeft = sphere.position[0] - (box.position[0] - halfW);
        const distRight = box.position[0] + halfW - sphere.position[0];
        const distTop = sphere.position[1] - (box.position[1] - halfH);
        const distBottom = box.position[1] + halfH - sphere.position[1];

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

    return {
        intersects: true,
        normal: Vec2.create(normalX, normalY),
        penetration,
        contactPoint: Vec2.create(closestX, closestY),
    };
}
