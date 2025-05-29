// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FnWithWorldArg = ((world: any) => unknown) | ((world: any) => Promise<unknown>);

type FnWithoutArgs = (() => unknown) | (() => Promise<unknown>);

type FnWithUpdateArgs =
    | ((delta: number, time: number) => unknown)
    | ((delta: number, time: number) => Promise<unknown>);

type FnMap = {
    startup: FnWithWorldArg;
    'before-update': FnWithUpdateArgs;
    update: FnWithUpdateArgs;
    'after-update': FnWithUpdateArgs;
    render: FnWithoutArgs;
    cleanup: FnWithoutArgs;
};

export type SystemStage = keyof FnMap;
export type SystemFnForStage<S extends SystemStage> = FnMap[S];

export type SerialSystemArgs<S extends SystemStage> = {
    stage: S;
    fn: FnMap[S];
    order?: number;
};

export type SerialSystem<S extends SystemStage> = {
    stage: S;
    parallel: false;
    fn: FnMap[S];
    order: number;
};

export type ParallelSystemArgs<S extends SystemStage> = {
    stage: S;
    fns: FnMap[S][];
    order?: number;
};

export type ParallelSystem<S extends SystemStage> = {
    stage: S;
    parallel: true;
    fns: FnMap[S][];
    order: number;
};

export type EcsSystem<S extends SystemStage> = SerialSystem<S> | ParallelSystem<S>;

const defaultOrder = 10;

export const isSerialSystem = <S extends SystemStage>(
    system: SerialSystem<S> | ParallelSystem<S>,
): system is SerialSystem<S> => !system.parallel;

export const isParallelSystem = <S extends SystemStage>(
    system: SerialSystem<S> | ParallelSystem<S>,
): system is ParallelSystem<S> => system.parallel;

export const createSystem = <S extends SystemStage>(args: SerialSystemArgs<S>): SerialSystem<S> => {
    return {
        stage: args.stage,
        parallel: false,
        fn: args.fn,
        order: args.order ?? defaultOrder,
    };
};

export const createParallelSystem = <S extends SystemStage>(args: ParallelSystemArgs<S>): ParallelSystem<S> => {
    return {
        stage: args.stage,
        parallel: true,
        fns: args.fns,
        order: args.order ?? defaultOrder,
    };
};
