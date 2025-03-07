import { Component, createComponent } from '@timefold/ecs';
import { Quat, Vec3, Vec3Type, QuatType, EasingFunction } from '@timefold/math';
import { ClockComponent } from './types';
import { Clock } from '.';

// common

export const type = '@tf/AnimationTrack';

// keyframes

export type Vec3Keyframe = {
    time: number;
    value: Vec3Type;
};

export type QuatKeyframe = {
    time: number;
    value: QuatType;
};

export type Keyframe = Vec3Keyframe | QuatKeyframe;

// tracks

type CommonTrackData = {
    clock: ClockComponent;
    elapsed: number;
    timeScale: number;
    minTime: number;
    maxTime: number;
    onComplete: 'repeat' | 'stop';
    recentlyCompleted: boolean; // flag to store the info for the Animation component
    easing: EasingFunction;
};

export type Vec3Track = CommonTrackData & {
    type: 'vec3';
    currentValue: Vec3Type;
    keyframes: Vec3Keyframe[];
};

export type QuatTrack = CommonTrackData & {
    type: 'quat';
    currentValue: QuatType;
    keyframes: QuatKeyframe[];
};

export type TrackData = Vec3Track | QuatTrack;

export type AnimationTrackComponent<Data extends TrackData = TrackData> = Component<typeof type, Data>;

export const isAnimationTrackComponent = (component: Component): component is AnimationTrackComponent =>
    component.type === type;

export const isVec3AnimationTrackComponent = (component: Component): component is AnimationTrackComponent<Vec3Track> =>
    component.type === type &&
    'data' in component &&
    typeof component.data === 'object' &&
    !!component.data &&
    'type' in component.data &&
    component.data.type === 'vec3';

export const isQuatAnimationTrackComponent = (component: Component): component is AnimationTrackComponent<QuatTrack> =>
    component.type === type &&
    'data' in component &&
    typeof component.data === 'object' &&
    !!component.data &&
    'type' in component.data &&
    component.data.type === 'quat';

// create

type CommonCreateArgs = {
    clock?: ClockComponent;
    timeScale?: number;
    minTime: number;
    maxTime: number;
    onComplete?: 'repeat' | 'stop';
    easing?: EasingFunction;
};

const createCommon = (args: CommonCreateArgs): CommonTrackData => ({
    clock: args.clock ?? Clock.create(),
    elapsed: 0,
    timeScale: args.timeScale ?? 1,
    minTime: args.minTime,
    maxTime: args.maxTime,
    onComplete: args.onComplete ?? 'stop',
    recentlyCompleted: false,
    easing: args.easing ?? 'linear',
});

type CreateVec3TrackArgs = CommonCreateArgs & {
    keyframes: Vec3Keyframe[];
};

export const createVec3Track = (args: CreateVec3TrackArgs): AnimationTrackComponent<Vec3Track> =>
    createComponent(type, {
        ...createCommon(args),
        type: 'vec3',
        currentValue: Vec3.zero(),
        keyframes: args.keyframes,
    });

type CreateQuatTrackArgs = CommonCreateArgs & {
    keyframes: QuatKeyframe[];
};

export const createQuatTrack = (args: CreateQuatTrackArgs): AnimationTrackComponent<QuatTrack> =>
    createComponent(type, {
        ...createCommon(args),
        type: 'quat',
        currentValue: Quat.createIdentity(),
        keyframes: args.keyframes,
    });

// helpers

export const play = (out: AnimationTrackComponent) => {
    Clock.start(out.data.clock, out.data.minTime);
};

export const stop = (out: AnimationTrackComponent) => {
    Clock.stop(out.data.clock);
};

export const pause = (out: AnimationTrackComponent) => {
    Clock.pause(out.data.clock);
};

export const reset = (out: AnimationTrackComponent) => {
    Clock.reset(out.data.clock, out.data.minTime);
};

type OnCompleteCallback = () => void;

export const update = <TrackComponent extends AnimationTrackComponent>(
    out: TrackComponent,
    onComplete?: OnCompleteCallback,
) => {
    out.data.elapsed = Clock.getElapsedTime(out.data.clock) * out.data.timeScale;

    // const [current, next] = AnimationUtils.getKeyframeIndices(out.data.keyframes, out.data.elapsed);

    // const t = AnimationUtils.computeInterpolationFactor(out.data.keyframes, out.data.elapsed, current, next);

    // if (out.data.type === 'vec3') {
    //     lerp(
    //         out.data.currentValue,
    //         out.data.keyframes[current].value,
    //         out.data.keyframes[next].value,
    //         Easings.functions[out.data.easing](t),
    //     );
    // } else if (out.data.type === 'quat') {
    //     slerp(
    //         out.data.currentValue,
    //         out.data.keyframes[current].value,
    //         out.data.keyframes[next].value,
    //         Easings.functions[out.data.easing](t),
    //     );
    // }

    if (out.data.elapsed >= out.data.maxTime && out.data.clock.data.running) {
        // this flag is only resetted when used in a animation component
        out.data.recentlyCompleted = true;

        if (out.data.onComplete === 'repeat') {
            Clock.start(out.data.clock);
        } else {
            Clock.stop(out.data.clock);
        }

        if (typeof onComplete === 'function') {
            onComplete();
        }
    }

    return out.data.currentValue as TrackComponent['data']['currentValue'];
};
