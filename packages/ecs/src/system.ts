import {
    defaultSystemOrder,
    MergeRules,
    mergeSystemOrder,
    validateSystemOrder,
    warnAboutSingleAsyncSystem,
} from './internal';

export type SystemStage = 'startup' | 'update' | 'render' | 'cleanup';

export type SystemArgs<Stage extends SystemStage = SystemStage> = {
    stage: Stage;
    active?: boolean;
};

export type System<Stage extends SystemStage = SystemStage> = {
    async: false;
    stage: Stage;
    active: boolean;
};

export function defineSystem<Stage extends SystemStage>(systemArgs: SystemArgs<Stage>): System<Stage> {
    return {
        async: false,
        stage: systemArgs.stage,
        active: systemArgs.active ?? true,
    };
}

export type AsyncSystemArgs<Stage extends SystemStage = SystemStage> = {
    stage: Stage;
    active?: boolean;
};

export type AsyncSystem<Stage extends SystemStage = SystemStage> = {
    async: true;
    stage: Stage;
    active: boolean;
};

export function defineAsyncSystem<Stage extends SystemStage>(systemArgs: AsyncSystemArgs<Stage>): AsyncSystem<Stage> {
    return {
        async: true,
        stage: systemArgs.stage,
        active: systemArgs.active ?? true,
    };
}

export type SystemGraphArgs<
    Systems extends Record<string, System | AsyncSystem> = Record<string, System | AsyncSystem>,
    OrderByStage extends Partial<{
        [S in SystemStage]: SystemOrder;
    }> = Partial<{
        [S in SystemStage]: SystemOrder;
    }>,
> = {
    systems: Systems;
    orderByStage?: OrderByStage;
};

export type SystemGraph<
    Systems extends Record<string, System | AsyncSystem> = Record<string, System | AsyncSystem>,
    OrderByStage extends {
        [S in SystemStage]: SystemOrder;
    } = {
        [S in SystemStage]: SystemOrder;
    },
> = {
    systems: Systems;
    orderByStage: OrderByStage;
};

export type SystemNamesForStage<Systems extends Record<string, System | AsyncSystem>, Stage extends SystemStage> = {
    [K in keyof Systems]: [Systems[K]['stage'], Systems[K]['async']] extends [Stage, false] ? K : never;
}[keyof Systems];

export type AsyncSystemNamesForStage<
    Systems extends Record<string, System | AsyncSystem>,
    Stage extends SystemStage,
> = {
    [K in keyof Systems]: [Systems[K]['stage'], Systems[K]['async']] extends [Stage, true] ? K : never;
}[keyof Systems];

export type SystemOrder<
    SystemName extends string | number | symbol = string | number | symbol,
    AsyncSystemName extends string | number | symbol = string | number | symbol,
> = (SystemName | AsyncSystemName | AsyncSystemName[])[];

export function defineSystemGraph<Systems extends Record<string, System | AsyncSystem>>(
    graph: SystemGraphArgs<
        Systems,
        Partial<{
            [S in SystemStage]: SystemOrder<SystemNamesForStage<Systems, S>, AsyncSystemNamesForStage<Systems, S>>;
        }>
    >,
): SystemGraph<
    Systems,
    {
        [S in SystemStage]: SystemOrder<SystemNamesForStage<Systems, S>, AsyncSystemNamesForStage<Systems, S>>;
    }
> {
    const startup = graph.orderByStage?.startup
        ? validateSystemOrder(graph.systems, 'startup', graph.orderByStage.startup)
        : defaultSystemOrder(graph.systems, 'startup');

    const update = graph.orderByStage?.update
        ? validateSystemOrder(graph.systems, 'update', graph.orderByStage.update)
        : defaultSystemOrder(graph.systems, 'update');

    const render = graph.orderByStage?.render
        ? validateSystemOrder(graph.systems, 'render', graph.orderByStage.render)
        : defaultSystemOrder(graph.systems, 'render');

    const cleanup = graph.orderByStage?.cleanup
        ? validateSystemOrder(graph.systems, 'cleanup', graph.orderByStage.cleanup)
        : defaultSystemOrder(graph.systems, 'cleanup');

    warnAboutSingleAsyncSystem('startup', startup);
    warnAboutSingleAsyncSystem('update', update);
    warnAboutSingleAsyncSystem('render', render);
    warnAboutSingleAsyncSystem('cleanup', cleanup);

    return {
        systems: graph.systems,
        orderByStage: {
            startup,
            update,
            render,
            cleanup,
        },
    };
}

export const mergeSystemGraphs = <A extends SystemGraph, B extends SystemGraph>(
    a: A,
    b: B,
    rules?: MergeRules<A, B>,
): SystemGraph<A['systems'] & B['systems']> => {
    const systems = {
        ...a.systems,
        ...b.systems,
    };

    const startupOrderA = a.orderByStage.startup;
    const startupOrderB = b.orderByStage.startup;

    const updateOrderA = a.orderByStage.update;
    const updateOrderB = b.orderByStage.update;

    const renderOrderA = a.orderByStage.render;
    const renderOrderB = b.orderByStage.render;

    const cleanupOrderA = a.orderByStage.cleanup;
    const cleanupOrderB = b.orderByStage.cleanup;

    const mergeRules = rules ?? {};

    return {
        systems,
        orderByStage: {
            startup: mergeSystemOrder(startupOrderA, startupOrderB, mergeRules, systems),
            update: mergeSystemOrder(updateOrderA, updateOrderB, mergeRules, systems),
            render: mergeSystemOrder(renderOrderA, renderOrderB, mergeRules, systems),
            cleanup: mergeSystemOrder(cleanupOrderA, cleanupOrderB, mergeRules, systems),
        },
    };
};

export type DefaultSystemGraph = {
    systems: NonNullable<unknown>;
    orderByStage: {
        startup: SystemOrder;
        update: SystemOrder;
        render: SystemOrder;
        cleanup: SystemOrder;
    };
};

export function createDefaultSystemGraph(): DefaultSystemGraph {
    return {
        systems: {},
        orderByStage: {
            startup: [],
            update: [],
            render: [],
            cleanup: [],
        },
    };
}
