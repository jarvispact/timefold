import { createComponent } from '@timefold/ecs';
import { ClockComponent, ClockData, EngineComponentType } from './types';

export const type = EngineComponentType.Clock;

type CreateArgs = {
    autoStart?: boolean;
};

export const create = (args: CreateArgs = {}): ClockComponent => {
    const data: ClockData = {
        autoStart: args.autoStart ?? true,
        startTime: 0,
        oldTime: 0,
        elapsedTime: 0,
        running: false,
        paused: false,
    };

    return createComponent(type, data);
};

export const start = (out: ClockData, elapsedTime = 0) => {
    if (out.paused) {
        out.paused = false;
        out.startTime = performance.now();
        out.oldTime = out.startTime;
    } else {
        out.startTime = performance.now();
        out.oldTime = out.startTime;
        out.elapsedTime = elapsedTime;
        out.running = true;
    }
};

export const getDelta = (out: ClockData) => {
    let diff = 0;

    if (out.autoStart && !out.running) {
        start(out);
        return 0;
    }

    if (out.running && !out.paused) {
        const newTime = performance.now();
        diff = (newTime - out.oldTime) / 1000;
        out.oldTime = newTime;
        out.elapsedTime += diff;
    }

    return diff;
};

export const getElapsedTime = (out: ClockData) => {
    getDelta(out);
    return out.elapsedTime;
};

export const stop = (out: ClockData) => {
    getElapsedTime(out);
    out.running = false;
    out.autoStart = false;
};

export const pause = (out: ClockData) => {
    out.paused = true;
};

export const reset = (out: ClockData, elapsedTime = 0) => {
    out.startTime = performance.now();
    out.oldTime = out.startTime;
    out.elapsedTime = elapsedTime;
    out.running = false;
    out.paused = false;
};
