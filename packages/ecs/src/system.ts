type FnWithoutArgs = (() => unknown) | (() => Promise<unknown>);

type FnWithUpdateArgs =
    | ((delta: number, time: number) => unknown)
    | ((delta: number, time: number) => Promise<unknown>);

type FnMap = {
    startup: FnWithoutArgs;
    'before-update': FnWithUpdateArgs;
    update: FnWithUpdateArgs;
    'after-update': FnWithUpdateArgs;
    render: FnWithoutArgs;
    cleanup: FnWithoutArgs;
};

export type Stage = keyof FnMap;
export type SystemFn<S extends Stage> = FnMap[S];

export type SerialSystemArgs<S extends Stage> = {
    stage: S;
    fn: FnMap[S];
    order?: number;
};

export type SerialSystem<S extends Stage> = {
    stage: S;
    parallel: false;
    fn: FnMap[S];
    order: number;
};

export type ParallelSystemArgs<S extends Stage> = {
    stage: S;
    fns: FnMap[S][];
    order?: number;
};

export type ParallelSystem<S extends Stage> = {
    stage: S;
    parallel: true;
    fns: FnMap[S][];
    order: number;
};

export type System<S extends Stage> = SerialSystem<S> | ParallelSystem<S>;

export const defaultOrder = 10;

export const isSerial = <S extends Stage>(system: SerialSystem<S> | ParallelSystem<S>): system is SerialSystem<S> =>
    !system.parallel;

export const isParallel = <S extends Stage>(system: SerialSystem<S> | ParallelSystem<S>): system is ParallelSystem<S> =>
    system.parallel;

const isParallelArgs = <S extends Stage>(
    args: SerialSystemArgs<S> | ParallelSystemArgs<S>,
): args is ParallelSystemArgs<S> => 'fns' in args;

export const create = <S extends Stage, Args extends SerialSystemArgs<S> | ParallelSystemArgs<S>>(
    args: Args,
): Args extends ParallelSystemArgs<S> ? ParallelSystem<S> : SerialSystem<S> => {
    if (isParallelArgs(args)) {
        return {
            stage: args.stage,
            parallel: true,
            fns: args.fns,
            order: args.order ?? defaultOrder,
        } as never;
    }

    return {
        stage: args.stage,
        parallel: false,
        fn: args.fn,
        order: args.order ?? defaultOrder,
    } as never;
};
