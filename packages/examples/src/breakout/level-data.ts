import { Vec3, Vec3Type } from '@timefold/math';

export const Empty = '___';

export const Brick = {
    Red: 'B_0',
    Green: 'B_1',
    Blue: 'B_2',
    Yellow: 'B_3',
    Orange: 'B_4',
    Purple: 'B_5',
} as const;

type Brick = (typeof Brick)[keyof typeof Brick];
type LevelItem = typeof Empty | Brick;
type Level = { bricksPerRow: number; data: LevelItem[] };

export const getColorForBrick = (brick: Brick): Vec3Type => {
    switch (brick) {
        case Brick.Red:
            return Vec3.create(1, 0, 0);
        case Brick.Green:
            return Vec3.create(0, 1, 0);
        case Brick.Blue:
            return Vec3.create(0, 0, 1);
        case Brick.Yellow:
            return Vec3.create(1, 1, 0);
        case Brick.Orange:
            return Vec3.create(1, 0.443, 0);
        case Brick.Purple:
            return Vec3.create(1, 0, 0.922);
    }
};

/* eslint-disable prettier/prettier */
export const level1: Level = {
    bricksPerRow: 4,
    data: [
        Brick.Red, Brick.Green, Brick.Blue, Brick.Yellow,
        Brick.Yellow, Brick.Blue, Brick.Green, Brick.Red,
        Brick.Blue, Brick.Yellow, Brick.Red, Brick.Green,
    ]
};

export const level2: Level = {
    bricksPerRow: 4,
    data: [
        Empty, Brick.Green, Brick.Blue, Brick.Yellow,
        Brick.Yellow, Empty, Brick.Green, Brick.Red,
        Brick.Blue, Brick.Yellow, Empty, Brick.Green,
        Brick.Green, Brick.Red, Brick.Yellow, Empty,
    ]
};

// Classic pyramid pattern
export const level3: Level = {
    bricksPerRow: 8,
    data: [
        Empty, Empty, Empty, Brick.Red, Brick.Red, Empty, Empty, Empty,
        Empty, Empty, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Empty, Empty,
        Empty, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Empty,
        Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green,
    ]
};

// Checkerboard pattern
export const level4: Level = {
    bricksPerRow: 6,
    data: [
        Brick.Red, Empty, Brick.Blue, Empty, Brick.Yellow, Empty,
        Empty, Brick.Green, Empty, Brick.Red, Empty, Brick.Blue,
        Brick.Yellow, Empty, Brick.Red, Empty, Brick.Green, Empty,
        Empty, Brick.Blue, Empty, Brick.Yellow, Empty, Brick.Red,
    ]
};

// Diamond shape
export const level5: Level = {
    bricksPerRow: 7,
    data: [
        Empty, Empty, Empty, Brick.Red, Empty, Empty, Empty,
        Empty, Empty, Brick.Orange, Brick.Orange, Brick.Orange, Empty, Empty,
        Empty, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Empty,
        Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green,
        Empty, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Empty,
        Empty, Empty, Brick.Purple, Brick.Purple, Brick.Purple, Empty, Empty,
        Empty, Empty, Empty, Brick.Red, Empty, Empty, Empty,
    ]
};

// Alternating rows
export const level6: Level = {
    bricksPerRow: 8,
    data: [
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
        Brick.Orange, Brick.Orange, Empty, Empty, Empty, Empty, Brick.Orange, Brick.Orange,
        Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow,
        Brick.Green, Brick.Green, Empty, Empty, Empty, Empty, Brick.Green, Brick.Green,
        Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue,
    ]
};

// Fortress pattern
export const level7: Level = {
    bricksPerRow: 9,
    data: [
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
        Brick.Red, Empty, Empty, Empty, Empty, Empty, Empty, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Yellow, Empty, Empty, Empty, Brick.Yellow, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Yellow, Empty, Brick.Blue, Empty, Brick.Yellow, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Yellow, Empty, Empty, Empty, Brick.Yellow, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Empty, Brick.Red,
        Brick.Red, Empty, Empty, Empty, Empty, Empty, Empty, Empty, Brick.Red,
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
    ]
};

// Spiral pattern
export const level8: Level = {
    bricksPerRow: 7,
    data: [
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
        Brick.Red, Empty, Empty, Empty, Empty, Empty, Brick.Green,
        Brick.Red, Empty, Brick.Yellow, Brick.Yellow, Brick.Yellow, Empty, Brick.Green,
        Brick.Red, Empty, Brick.Yellow, Empty, Brick.Yellow, Empty, Brick.Green,
        Brick.Red, Empty, Brick.Yellow, Brick.Yellow, Brick.Yellow, Empty, Brick.Green,
        Brick.Red, Empty, Empty, Empty, Empty, Empty, Brick.Green,
        Brick.Red, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green,
    ]
};

// Rainbow pattern
export const level9: Level = {
    bricksPerRow: 10,
    data: [
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
        Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange,
        Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow,
        Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green,
        Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue,
        Brick.Purple, Brick.Purple, Brick.Purple, Brick.Purple, Brick.Purple, Brick.Purple, Brick.Purple, Brick.Purple, Brick.Purple, Brick.Purple,
    ]
};

// Target pattern
export const level10: Level = {
    bricksPerRow: 8,
    data: [
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
        Brick.Red, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Red,
        Brick.Red, Brick.Orange, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Orange, Brick.Red,
        Brick.Red, Brick.Orange, Brick.Yellow, Brick.Green, Brick.Green, Brick.Yellow, Brick.Orange, Brick.Red,
        Brick.Red, Brick.Orange, Brick.Yellow, Brick.Green, Brick.Green, Brick.Yellow, Brick.Orange, Brick.Red,
        Brick.Red, Brick.Orange, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Yellow, Brick.Orange, Brick.Red,
        Brick.Red, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Orange, Brick.Red,
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
    ]
};

// Space invader pattern
export const level11: Level = {
    bricksPerRow: 11,
    data: [
        Empty, Empty, Empty, Brick.Green, Empty, Empty, Empty, Brick.Green, Empty, Empty, Empty,
        Empty, Empty, Empty, Empty, Brick.Green, Brick.Green, Brick.Green, Empty, Empty, Empty, Empty,
        Empty, Empty, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Empty, Empty,
        Empty, Brick.Green, Brick.Green, Empty, Brick.Green, Brick.Green, Brick.Green, Empty, Brick.Green, Brick.Green, Empty,
        Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green,
        Brick.Green, Empty, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Brick.Green, Empty, Brick.Green,
        Brick.Green, Empty, Brick.Green, Empty, Empty, Empty, Empty, Empty, Brick.Green, Empty, Brick.Green,
        Empty, Empty, Empty, Brick.Green, Brick.Green, Empty, Brick.Green, Brick.Green, Empty, Empty, Empty,
    ]
};

// Maze pattern
export const level12: Level = {
    bricksPerRow: 9,
    data: [
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
        Brick.Red, Empty, Empty, Empty, Empty, Empty, Empty, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Blue, Empty, Empty, Empty, Brick.Blue, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Blue, Empty, Brick.Green, Empty, Brick.Blue, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Blue, Empty, Brick.Green, Empty, Brick.Blue, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Blue, Empty, Brick.Green, Brick.Green, Brick.Blue, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Blue, Empty, Empty, Empty, Empty, Empty, Brick.Red,
        Brick.Red, Empty, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Brick.Blue, Empty, Brick.Red,
        Brick.Red, Empty, Empty, Empty, Empty, Empty, Empty, Empty, Brick.Red,
        Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red, Brick.Red,
    ]
};
/* eslint-enable prettier/prettier */
