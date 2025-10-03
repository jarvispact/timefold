import { Component, createComponent } from '@timefold/ecs';
import { ClockComponent, ClockData, ClockType } from './types';

export const type: ClockType = '@tf/Clock';

export const isClockComponent = (component: Component): component is ClockComponent => component.type === type;

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

export const start = (out: ClockComponent, elapsedTime = 0) => {
    if (out.data.paused) {
        out.data.paused = false;
        out.data.startTime = performance.now();
        out.data.oldTime = out.data.startTime;
    } else {
        out.data.startTime = performance.now();
        out.data.oldTime = out.data.startTime;
        out.data.elapsedTime = elapsedTime;
        out.data.running = true;
    }
};

export const getDelta = (out: ClockComponent) => {
    let diff = 0;

    if (out.data.autoStart && !out.data.running) {
        start(out);
        return 0;
    }

    if (out.data.running && !out.data.paused) {
        const newTime = performance.now();
        diff = (newTime - out.data.oldTime) / 1000;
        out.data.oldTime = newTime;
        out.data.elapsedTime += diff;
    }

    return diff;
};

export const getElapsedTime = (out: ClockComponent) => {
    getDelta(out);
    return out.data.elapsedTime;
};

export const stop = (out: ClockComponent) => {
    getElapsedTime(out);
    out.data.running = false;
    out.data.autoStart = false;
};

export const pause = (out: ClockComponent) => {
    out.data.paused = true;
};

export const reset = (out: ClockComponent, elapsedTime = 0) => {
    out.data.startTime = performance.now();
    out.data.oldTime = out.data.startTime;
    out.data.elapsedTime = elapsedTime;
    out.data.running = false;
    out.data.paused = false;
};
