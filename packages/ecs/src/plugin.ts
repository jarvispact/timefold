import { Component } from './component';
import { GenericEcsEvent } from './event';
import { GenericQueries } from './query';
import { GenericResources } from './resource';
import { SystemGraph, SystemOrder } from './system';
import { World } from './world';

type DefaultSystemGraph = {
    systems: NonNullable<unknown>;
    orderByStage: {
        startup: SystemOrder;
        update: SystemOrder;
        render: SystemOrder;
        cleanup: SystemOrder;
    };
};

export type PluginArgs<
    R extends GenericResources = NonNullable<unknown>,
    Q extends GenericQueries = NonNullable<unknown>,
    S extends SystemGraph = DefaultSystemGraph,
> = {
    resources?: R;
    queries?: Q;
    systemGraph?: S;
    build: (
        world: World<Component, GenericEcsEvent, R, Q, S>,
        ctx: { resources: R; queries: Q; systemGraph: S },
    ) => void | Promise<void>;
};

export type Plugin<
    R extends GenericResources = NonNullable<unknown>,
    Q extends GenericQueries = NonNullable<unknown>,
    S extends SystemGraph = DefaultSystemGraph,
> = {
    resources: R;
    queries: Q;
    systemGraph: S;
    build: (
        world: World<Component, GenericEcsEvent, R, Q, S>,
        ctx: { resources: R; queries: Q; systemGraph: S },
    ) => void | Promise<void>;
};

export function createPlugin<R extends GenericResources, Q extends GenericQueries, S extends SystemGraph>(
    args: PluginArgs<R, Q, S>,
): Plugin<R, Q, S> {
    return {
        resources: args.resources ?? ({} as R),
        queries: args.queries ?? ({} as Q),
        systemGraph:
            args.systemGraph ??
            ({
                systems: {},
                orderByStage: {
                    startup: [] as string[],
                    update: [] as string[],
                    render: [] as string[],
                    cleanup: [] as string[],
                },
            } as S),
        build: args.build,
    };
}
