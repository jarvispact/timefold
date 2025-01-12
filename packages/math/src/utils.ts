export const EPSILON = 0.000001;

export const clamp = (min: number, max: number, value: number) => Math.min(Math.max(value, min), max);

export const createClamp = (min: number, max: number) => (value: number) => clamp(min, max, value);

export const remap = (low1: number, high1: number, low2: number, high2: number, value: number) =>
    low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);

export const createRemap = (low1: number, high1: number, low2: number, high2: number) => (value: number) =>
    remap(low1, high1, low2, high2, value);

export const lerp = (start: number, end: number, t: number) => (1 - t) * start + t * end;

export const createLerp = (start: number, end: number) => (t: number) => lerp(start, end, t);

export const DEG_TO_RAD = Math.PI / 180;
export const degreesToRadians = (degrees: number) => degrees * DEG_TO_RAD;

export const RAD_TO_DEG = 180 / Math.PI;
export const radiansToDegrees = (radians: number) => radians * RAD_TO_DEG;
