import { Component } from './component';
import { World } from './world';

type BuildFn<W = World<Component>> = ((world: W) => unknown) | ((world: W) => Promise<unknown>);

export type SerialPluginArgs<W = World<Component>> = {
    fn: BuildFn<W>;
    order?: number;
};

export type SerialPlugin<W = World<Component>> = {
    parallel: false;
    fn: BuildFn<W>;
    order: number;
};

export type ParallelPluginArgs<W = World<Component>> = {
    fns: BuildFn<W>[];
    order?: number;
};

export type ParallelPlugin<W = World<Component>> = {
    parallel: true;
    fns: BuildFn<W>[];
    order: number;
};

export type EcsPlugin<W = World<Component>> = SerialPlugin<W> | ParallelPlugin<W>;

const defaultOrder = 10;

export const isSerialPlugin = <W = World<Component>>(
    plugin: SerialPlugin<W> | ParallelPlugin<W>,
): plugin is SerialPlugin<W> => !plugin.parallel;

export const isParallelPlugin = <W = World<Component>>(
    plugin: SerialPlugin<W> | ParallelPlugin<W>,
): plugin is ParallelPlugin<W> => plugin.parallel;

export const createPlugin = <W = World<Component>>(args: SerialPluginArgs<W>): SerialPlugin<W> => {
    return {
        parallel: false,
        fn: args.fn,
        order: args.order ?? defaultOrder,
    };
};

export const createParallelPlugin = <W = World<Component>>(args: ParallelPluginArgs<W>): ParallelPlugin<W> => {
    return {
        parallel: true,
        fns: args.fns,
        order: args.order ?? defaultOrder,
    };
};
