export const EPSILON = 0.000001;

export function clamp(min: number, max: number, value: number) {
    return Math.min(Math.max(value, min), max);
}

export function createClamp(min: number, max: number) {
    return function (value: number) {
        return Math.min(Math.max(value, min), max);
    };
}

export function remap(low1: number, high1: number, low2: number, high2: number, value: number) {
    return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

export function createRemap(low1: number, high1: number, low2: number, high2: number) {
    return function (value: number) {
        return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
    };
}

export function lerp(start: number, end: number, t: number) {
    return (1 - t) * start + t * end;
}

export function createLerp(start: number, end: number) {
    return function (t: number) {
        return (1 - t) * start + t * end;
    };
}

export const DEG_TO_RAD = Math.PI / 180;

export function degreesToRadians(degrees: number) {
    return degrees * DEG_TO_RAD;
}

export const RAD_TO_DEG = 180 / Math.PI;

export function radiansToDegrees(radians: number) {
    return radians * RAD_TO_DEG;
}
