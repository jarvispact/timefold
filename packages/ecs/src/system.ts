import { RequireAtLeastOne } from './utils';

export type SystemStage = 'startup' | 'update' | 'render' | 'cleanup';

type SystemArgs<Stage extends SystemStage = SystemStage> = {
    stage: Stage;
    active?: boolean;
    fn: () => void;
};

export type System<Stage extends SystemStage = SystemStage> = {
    async: false;
    stage: Stage;
    active: boolean;
    fn: () => void;
};

export function createSystem<Stage extends SystemStage>(systemArgs: SystemArgs<Stage>): System<Stage> {
    return {
        async: false,
        stage: systemArgs.stage,
        active: systemArgs.active ?? true,
        fn: systemArgs.fn,
    };
}

type AsyncSystemArgs<Stage extends SystemStage = SystemStage> = {
    stage: Stage;
    active?: boolean;
    fn: () => Promise<void>;
};

export type AsyncSystem<Stage extends SystemStage = SystemStage> = {
    async: true;
    stage: Stage;
    active: boolean;
    fn: () => Promise<void>;
};

export function createAsyncSystem<Stage extends SystemStage>(systemArgs: AsyncSystemArgs<Stage>): AsyncSystem<Stage> {
    return {
        async: true,
        stage: systemArgs.stage,
        active: systemArgs.active ?? true,
        fn: systemArgs.fn,
    };
}

export type SystemGraph<Systems, Dependencies> = { systems: Systems; dependencies?: Dependencies };

export type SystemNamesForStage<Systems extends Record<string, System | AsyncSystem>, Stage extends SystemStage> = {
    [K in keyof Systems]: Systems[K]['stage'] extends Stage ? K : never;
}[keyof Systems];

export function defineSystemGraph<Systems extends Record<string, System | AsyncSystem>>(
    graph: SystemGraph<
        Systems,
        Partial<{
            [K in keyof Systems]: RequireAtLeastOne<{
                before?: Exclude<SystemNamesForStage<Systems, Systems[K]['stage']>, K>[];
                after?: Exclude<SystemNamesForStage<Systems, Systems[K]['stage']>, K>[];
            }>;
        }>
    >,
) {
    return graph;
}
