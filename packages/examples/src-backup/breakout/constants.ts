import { createWorld } from '@timefold/engine';

const dpr = window.devicePixelRatio || 1;
export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

export const world = createWorld();
export type World = typeof world;
