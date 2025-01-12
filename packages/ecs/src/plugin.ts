import * as Component from './component';
import * as World from './world';

type BuildFn<W = World.World<Component.Type>> = ((world: W) => unknown) | ((world: W) => Promise<unknown>);

export type SerialPluginArgs<W = World.World<Component.Type>> = {
    fn: BuildFn<W>;
    order?: number;
};

export type SerialPlugin<W = World.World<Component.Type>> = {
    parallel: false;
    fn: BuildFn<W>;
    order: number;
};

export type ParallelPluginArgs<W = World.World<Component.Type>> = {
    fns: BuildFn<W>[];
    order?: number;
};

export type ParallelPlugin<W = World.World<Component.Type>> = {
    parallel: true;
    fns: BuildFn<W>[];
    order: number;
};

export type Plugin<W = World.World<Component.Type>> = SerialPlugin<W> | ParallelPlugin<W>;

export const defaultOrder = 10;

export const isSerial = <W = World.World<Component.Type>>(
    plugin: SerialPlugin<W> | ParallelPlugin<W>,
): plugin is SerialPlugin<W> => !plugin.parallel;

export const isParallel = <W = World.World<Component.Type>>(
    plugin: SerialPlugin<W> | ParallelPlugin<W>,
): plugin is ParallelPlugin<W> => plugin.parallel;

const isParallelArgs = <W = World.World<Component.Type>>(
    args: SerialPluginArgs<W> | ParallelPluginArgs<W>,
): args is ParallelPluginArgs<W> => 'fns' in args;

export const create = <W = World.World<Component.Type>>(
    args: SerialPluginArgs<W> | ParallelPluginArgs<W>,
): Plugin<W> => {
    if (isParallelArgs(args)) {
        return {
            parallel: true,
            fns: args.fns,
            order: args.order ?? defaultOrder,
        };
    }

    return {
        parallel: false,
        fn: args.fn,
        order: args.order ?? defaultOrder,
    };
};
