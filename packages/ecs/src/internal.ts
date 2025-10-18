import { Component } from './component';
import { Entity } from './entity';
import { QueryDefinitionGeneric } from './query';
import {
    AsyncSystem,
    AsyncSystemNamesForStage,
    System,
    SystemGraph,
    SystemNamesForStage,
    SystemOrder,
    SystemStage,
} from './system';

export function arraySwapDelete<Item>(arr: Item[], idx: number) {
    arr[idx] = arr[arr.length - 1];
    return arr.pop();
}

export function objectKeys<Obj extends Record<string, unknown>>(obj: Obj) {
    return Object.keys(obj) as (keyof Obj)[];
}

export type QueryDefinitionItemWith<WorldComponent extends Component> = {
    with: WorldComponent['type'];
};

export type QueryDefinitionItemWithAny<WorldComponent extends Component> = {
    withAny: WorldComponent['type'][];
};

export type QueryDefinitionItemGeneric<WorldComponent extends Component = Component> =
    | QueryDefinitionItemWith<WorldComponent>
    | QueryDefinitionItemWithAny<WorldComponent>;

export function isWithItem<C extends Component>(item: QueryDefinitionItemGeneric): item is QueryDefinitionItemWith<C> {
    return 'with' in item;
}

export function isWithAnyItem<C extends Component>(
    item: QueryDefinitionItemGeneric,
): item is QueryDefinitionItemWithAny<C> {
    return 'withAny' in item;
}

export type Bitmasks = {
    with: [number, number, number, number];
    withAny: [number, number, number, number];
};

export type InternalQuery = {
    name: string;
    defintion: QueryDefinitionGeneric;
    bitmasks: Bitmasks;
    flags: {
        hasWith: boolean;
        hasWithAny: boolean;
    };
    entityToResultIdx: Map<Entity, number>;
    entities: Entity[];
    result: unknown[];
};

export function updateQueriesForSpawnAndAddComponent(
    queries: InternalQuery[],
    entityBitmasks: Bitmasks,
    entity: Entity,
    componentsByType: Map<number, Component>,
) {
    const ew0 = entityBitmasks.with[0];
    const ew1 = entityBitmasks.with[1];
    const ew2 = entityBitmasks.with[2];
    const ew3 = entityBitmasks.with[3];

    const ewa0 = entityBitmasks.withAny[0];
    const ewa1 = entityBitmasks.withAny[1];
    const ewa2 = entityBitmasks.withAny[2];
    const ewa3 = entityBitmasks.withAny[3];

    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];
        if (qry.entityToResultIdx.has(entity)) continue;

        const map = qry.defintion.map as (tuple: unknown[]) => unknown;

        const qw0 = qry.bitmasks.with[0];
        const qw1 = qry.bitmasks.with[1];
        const qw2 = qry.bitmasks.with[2];
        const qw3 = qry.bitmasks.with[3];

        const qwa0 = qry.bitmasks.withAny[0];
        const qwa1 = qry.bitmasks.withAny[1];
        const qwa2 = qry.bitmasks.withAny[2];
        const qwa3 = qry.bitmasks.withAny[3];

        const withSatisfied = qry.flags.hasWith
            ? (ew0 & qw0) === qw0 && (ew1 & qw1) === qw1 && (ew2 & qw2) === qw2 && (ew3 & qw3) === qw3
            : true;

        if (!withSatisfied) continue;

        const withAnySatisfied = qry.flags.hasWithAny
            ? (qwa0 === 0 || (ewa0 & qwa0) !== 0) &&
              (qwa1 === 0 || (ewa1 & qwa1) !== 0) &&
              (qwa2 === 0 || (ewa2 & qwa2) !== 0) &&
              (qwa3 === 0 || (ewa3 & qwa3) !== 0)
            : true;

        if (!withAnySatisfied) continue;

        const tuple: unknown[] = [];

        if (qry.defintion.includeEntity) {
            tuple.push(entity);
        }

        for (let j = 0; j < qry.defintion.tuple.length; j++) {
            const item = qry.defintion.tuple[j];
            if (isWithItem(item)) {
                const c = componentsByType.get(item.with);
                if (c) tuple.push(c);
            } else if (isWithAnyItem(item)) {
                for (let k = 0; k < item.withAny.length; k++) {
                    const element = item.withAny[k];
                    const c = componentsByType.get(element);
                    if (c) {
                        tuple.push(c);
                        break;
                    }
                }
            }
        }

        qry.entities.push(entity);
        const item = map(tuple);
        qry.result.push(item);
        qry.defintion.onAdd(entity, item);
        qry.entityToResultIdx.set(entity, qry.result.length - 1);
    }
}

export function updateQueriesForDespawn(queries: InternalQuery[], entity: Entity) {
    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];

        const idx = qry.entityToResultIdx.get(entity);
        if (idx === undefined) continue;

        const lastIdx = qry.result.length - 1;
        const swappedEntity = qry.entities[lastIdx];

        arraySwapDelete(qry.result, idx);
        arraySwapDelete(qry.entities, idx);
        qry.entityToResultIdx.delete(entity);

        if (idx !== lastIdx) {
            qry.entityToResultIdx.set(swappedEntity, idx);
        }

        qry.defintion.onRemove(entity);
    }
}

export function updateQueriesForRemoveComponent(queries: InternalQuery[], entity: Entity, entityBitmasks: Bitmasks) {
    const ew0 = entityBitmasks.with[0];
    const ew1 = entityBitmasks.with[1];
    const ew2 = entityBitmasks.with[2];
    const ew3 = entityBitmasks.with[3];

    const ewa0 = entityBitmasks.withAny[0];
    const ewa1 = entityBitmasks.withAny[1];
    const ewa2 = entityBitmasks.withAny[2];
    const ewa3 = entityBitmasks.withAny[3];

    for (let i = 0; i < queries.length; i++) {
        const qry = queries[i];

        const qw0 = qry.bitmasks.with[0];
        const qw1 = qry.bitmasks.with[1];
        const qw2 = qry.bitmasks.with[2];
        const qw3 = qry.bitmasks.with[3];

        const qwa0 = qry.bitmasks.withAny[0];
        const qwa1 = qry.bitmasks.withAny[1];
        const qwa2 = qry.bitmasks.withAny[2];
        const qwa3 = qry.bitmasks.withAny[3];

        const withSatisfied = qry.flags.hasWith
            ? (ew0 & qw0) === qw0 && (ew1 & qw1) === qw1 && (ew2 & qw2) === qw2 && (ew3 & qw3) === qw3
            : true;

        const withAnySatisfied = qry.flags.hasWithAny
            ? (ewa0 & qwa0) !== 0 && (ewa1 & qwa1) !== 0 && (ewa2 & qwa2) !== 0 && (ewa3 & qwa3) !== 0
            : true;

        if (!withSatisfied || !withAnySatisfied) {
            const idx = qry.entityToResultIdx.get(entity);
            if (idx === undefined) continue;

            const lastIdx = qry.result.length - 1;
            const swappedEntity = qry.entities[lastIdx];

            arraySwapDelete(qry.result, idx);
            arraySwapDelete(qry.entities, idx);
            qry.entityToResultIdx.delete(entity);

            if (idx !== lastIdx) {
                qry.entityToResultIdx.set(swappedEntity, idx);
            }

            qry.defintion.onRemove(entity);
        }
    }
}

export function warnAboutSingleAsyncSystem<Systems extends Record<string, System | AsyncSystem>, S extends SystemStage>(
    stage: SystemStage,
    order: SystemOrder<SystemNamesForStage<Systems, S>, AsyncSystemNamesForStage<Systems, S>>,
) {
    const asyncOnly = order.filter((element) => Array.isArray(element) && element.length < 2);
    if (asyncOnly.length > 0) {
        console.warn(
            `Only a single async system in order definition of stage: "${stage}". Consider making the system sync or add another async system.`,
        );
    }
}

export function defaultSystemOrder<Systems extends Record<string, System | AsyncSystem>, S extends SystemStage>(
    systems: Systems,
    stage: S,
): SystemOrder<SystemNamesForStage<Systems, S>, AsyncSystemNamesForStage<Systems, S>> {
    type T = SystemOrder<SystemNamesForStage<Systems, S>, AsyncSystemNamesForStage<Systems, S>>;

    const systemNamesForStage = objectKeys(systems).filter((key) => systems[key].stage === stage);
    const syncSystemNames = systemNamesForStage.filter((key) => !systems[key].async);
    const asyncSystemNames = systemNamesForStage.filter((key) => systems[key].async);

    if (syncSystemNames.length === 0 && asyncSystemNames.length === 0) {
        return [];
    }

    if (syncSystemNames.length === 0) {
        return [asyncSystemNames] as T;
    }

    if (asyncSystemNames.length === 0) {
        return syncSystemNames as T;
    }

    const order: T = [];
    const firstAsyncSystem = asyncSystemNames[0];
    const idxOfFirstAsyncSystem = systemNamesForStage.findIndex((key) => key === firstAsyncSystem);

    for (let i = 0; i < systemNamesForStage.length; i++) {
        const systemNameForStage = systemNamesForStage[i];

        if (i === idxOfFirstAsyncSystem) {
            order.push(asyncSystemNames as never);
        } else if (!systems[systemNameForStage].async) {
            order.push(systemNameForStage as never);
        }
    }

    return order;
}

export function validateSystemOrder<Systems extends Record<string, System | AsyncSystem>, S extends SystemStage>(
    systems: Systems,
    stage: S,
    order: SystemOrder<SystemNamesForStage<Systems, S>, AsyncSystemNamesForStage<Systems, S>>,
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

type MergeRuleBefore<T> = { before: T };
type MergeRuleAfter<T> = { after: T };

export type MergeRules<A extends SystemGraph, B extends SystemGraph> = Partial<{
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

function isMergeRuleBefore(rule: unknown): rule is MergeRuleBefore<string> {
    return rule !== null && typeof rule === 'object' && 'before' in rule && typeof rule.before === 'string';
}

function isMergeRuleAfter(rule: unknown): rule is MergeRuleAfter<string> {
    return rule !== null && typeof rule === 'object' && 'after' in rule && typeof rule.after === 'string';
}

function flattenWithGroups(order: SystemOrder) {
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
}

// Generated by Claude - Sonnet 4.5
export function mergeSystemOrder(
    a: SystemOrder,
    b: SystemOrder,
    rules: MergeRules<SystemGraph, SystemGraph>,
    systems: Record<string, System | AsyncSystem>,
): SystemOrder {
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericSystemWithFn = { active: boolean; async: boolean; fn: (...args: any[]) => void | Promise<void> };

export function createDefaultSystemFn(name: string, async: boolean) {
    function defaultSystem() {
        console.warn(`System "${name}" has not been inserted.`);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async function defaultAsyncSystem() {
        console.warn(`AsyncSystem "${name}" has not been inserted.`);
    }

    return async ? defaultAsyncSystem : defaultSystem;
}

export function callSystem(system: GenericSystemWithFn) {
    return system.fn();
}

export function callSystemWithTime(delta: number, time: number) {
    function callFn(system: GenericSystemWithFn) {
        return system.fn(delta, time);
    }

    return callFn;
}

export function isSystemActive(system: GenericSystemWithFn) {
    return system.active;
}
