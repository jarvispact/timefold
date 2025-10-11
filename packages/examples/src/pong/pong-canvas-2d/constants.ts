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
export const BALL_START_POSITION = Vec2.create(canvas.width / 2, canvas.height / 2);
export const BALL_START_VELOCITY = Vec2.create(-500, 200);

export const PLAYER1_HALF_EXTENDS = Vec2.create(20, 100);
export const PLAYER1_START_POSITION = Vec2.create(10 + PLAYER1_HALF_EXTENDS[0], canvas.height / 2);
export const PLAYER1_START_VELOCITY = Vec2.create(0, 0);

export const PLAYER2_HALF_EXTENDS = Vec2.create(20, 100);
export const PLAYER2_START_POSITION = Vec2.create(canvas.width - PLAYER2_HALF_EXTENDS[0] - 10, canvas.height / 2);
export const PLAYER2_START_VELOCITY = Vec2.create(0, 0);
