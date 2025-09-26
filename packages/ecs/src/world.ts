import type { Component } from './component';
import { Entity } from './entity';
import {
    Bitmasks,
    InternalQuery,
    isWithAnyItem,
    isWithItem,
    MapQueryDefinitionToTuple,
    QueryDefinitionGeneric,
    updateQueriesForDespawn,
    updateQueriesForRemoveComponent,
    updateQueriesForSpawnAndAddComponent,
} from './query';

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
    getQuery: <Name extends keyof Queries>(
        name: Name,
    ) => {
        result: MapQueryDefinitionToTuple<WorldComponent, Queries[Name]>[];
    };
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

export const worldBuilder = <
    WorldComponent extends Component,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    Queries extends Record<string, QueryDefinitionGeneric<WorldComponent>> = NonNullable<unknown>,
    UsedMethods extends string = never,
>() => {
    const entities: (
        | { componentsByType: Record<number, WorldComponent | undefined>; bitmasks: Bitmasks }
        | undefined
    )[] = [];
    let resources: Record<string, unknown> = {};
    const queries: InternalQuery[] = [];
    const nameToQueryIdx: Record<string, number | undefined> = {};

    const api = {
        defineResources: (recordOfResources: Record<string, unknown>) => {
            resources = recordOfResources;
            return api;
        },
        registerQueries: (recordOrQueries: Record<string, QueryDefinitionGeneric<WorldComponent>>) => {
            const queryKeys = Object.keys(recordOrQueries);

            for (let i = 0; i < queryKeys.length; i++) {
                const name = queryKeys[i];
                const query = recordOrQueries[name];

                const bitmasks = {
                    with: 0,
                    withAny: 0,
                };

                const flags = {
                    hasWith: false,
                    hasWithAny: false,
                };

                for (let j = 0; j < query.tuple.length; j++) {
                    const queryTuple = query.tuple[j];
                    if (isWithItem(queryTuple)) {
                        bitmasks.with |= 1 << queryTuple.with;
                        flags.hasWith = true;
                    } else if (isWithAnyItem(queryTuple)) {
                        flags.hasWithAny = true;
                        for (let k = 0; k < queryTuple.withAny.length; k++) {
                            const any = queryTuple.withAny[k];
                            bitmasks.withAny |= 1 << any;
                        }
                    }
                }

                queries.push({
                    name,
                    defintion: query,
                    bitmasks,
                    flags,
                    entityToResultIdx: new Map(),
                    entities: [],
                    result: [],
                    onAdd: [],
                    onRemove: [],
                });

                nameToQueryIdx[name] = queries.length - 1;
            }

            return api;
        },
        compile: () => {
            const world = {
                spawn: (components: WorldComponent[]) => {
                    const componentsByType: Record<number, WorldComponent> = {};

                    const bitmasks = {
                        with: 0,
                        withAny: 0,
                    };

                    for (let i = 0; i < components.length; i++) {
                        const component = components[i];
                        componentsByType[component.type] = component;
                        bitmasks.with |= 1 << component.type;
                        bitmasks.withAny |= 1 << component.type;
                    }

                    entities.push({ componentsByType, bitmasks });
                    const id = entities.length - 1;

                    updateQueriesForSpawnAndAddComponent(queries, bitmasks, id, componentsByType);

                    return id;
                },
                despawn: (entity: Entity): boolean => {
                    const entry = entities[entity];
                    if (entry === undefined) return false;
                    entities[entity] = undefined;

                    updateQueriesForDespawn(queries, entity);

                    return true;
                },
                getComponent: (entity: Entity, componentType: WorldComponent['type']) => {
                    const entry = entities[entity];
                    if (entry === undefined) return undefined;
                    const component = entry.componentsByType[componentType];
                    return component;
                },
                addComponent: (entity: Entity, component: WorldComponent): boolean => {
                    const entry = entities[entity];
                    if (entry === undefined) return false;
                    if (entry.componentsByType[component.type] !== undefined) return false;
                    entry.componentsByType[component.type] = component;

                    entry.bitmasks.with |= 1 << component.type;
                    entry.bitmasks.withAny |= 1 << component.type;

                    updateQueriesForSpawnAndAddComponent(queries, entry.bitmasks, entity, entry.componentsByType);

                    return true;
                },
                removeComponent: (entity: Entity, componentType: WorldComponent['type']): boolean => {
                    const entry = entities[entity];
                    if (entry === undefined) return false;
                    const component = entry.componentsByType[componentType];
                    if (component === undefined) return false;
                    entry.componentsByType[componentType] = undefined;

                    const withBefore = entry.bitmasks.with;
                    const withAnyBefore = entry.bitmasks.withAny;

                    entry.bitmasks.with &= ~(1 << componentType);
                    entry.bitmasks.withAny &= ~(1 << componentType);

                    const withChanged = entry.bitmasks.with !== withBefore;
                    const withAnyChanged = entry.bitmasks.withAny !== withAnyBefore;

                    if (!(withChanged && withAnyChanged)) {
                        return false;
                    }

                    updateQueriesForRemoveComponent(queries, entity, entry.bitmasks);

                    return true;
                },
                getResource: (name: string) => resources[name],
                setResource: (name: string, data: unknown) => {
                    resources[name] = data;
                },
                removeResource: (name: string) => {
                    resources[name] = undefined;
                },
                getQuery: (name: string) => {
                    const idx = nameToQueryIdx[name];
                    if (idx === undefined) return undefined;
                    const qry = queries[idx];

                    return {
                        result: qry.result,
                    };
                },
            };

            return world as unknown as World<WorldComponent, Resources, Queries>;
        },
    };

    return api as unknown as WorldBuilderApi<WorldComponent, Resources, Queries, UsedMethods>;
};
