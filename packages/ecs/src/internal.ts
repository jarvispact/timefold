/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { AsyncSystem, System, SystemGraph, SystemNamesForStage, SystemStage } from './system';

export const arraySwapDelete = <Item>(arr: Item[], idx: number) => {
    arr[idx] = arr[arr.length - 1];
    return arr.pop();
};

function resolveSyncSystemNamesForStage<
    Graph extends SystemGraph<
        Record<string, System | AsyncSystem>,
        Record<string, { before?: string[]; after?: string[] }>
    >,
    Stage extends SystemStage,
>(graph: Graph, stage: Stage): SystemNamesForStage<Graph['systems'], Stage>[] {
    // Filter systems belonging to this stage
    const stageSystems = Object.keys(graph.systems).filter((name) => graph.systems[name].stage === stage);

    if (stageSystems.length === 0) return [];

    // Build adjacency list and in-degree count
    const edges = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    for (const name of stageSystems) {
        edges.set(name, new Set());
        inDegree.set(name, 0);
    }

    if (!graph.dependencies) {
        return stageSystems as SystemNamesForStage<Graph['systems'], Stage>[];
    }

    // Process dependencies (only within this stage)
    for (const [system, deps] of Object.entries(graph.dependencies)) {
        if (!stageSystems.includes(system)) continue;

        if (deps.after) {
            for (const before of deps.after) {
                if (stageSystems.includes(before)) {
                    edges.get(before)!.add(system);
                    inDegree.set(system, inDegree.get(system)! + 1);
                }
            }
        }

        if (deps.before) {
            for (const after of deps.before) {
                if (stageSystems.includes(after)) {
                    edges.get(system)!.add(after);
                    inDegree.set(after, inDegree.get(after)! + 1);
                }
            }
        }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: SystemNamesForStage<Graph['systems'], Stage>[] = [];

    for (const [name, degree] of inDegree) {
        if (degree === 0) queue.push(name);
    }

    while (queue.length > 0) {
        const current = queue.shift()!;
        result.push(current as SystemNamesForStage<Graph['systems'], Stage>);

        for (const neighbor of edges.get(current)!) {
            const newDegree = inDegree.get(neighbor)! - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) queue.push(neighbor);
        }
    }

    // Check for cycles
    if (result.length !== stageSystems.length) {
        throw new Error(`Circular dependency detected in ${stage} stage`);
    }

    return result;
}

export function resolveSystemNamesForStage<
    Graph extends SystemGraph<
        Record<string, System | AsyncSystem>,
        Record<string, { before?: string[]; after?: string[] }>
    >,
    Stage extends SystemStage,
>(
    graph: Graph,
    stage: Stage,
): (SystemNamesForStage<Graph['systems'], Stage> | SystemNamesForStage<Graph['systems'], Stage>[])[] {
    const sortedSystems = resolveSyncSystemNamesForStage(graph, stage) as string[];

    const result: (string | string[])[] = [];
    let batch: string[] = [];

    for (const sysName of sortedSystems) {
        const sys = graph.systems[sysName];

        // Flush current batch if this is a sync system
        if (!('async' in sys && sys.async)) {
            if (batch.length) {
                result.push(batch.length === 1 ? batch[0] : [...batch]);
                batch = [];
            }
            result.push(sysName);
            continue;
        }

        // Async system: check if it can be grouped with the current batch
        const canAdd = batch.every((member) => !directDependencyBetween(member, sysName, graph.dependencies));

        if (canAdd) {
            batch.push(sysName);
        } else {
            // Flush current batch and start a new one
            if (batch.length) result.push(batch.length === 1 ? batch[0] : [...batch]);
            batch = [sysName];
        }
    }

    // Flush remaining batch
    if (batch.length) result.push(batch.length === 1 ? batch[0] : [...batch]);

    return result as (SystemNamesForStage<Graph['systems'], Stage> | SystemNamesForStage<Graph['systems'], Stage>[])[];
}

function directDependencyBetween(
    a: string,
    b: string,
    deps: Record<string, { before?: string[]; after?: string[] } | undefined> = {},
): boolean {
    const dA = deps[a] ?? {};
    const dB = deps[b] ?? {};

    // a → b or b → a
    if (dA.before?.includes(b) || dA.after?.includes(b)) return true;
    if (dB.before?.includes(a) || dB.after?.includes(a)) return true;

    return false;
}

type GenericSystemForStage<S extends SystemStage> = System<S> | AsyncSystem<S>;

export function getSortedSystemsByStage(
    graph: SystemGraph<Record<string, System | AsyncSystem>, Record<string, { before?: string[]; after?: string[] }>>,
): {
    systemsByStage: { [S in SystemStage]: (GenericSystemForStage<S> | GenericSystemForStage<S>[])[] };
    nameToStageAndIndex: Record<string, { stage: SystemStage; index: [number] | [number, number] }>;
} {
    const nameToStageAndIndex: Record<string, { stage: SystemStage; index: [number] | [number, number] }> = {};

    function map<SS extends SystemStage>(
        systemName: string | string[],
        idx: number,
    ): (GenericSystemForStage<SS> | GenericSystemForStage<SS>[])[] {
        if (Array.isArray(systemName))
            return systemName.map((n, idx2) => {
                const system = graph.systems[n];
                nameToStageAndIndex[n] = { stage: system.stage, index: [idx, idx2] };
                return system;
            }) as never;

        const system = graph.systems[systemName];
        nameToStageAndIndex[systemName] = { stage: system.stage, index: [idx] };
        return system as never;
    }

    const systemsByStage = {
        startup: resolveSystemNamesForStage(graph, 'startup').map(map) as never,
        update: resolveSystemNamesForStage(graph, 'update').map(map) as never,
        render: resolveSystemNamesForStage(graph, 'render').map(map) as never,
        cleanup: resolveSystemNamesForStage(graph, 'cleanup').map(map) as never,
    };

    return {
        systemsByStage,
        nameToStageAndIndex,
    };
}
