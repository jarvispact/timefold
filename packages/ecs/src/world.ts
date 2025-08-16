import type { Component } from './component';
import { Entity } from './entity';
import { isWithAnyItem, isWithItem, isWithoutItem, MapQueryDefinitionToTuple, QueryDefinitionGeneric } from './query';

export type World<
    WorldComponent extends Component,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
> = {
    spawn: (components: WorldComponent[]) => Entity;
    despawn: (id: Entity) => boolean;
    getComponent: <ComponentType extends WorldComponent['type']>(
        entity: Entity,
        componentType: ComponentType,
    ) => Extract<WorldComponent, { type: ComponentType }> | undefined;
    addComponent: (entity: Entity, component: WorldComponent) => boolean;
    removeComponent: (entity: Entity, componentType: WorldComponent['type']) => boolean;
    getResource: <Name extends keyof Resources>(name: Name) => Resources[Name];
    setResource: <Name extends keyof Resources>(name: Name, data: Resources[Name]) => void;
    removeResource: (name: keyof Resources) => void;
    getQuery: <Name extends keyof Queries>(name: Name) => MapQueryDefinitionToTuple<WorldComponent, Queries[Name]>[];
};

export type WorldBuilderApi<
    WorldComponent extends Component,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    UsedMethods extends string = never,
> = Omit<
    {
        defineResources: <Resources extends Record<string, unknown>>(
            resources: Resources,
        ) => WorldBuilderApi<WorldComponent, Resources, Queries, UsedMethods | 'defineResources'>;
        registerQueries: <Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>>>(
            queries: Queries,
        ) => WorldBuilderApi<WorldComponent, Resources, Queries, UsedMethods | 'registerQueries'>;
        compile: () => World<WorldComponent, Resources, Queries>;
    },
    UsedMethods
>;

type InternalQuery = {
    name: string;
    defintion: QueryDefinitionGeneric;
    bitmask: number;
    result: unknown[][];
};

export const worldBuilder = <
    WorldComponent extends Component,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    UsedMethods extends string = never,
>() => {
    const entities: (Record<number, WorldComponent | undefined> | undefined)[] = [];
    let res: Record<string, unknown> = {};
    const _queries: InternalQuery[] = [];
    const nameToQueryIdx: Record<string, number | undefined> = {};

    const api = {
        defineResources: (resources: Record<string, unknown>) => {
            res = resources;
            return api;
        },
        registerQueries: (queries: Record<string, QueryDefinitionGeneric<WorldComponent>>) => {
            const queryKeys = Object.keys(queries);

            for (let i = 0; i < queryKeys.length; i++) {
                const name = queryKeys[i];
                const query = queries[name];

                let bitmask = 0;

                for (let j = 0; j < query.tuple.length; j++) {
                    const queryTuple = query.tuple[j];
                    if (isWithItem(queryTuple)) {
                        bitmask |= 1 << queryTuple.with;
                    } else if (isWithoutItem(queryTuple)) {
                        bitmask |= 1 << queryTuple.without;
                    } else if (isWithAnyItem(queryTuple)) {
                        for (let k = 0; k < queryTuple.withAny.length; k++) {
                            const any = queryTuple.withAny[k];
                            bitmask |= 1 << any;
                        }
                    }
                }

                _queries.push({
                    name,
                    defintion: query,
                    bitmask,
                    result: [],
                });

                nameToQueryIdx[name] = _queries.length - 1;
            }

            return api;
        },
        compile: () => {
            const world = {
                spawn: (components: WorldComponent[]) => {
                    const componentsByType: Record<number, WorldComponent> = {};

                    let bitmask = 0;

                    for (let i = 0; i < components.length; i++) {
                        const component = components[i];
                        componentsByType[component.type] = component;
                        bitmask |= 1 << component.type;
                    }

                    entities.push(componentsByType);
                    const id = entities.length - 1;

                    for (let i = 0; i < _queries.length; i++) {
                        const qry = _queries[i];
                        const hasAllComponents = (bitmask & qry.bitmask) === qry.bitmask;
                        if (hasAllComponents) {
                            const tuple: unknown[] = [];

                            if (qry.defintion.includeEntity) {
                                tuple.push(id);
                            }

                            for (let j = 0; j < qry.defintion.tuple.length; j++) {
                                // TODO
                                const item = qry.defintion.tuple[j] as { with: number };
                                const c = componentsByType[item.with] as WorldComponent | undefined;
                                if (c) tuple.push(c);
                            }

                            qry.result.push(tuple);
                        }
                    }

                    return id;
                },
                despawn: (entity: Entity): boolean => {
                    const entry = entities[entity];
                    if (entry === undefined) return false;
                    entities[entity] = undefined;

                    // TODO: update queries

                    return true;
                },
                getComponent: (entity: Entity, componentType: WorldComponent['type']) => {
                    const entry = entities[entity];
                    if (entry === undefined) return undefined;
                    const component = entry[componentType];
                    return component;
                },
                addComponent: (entity: Entity, component: WorldComponent): boolean => {
                    const entry = entities[entity];
                    if (entry === undefined) return false;
                    if (entry[component.type] !== undefined) return false;
                    entry[component.type] = component;

                    // TODO: update queries

                    return true;
                },
                removeComponent: (entity: Entity, componentType: WorldComponent['type']): boolean => {
                    const entry = entities[entity];
                    if (entry === undefined) return false;
                    const component = entry[componentType];
                    if (component === undefined) return false;
                    entry[componentType] = undefined;

                    // TODO: update queries

                    return true;
                },
                getResource: (name: string) => res[name],
                setResource: (name: string, data: unknown) => {
                    res[name] = data;
                },
                removeResource: (name: string) => {
                    res[name] = undefined;
                },
                getQuery: (name: string) => {
                    const idx = nameToQueryIdx[name];
                    if (idx === undefined) return undefined;
                    return _queries[idx].result;
                },
            };

            return world as unknown as World<WorldComponent, Resources, Queries>;
        },
    };

    return api as unknown as WorldBuilderApi<WorldComponent, Resources, Queries, UsedMethods>;
};
