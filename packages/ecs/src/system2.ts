import { objectKeys } from './internal';

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

export type SystemGraph<
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

function warnAboutSingleAsyncSystem<Systems extends Record<string, System | AsyncSystem>>(
    order: (keyof Systems | (keyof Systems)[])[],
    stage: SystemStage,
) {
    const asyncOnly = order.filter((element) => Array.isArray(element) && element.length < 2);
    if (asyncOnly.length > 0) {
        console.warn(
            `Only a single async system in order definition of stage: "${stage}". Consider making the system sync or add another async system.`,
        );
    }
}

function defaultOrder<Systems extends Record<string, System | AsyncSystem>>(
    systems: Systems,
    stage: SystemStage,
): (keyof Systems | (keyof Systems)[])[] {
    const systemNamesForStage = objectKeys(systems).filter((key) => systems[key].stage === stage);
    const syncSystemNames = systemNamesForStage.filter((key) => !systems[key].async);
    const asyncSystemNames = systemNamesForStage.filter((key) => systems[key].async);

    if (syncSystemNames.length === 0 && asyncSystemNames.length === 0) {
        return [];
    }

    if (syncSystemNames.length === 0) {
        return [asyncSystemNames];
    }

    if (asyncSystemNames.length === 0) {
        return syncSystemNames;
    }

    const order: (keyof Systems | (keyof Systems)[])[] = [];
    const firstAsyncSystem = asyncSystemNames[0];
    const idxOfFirstAsyncSystem = systemNamesForStage.findIndex((key) => key === firstAsyncSystem);

    for (let i = 0; i < systemNamesForStage.length; i++) {
        const systemNameForStage = systemNamesForStage[i];

        if (i === idxOfFirstAsyncSystem) {
            order.push(asyncSystemNames);
        } else if (!systems[systemNameForStage].async) {
            order.push(systemNameForStage);
        }
    }

    return order;
}

function validateOrder<Systems extends Record<string, System | AsyncSystem>>(
    systems: Systems,
    stage: SystemStage,
    order: (keyof Systems | (keyof Systems)[])[],
) {
    const systemNamesForStage = objectKeys(systems).filter((key) => systems[key].stage === stage);
    const flatOrderLength = order.flat().length;
    if (flatOrderLength !== systemNamesForStage.length) {
        throw new Error(
            `The order within the same stage must contain all system names exactly once. System count for stage "${stage}": ${systemNamesForStage.length}. Count of flattened order: ${flatOrderLength}`,
        );
    }

    return order;
}

export function defineSystemGraph<Systems extends Record<string, System | AsyncSystem>>(
    graph: SystemGraph<
        Systems,
        Partial<{
            [S in SystemStage]: SystemOrder<SystemNamesForStage<Systems, S>, AsyncSystemNamesForStage<Systems, S>>;
        }>
    >,
): Required<
    SystemGraph<
        Systems,
        {
            [S in SystemStage]: (keyof Systems | (keyof Systems)[])[];
        }
    >
> {
    const startup = graph.orderByStage?.startup
        ? validateOrder(graph.systems, 'startup', graph.orderByStage.startup)
        : defaultOrder(graph.systems, 'startup');

    const update = graph.orderByStage?.update
        ? validateOrder(graph.systems, 'update', graph.orderByStage.update)
        : defaultOrder(graph.systems, 'update');

    const render = graph.orderByStage?.render
        ? validateOrder(graph.systems, 'render', graph.orderByStage.render)
        : defaultOrder(graph.systems, 'render');

    const cleanup = graph.orderByStage?.cleanup
        ? validateOrder(graph.systems, 'cleanup', graph.orderByStage.cleanup)
        : defaultOrder(graph.systems, 'cleanup');

    warnAboutSingleAsyncSystem(startup, 'startup');
    warnAboutSingleAsyncSystem(update, 'update');
    warnAboutSingleAsyncSystem(render, 'render');
    warnAboutSingleAsyncSystem(cleanup, 'cleanup');

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

type MergeRuleBefore<T> = { before: T };
type MergeRuleAfter<T> = { after: T };

type MergeRules<A extends SystemGraph, B extends SystemGraph> = Partial<{
    [K in keyof B['systems']]:
        | MergeRuleBefore<
              | SystemNamesForStage<A['systems'], B['systems'][K]['stage']>
              | AsyncSystemNamesForStage<A['systems'], B['systems'][K]['stage']>
              | SystemNamesForStage<B['systems'], B['systems'][K]['stage']>
              | AsyncSystemNamesForStage<B['systems'], B['systems'][K]['stage']>
          >
        | MergeRuleAfter<
              | SystemNamesForStage<A['systems'], B['systems'][K]['stage']>
              | AsyncSystemNamesForStage<A['systems'], B['systems'][K]['stage']>
              | SystemNamesForStage<B['systems'], B['systems'][K]['stage']>
              | AsyncSystemNamesForStage<B['systems'], B['systems'][K]['stage']>
          >;
}>;

const isMergeRuleBefore = (rule: unknown): rule is MergeRuleBefore<string> =>
    rule !== null && typeof rule === 'object' && 'before' in rule && typeof rule.before === 'string';

const isMergeRuleAfter = (rule: unknown): rule is MergeRuleAfter<string> =>
    rule !== null && typeof rule === 'object' && 'after' in rule && typeof rule.after === 'string';

const flattenWithGroups = (order: SystemOrder) => {
    const result: Array<{ name: string; groupIdx: number; posInGroup: number }> = [];

    order.forEach((item, groupIdx) => {
        if (Array.isArray(item)) {
            item.forEach((name, posInGroup) => {
                result.push({ name: name.toString(), groupIdx, posInGroup });
            });
        } else {
            result.push({ name: item.toString(), groupIdx, posInGroup: 0 });
        }
    });

    return result;
};

// Generated by Claude - Sonnet 4.5
const mergeOrder = (
    a: SystemOrder,
    b: SystemOrder,
    rules: MergeRules<SystemGraph, SystemGraph>,
    systems: Record<string, System | AsyncSystem>,
): SystemOrder => {
    // Flatten to get all system names with their group info
    const flatA = flattenWithGroups(a);
    const flatB = flattenWithGroups(b);

    const isAsync = (name: string) => systems[name].async;

    // Build a merged list respecting rules
    const merged: (string | number | symbol)[] = [];
    const processedB = new Set<string | number | symbol>();

    for (const itemA of flatA) {
        // Find all B items that should go before this A item
        for (const itemB of flatB) {
            if (processedB.has(itemB.name)) continue;

            const rule = rules[itemB.name.toString()];
            if (isMergeRuleBefore(rule) && rule.before === itemA.name) {
                merged.push(itemB.name);
                processedB.add(itemB.name);
            }
        }

        // Add the A item
        merged.push(itemA.name);

        // Find all B items that should go after this A item
        for (const itemB of flatB) {
            if (processedB.has(itemB.name)) continue;

            const rule = rules[itemB.name.toString()];
            if (isMergeRuleAfter(rule) && rule.after === itemA.name) {
                merged.push(itemB.name);
                processedB.add(itemB.name);
            }
        }
    }

    // Add remaining B items that have no rules
    for (const itemB of flatB) {
        if (!processedB.has(itemB.name)) {
            merged.push(itemB.name);
            processedB.add(itemB.name);
        }
    }

    const result: SystemOrder = [];
    let currentGroup: (string | number | symbol)[] | null = null;

    for (const name of merged) {
        const isAsyncA = isAsync(name.toString());
        const isAsyncB = isAsync(name.toString());
        const shouldBeInGroup = isAsyncA || isAsyncB;

        if (shouldBeInGroup) {
            if (currentGroup === null) {
                currentGroup = [name];
                result.push(currentGroup);
            } else {
                currentGroup.push(name);
            }
        } else {
            currentGroup = null;
            result.push(name);
        }
    }

    return result;
};

export const mergeSystemGraphs = <A extends SystemGraph, B extends SystemGraph>(
    a: A,
    b: B,
    rules?: MergeRules<A, B>,
): SystemGraph<A['systems'] & B['systems']> => {
    const systems = {
        ...a.systems,
        ...b.systems,
    };

    const startupOrderA = a.orderByStage?.startup ?? [];
    const startupOrderB = b.orderByStage?.startup ?? [];

    const updateOrderA = a.orderByStage?.update ?? [];
    const updateOrderB = b.orderByStage?.update ?? [];

    const renderOrderA = a.orderByStage?.render ?? [];
    const renderOrderB = b.orderByStage?.render ?? [];

    const cleanupOrderA = a.orderByStage?.cleanup ?? [];
    const cleanupOrderB = b.orderByStage?.cleanup ?? [];

    const mergeRules = rules ?? {};

    return {
        systems,
        orderByStage: {
            startup: mergeOrder(startupOrderA, startupOrderB, mergeRules, systems),
            update: mergeOrder(updateOrderA, updateOrderB, mergeRules, systems),
            render: mergeOrder(renderOrderA, renderOrderB, mergeRules, systems),
            cleanup: mergeOrder(cleanupOrderA, cleanupOrderB, mergeRules, systems),
        },
    };
};
