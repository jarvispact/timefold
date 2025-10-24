import { Component } from './component';
import { GenericEcsEvent } from './event';
import { MergeRules } from './internal';
import { GenericQueries } from './query';
import { GenericResources } from './resource';
import { mergeSystemGraphs, SystemGraph, SystemOrder } from './system';
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

type BuildFn<
    C extends Component = Component,
    E extends GenericEcsEvent = GenericEcsEvent,
    R extends GenericResources = NonNullable<unknown>,
    Q extends GenericQueries<C> = NonNullable<unknown>,
    S extends SystemGraph = DefaultSystemGraph,
> = (world: World<C, E, R, Q, S>, ctx: { resources: R; queries: Q; systemGraph: S }) => void | Promise<void>;

export type PluginBuilderApi<
    C extends Component = Component,
    E extends GenericEcsEvent = GenericEcsEvent,
    R extends GenericResources = NonNullable<unknown>,
    Q extends GenericQueries<C> = NonNullable<unknown>,
    S extends SystemGraph = DefaultSystemGraph,
    UsedMethods extends string = never,
> = Omit<
    {
        withResources: <WR extends GenericResources>(
            resources: WR,
        ) => PluginBuilderApi<C, E, R & WR, Q, S, UsedMethods | 'withResources'>;
        withQueries: <WQ extends GenericQueries>(
            queries: WQ,
        ) => PluginBuilderApi<C, E, R, Q & WQ, S, UsedMethods | 'withQueries'>;
        withSystemGraph: <WSG extends SystemGraph>(
            systemGraph: WSG,
            ...rules: keyof S['systems'] extends never ? [] : [MergeRules<S, WSG>?]
        ) => PluginBuilderApi<C, E, R, Q, SystemGraph<S['systems'] & WSG['systems']>, UsedMethods | 'withSystemGraph'>;
        compile: (fn: BuildFn<C, E, R, Q, S>) => Plugin<C, E, R, Q, S>;
    },
    UsedMethods
>;

export type Plugin<
    C extends Component = Component,
    E extends GenericEcsEvent = GenericEcsEvent,
    R extends GenericResources = NonNullable<unknown>,
    Q extends GenericQueries<C> = NonNullable<unknown>,
    S extends SystemGraph = DefaultSystemGraph,
> = {
    resources: R;
    queries: Q;
    systemGraph: S;
    build: (world: World<C, E, R, Q, S>, ctx: { resources: R; queries: Q; systemGraph: S }) => void | Promise<void>;
};

export function pluginBuilder<C extends Component, E extends GenericEcsEvent = GenericEcsEvent>() {
    const plugin = {
        resources: {},
        queries: {},
        systemGraph: {
            systems: {},
            orderByStage: {
                startup: [],
                update: [],
                render: [],
                cleanup: [],
            },
        },
        build: () => {},
    } as Plugin<C, E, GenericResources, GenericQueries<C>>;

    const api = {
        withResources: (res: GenericResources) => {
            const resourceKeys = Object.keys(res);

            for (let i = 0; i < resourceKeys.length; i++) {
                const resourceKey = resourceKeys[i];
                plugin.resources[resourceKey] = res[resourceKey];
            }

            return api;
        },
        withQueries: (qry: GenericQueries) => {
            const queryKeys = Object.keys(qry);

            for (let i = 0; i < queryKeys.length; i++) {
                const queryKey = queryKeys[i];
                // @ts-expect-error could be instantiated with a different subtype of constraint
                plugin.queries[queryKey] = qry[queryKey];
            }

            return api;
        },
        withSystemGraph: (graph: SystemGraph, mergeRules?: MergeRules<SystemGraph, SystemGraph>) => {
            plugin.systemGraph = mergeSystemGraphs(plugin.systemGraph, graph, mergeRules);
            return api;
        },
        compile: (fn: BuildFn<C, E>) => {
            plugin.build = fn;
            return plugin;
        },
    };

    return api as PluginBuilderApi<C, E>;
}
