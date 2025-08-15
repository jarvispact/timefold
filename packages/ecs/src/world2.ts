import type { Component2 } from './component2';
import { Entity2 } from './entity2';
import type { MappedQuery2, QueryGeneric2 } from './query2';

type World<
    WorldComponent extends Component2,
    Queries extends Record<string, QueryGeneric2<WorldComponent>>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Resources extends Record<string, any> = NonNullable<unknown>,
> = {
    getQuery: <Name extends keyof Queries>(name: Name) => MappedQuery2<WorldComponent, Queries[Name]>;
    getResource: <Name extends keyof Resources>(name: Name) => Resources[Name];
    update: (time: number) => void;
    spawnEntity: (id: Entity2, components: WorldComponent[]) => void;
};

type WorldBuilderApi<
    WorldComponent extends Component2,
    Queries extends Record<string, QueryGeneric2<WorldComponent>> = NonNullable<unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Resources extends Record<string, any> = NonNullable<unknown>,
    UsedMethods extends string = never,
> = Omit<
    {
        defineQueries: <QueryDefinition extends Record<string, QueryGeneric2<WorldComponent>>>(
            queries: QueryDefinition,
        ) => WorldBuilderApi<WorldComponent, QueryDefinition, Resources, UsedMethods | 'defineQueries'>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defineResources: <ResourceDefinition extends Record<string, any>>(
            resources: ResourceDefinition,
        ) => WorldBuilderApi<WorldComponent, Queries, ResourceDefinition, UsedMethods | 'defineResources'>;
        compile: () => World<WorldComponent, Queries, Resources>;
    },
    UsedMethods
>;

const findComponentByTypes = (componentTypes: Component2['type'][], components: Component2[]) => {
    for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (componentTypes.includes(component.type)) {
            return component;
        }
    }

    return undefined;
};

export const worldBuilder2 = <
    WorldComponent extends Component2,
    Queries extends Record<string, QueryGeneric2<WorldComponent>> = NonNullable<unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Resources extends Record<string, any> = NonNullable<unknown>,
    UsedMethods extends string = never,
>() => {
    const queries: {
        name: string;
        queryBitMask: number;
        queryDefinition: QueryGeneric2<WorldComponent>;
        queryResult: unknown[][];
    }[] = [];

    const api = {
        defineQueries: (queryDefinitions: Record<string, QueryGeneric2<WorldComponent>>) => {
            const queryKeys = Object.keys(queryDefinitions);

            for (let i = 0; i < queryKeys.length; i++) {
                const name = queryKeys[i];
                const qry = queryDefinitions[name];
                let queryBitMask = 0;

                for (let j = 0; j < qry.tuple.length; j++) {
                    const tupleItem = qry.tuple[j] as { with: number };
                    queryBitMask |= 1 << tupleItem.with;
                }

                queries.push({
                    name,
                    queryBitMask,
                    queryDefinition: qry,
                    queryResult: [],
                });
            }

            return api;
        },
        compile: () => {
            let then = 0;

            const getDelta = (now: number) => {
                now *= 0.001;
                const delta = now - then;
                then = now;
                return delta;
            };

            const world = {
                getQuery: (name: string) => queries.find((q) => q.name === name),
                update: (time: number) => {
                    const delta = getDelta(time);
                    console.log({ delta });
                },
                spawnEntity: (id: number, components: WorldComponent[]) => {
                    let entityMask = 0;

                    for (let i = 0; i < components.length; i++) {
                        const type = components[i].type;
                        entityMask |= 1 << type;
                    }

                    for (let i = 0; i < queries.length; i++) {
                        const query = queries[i];
                        const hasAllComponents = (entityMask & query.queryBitMask) === query.queryBitMask;
                        // console.log(
                        //     `[Entity: ${id}, Query: ${query.name}]: ${hasAllComponents ? 'Match' : 'No Match'}`,
                        // )

                        if (hasAllComponents) {
                            const tuple: unknown[] = [];

                            if (query.queryDefinition.includeEntity) {
                                tuple.push(id);
                            }

                            for (let j = 0; j < query.queryDefinition.tuple.length; j++) {
                                const item = query.queryDefinition.tuple[j] as { with: number };
                                const c = findComponentByTypes([item.with], components);
                                if (c) tuple.push(c);
                            }

                            query.queryResult.push(tuple);
                        }
                    }
                },
            };

            return world as unknown as World<WorldComponent, Queries, Resources>;
        },
    };

    return api as unknown as WorldBuilderApi<WorldComponent, Queries, Resources, UsedMethods>;
};
