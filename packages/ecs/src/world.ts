import type { Component } from './component';
import { Entity } from './entity';

type World<WorldComponent extends Component, Resources extends Record<string, unknown> = NonNullable<unknown>> = {
    spawn: (components: WorldComponent[]) => Entity;
    getComponent: <ComponentType extends WorldComponent['type']>(
        entity: Entity,
        componentType: ComponentType,
    ) => Extract<WorldComponent, { type: ComponentType }> | undefined;
    addComponent: (entity: Entity, component: WorldComponent) => boolean;
    removeComponent: (entity: Entity, componentType: WorldComponent['type']) => boolean;
    getResource: <Name extends keyof Resources>(name: Name) => Resources[Name];
    setResource: <Name extends keyof Resources>(name: Name, data: Resources[Name]) => void;
    removeResource: (name: keyof Resources) => void;
};

type WorldBuilderApi<
    WorldComponent extends Component,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    UsedMethods extends string = never,
> = Omit<
    {
        defineResources: <Resources extends Record<string, unknown>>(
            resources: Resources,
        ) => WorldBuilderApi<WorldComponent, Resources, UsedMethods | 'defineResources'>;
        compile: () => World<WorldComponent, Resources>;
    },
    UsedMethods
>;

export const worldBuilder = <
    WorldComponent extends Component,
    Resources extends Record<string, unknown> = NonNullable<unknown>,
    UsedMethods extends string = never,
>() => {
    const entities: (Record<number, WorldComponent | undefined> | undefined)[] = [];
    let resources: Record<string, unknown> = {};

    const api = {
        defineResources: (res: Record<string, unknown>) => {
            resources = res;
            return api;
        },
        compile: () => {
            const world = {
                spawn: (components: WorldComponent[]) => {
                    const componentsByType: Record<number, WorldComponent> = {};

                    for (let i = 0; i < components.length; i++) {
                        const component = components[i];
                        componentsByType[component.type] = component;
                    }

                    entities.push(componentsByType);
                    return entities.length - 1;
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
                    return true;
                },
                removeComponent: (entity: Entity, componentType: WorldComponent['type']): boolean => {
                    const entry = entities[entity];
                    if (entry === undefined) return false;
                    const component = entry[componentType];
                    if (component === undefined) return false;
                    entry[componentType] = undefined;
                    return true;
                },
                getResource: (name: string) => resources[name],
                setResource: (name: string, data: unknown) => {
                    resources[name] = data;
                },
                removeResource: (name: string) => {
                    resources[name] = undefined;
                },
            };

            return world as unknown as World<WorldComponent, Resources>;
        },
    };

    return api as unknown as WorldBuilderApi<WorldComponent, Resources, UsedMethods>;
};
