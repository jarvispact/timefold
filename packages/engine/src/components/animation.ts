import { Component, createComponent } from '@timefold/ecs';
import {
    AnimationComponent,
    AnimationData,
    AnimationKeyframe,
    AnimationTrack,
    EngineComponentType,
    QuatAnimationTrack,
    ScalarAnimationTrack,
    Vec2AnimationTrack,
    Vec3AnimationTrack,
} from './types';
import { Easings, MathUtils, Quat, QuatType, Vec2, Vec2Type, Vec3, Vec3Type } from '@timefold/math';
import { objectKeys } from '../internal';

export const type = EngineComponentType.Animation;

export function is(component: Component): component is AnimationComponent {
    return component.type === type;
}

type AnimationArgs<Tracks extends Record<string, AnimationTrack>> = {
    duration: number;
    tracks: Tracks;
    time?: number;
    loop?: boolean;
};

export function create<Tracks extends Record<string, AnimationTrack>>(
    args: AnimationArgs<Tracks>,
): AnimationComponent<Tracks> {
    const data: AnimationData<Tracks> = {
        duration: args.duration,
        tracks: args.tracks,
        trackKeys: objectKeys(args.tracks),
        loop: args.loop ?? false,
        playing: false,
        time: args.time ?? 0,
    };

    return createComponent(type, data);
}

export function start<Tracks extends Record<string, AnimationTrack>>(data: AnimationData<Tracks>) {
    data.playing = true;
    data.time = 0;
}

export function stop<Tracks extends Record<string, AnimationTrack>>(data: AnimationData<Tracks>) {
    data.playing = false;
    data.time = 0;
}

export function pause<Tracks extends Record<string, AnimationTrack>>(data: AnimationData<Tracks>) {
    data.playing = false;
}

export function resume<Tracks extends Record<string, AnimationTrack>>(data: AnimationData<Tracks>) {
    data.playing = true;
}

function findKeyframeSegment<Value>(keyframes: AnimationKeyframe<Value>[], normalizedTime: number) {
    if (keyframes.length === 0) return undefined;

    if (keyframes.length === 1 || normalizedTime <= keyframes[0].time) {
        return { start: undefined, end: keyframes[0], progress: 0 };
    }

    for (let i = 0; i < keyframes.length - 1; i++) {
        const start = keyframes[i];
        const end = keyframes[i + 1];

        if (normalizedTime >= start.time && normalizedTime <= end.time) {
            const segmentDuration = end.time - start.time;
            const progress = segmentDuration > 0 ? (normalizedTime - start.time) / segmentDuration : 1;
            return { start, end, progress };
        }
    }

    const last = keyframes[keyframes.length - 1];
    return { start: last, end: undefined, progress: 1 };
}

function evaluateScalarTrack(track: ScalarAnimationTrack, normalizedTime: number): number {
    if (track.keyframes.length === 0) return track.initialValue;

    const segment = findKeyframeSegment<number>(track.keyframes, normalizedTime);
    if (!segment) return track.initialValue;

    if (!segment.start) {
        return track.initialValue;
    }

    if (!segment.end) {
        return segment.start.value;
    }

    return MathUtils.lerp(segment.start.value, segment.end.value, Easings[segment.start.easing](segment.progress));
}

function evaluateVec2Track(out: Vec2Type, track: Vec2AnimationTrack, normalizedTime: number): Vec2Type {
    if (track.keyframes.length === 0) return Vec2.copy(out, track.initialValue);

    const segment = findKeyframeSegment<Vec2Type>(track.keyframes, normalizedTime);
    if (!segment) return track.initialValue;

    if (!segment.start) {
        return Vec2.copy(out, track.initialValue);
    }

    if (!segment.end) {
        return segment.start.value;
    }

    return Vec2.linearInterpolation(
        out,
        segment.start.value,
        segment.end.value,
        Easings[segment.start.easing](segment.progress),
    );
}

function evaluateVec3Track(out: Vec3Type, track: Vec3AnimationTrack, normalizedTime: number): Vec3Type {
    if (track.keyframes.length === 0) return Vec3.copy(out, track.initialValue);

    const segment = findKeyframeSegment<Vec3Type>(track.keyframes, normalizedTime);
    if (!segment) return track.initialValue;

    if (!segment.start) {
        return Vec3.copy(out, track.initialValue);
    }

    if (!segment.end) {
        return segment.start.value;
    }

    return Vec3.linerInterpolation(
        out,
        segment.start.value,
        segment.end.value,
        Easings[segment.start.easing](segment.progress),
    );
}

function evaluateQuatTrack(out: QuatType, track: QuatAnimationTrack, normalizedTime: number): QuatType {
    if (track.keyframes.length === 0) return Quat.copy(out, track.initialValue);

    const segment = findKeyframeSegment<QuatType>(track.keyframes, normalizedTime);
    if (!segment) return track.initialValue;

    if (!segment.start) {
        return Quat.copy(out, track.initialValue);
    }

    if (!segment.end) {
        return segment.start.value;
    }

    return Quat.sphericalLinearInterpolation(
        out,
        segment.start.value,
        segment.end.value,
        Easings[segment.start.easing](segment.progress),
    );
}

export function update<Tracks extends Record<string, AnimationTrack>>(
    out: { [K in keyof Tracks]: Tracks[K]['initialValue'] },
    animation: AnimationData<Tracks>,
    delta: number,
) {
    if (!animation.playing) return false;

    animation.time += delta;

    if (animation.time >= animation.duration) {
        if (animation.loop) {
            animation.time = animation.time % animation.duration;
        } else {
            animation.time = animation.duration;
            animation.playing = false;
        }
    }

    const normalizedTime = Math.min(animation.time / animation.duration, 1);

    for (let i = 0; i < animation.trackKeys.length; i++) {
        const trackKey = animation.trackKeys[i];
        const track = animation.tracks[trackKey];

        switch (track.type) {
            case 'scalar':
                out[trackKey] = evaluateScalarTrack(track, normalizedTime);
                break;
            case 'vec2':
                evaluateVec2Track(out[trackKey] as Vec2Type, track, normalizedTime);
                break;
            case 'vec3':
                evaluateVec3Track(out[trackKey] as Vec3Type, track, normalizedTime);
                break;
            case 'quat':
                evaluateQuatTrack(out[trackKey] as QuatType, track, normalizedTime);
                break;
        }
    }

    return true;
}
