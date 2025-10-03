import { Component, createComponent } from '@timefold/ecs';
import * as AnimationTrack from './animation-track';

// common

export const type = '@tf/Animation';

type GenericTracks = Record<string, AnimationTrack.AnimationTrackComponent>;

export type AnimationData<Tracks extends GenericTracks = GenericTracks> = {
    tracks: Tracks;
    trackKeys: string[];
};

export type AnimationComponent<Tracks extends GenericTracks = GenericTracks> = Component<
    typeof type,
    AnimationData<Tracks>
>;

export const isAnimationComponent = (component: Component): component is AnimationComponent => component.type === type;

// create

export type CreateArgs<Tracks extends GenericTracks = GenericTracks> = {
    tracks: Tracks;
};

export const create = <Tracks extends GenericTracks>(args: CreateArgs<Tracks>): AnimationComponent<Tracks> => {
    const data: AnimationData<Tracks> = {
        tracks: args.tracks,
        trackKeys: Object.keys(args.tracks),
    };

    return createComponent(type, data);
};

// helpers

export const play = (out: AnimationComponent) => {
    for (let i = 0; i < out.data.trackKeys.length; i++) {
        AnimationTrack.play(out.data.tracks[out.data.trackKeys[i]]);
    }
};

export const stop = (out: AnimationComponent) => {
    for (let i = 0; i < out.data.trackKeys.length; i++) {
        AnimationTrack.stop(out.data.tracks[out.data.trackKeys[i]]);
    }
};

export const pause = (out: AnimationComponent) => {
    for (let i = 0; i < out.data.trackKeys.length; i++) {
        AnimationTrack.pause(out.data.tracks[out.data.trackKeys[i]]);
    }
};

export const reset = (out: AnimationComponent) => {
    for (let i = 0; i < out.data.trackKeys.length; i++) {
        AnimationTrack.reset(out.data.tracks[out.data.trackKeys[i]]);
    }
};

type OnCompleteCallback = () => void;

export const update = (out: AnimationComponent, onComplete?: OnCompleteCallback) => {
    let doneCounter = 0;

    for (let i = 0; i < out.data.trackKeys.length; i++) {
        const track = out.data.tracks[out.data.trackKeys[i]];
        AnimationTrack.update(track);

        if (track.data.recentlyCompleted) {
            doneCounter++;
            track.data.recentlyCompleted = false;
        }
    }

    if (onComplete && doneCounter === out.data.trackKeys.length) {
        onComplete();
    }
};
