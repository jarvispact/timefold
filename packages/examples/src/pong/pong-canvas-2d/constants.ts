import { Vec2 } from '@timefold/math';

export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let entity = 0;
export const nextEntityId = () => entity++;

export const player1 = nextEntityId();
export const player2 = nextEntityId();
export const ball = nextEntityId();

export const ARENA_LEFT = Vec2.create(0, 0);
export const ARENA_RIGHT = Vec2.create(canvas.width, canvas.height);
export const ARENA_TOP = Vec2.create(0, 0);
export const ARENA_BOTTOM = Vec2.create(0, canvas.height);

export const BALL_RADIUS = 50;
export const BALL_START_POSITION = Vec2.create(canvas.width / 2 - BALL_RADIUS, canvas.height / 2 - BALL_RADIUS);
export const BALL_START_VELOCITY = Vec2.create(-200, 400);

// Collision restitution (bounciness) - 1.0 = perfectly elastic
export const RESTITUTION = 1;
