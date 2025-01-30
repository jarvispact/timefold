import { Component } from './component';
import { GenericEcsEvent } from './event';
import { EcsPlugin } from './plugin';
import { EcsSystem, isParallelSystem, SystemStage } from './system';

export const objectKeys = <Obj extends Record<string, unknown>>(obj: Obj) => Object.keys(obj) as (keyof Obj)[];

export const isPromise = (value: unknown): value is Promise<unknown> =>
    !!value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';

export const arrayOfAll =
    <T>() =>
    <U extends T[]>(array: U & ([T] extends [U[number]] ? unknown : 'Invalid')) =>
        array;

export type ComponentsByType = Record<Component['type'], Component | undefined>;

export type Subscriber = (event: GenericEcsEvent) => void;

export const arraySwapDelete = <Item>(arr: Item[], idx: number) => {
    arr[idx] = arr[arr.length - 1];
    return arr.pop();
};

export const sortPlugin = (a: EcsPlugin, b: EcsPlugin) => a.order - b.order;

export const sortSystem = (a: EcsSystem<SystemStage>, b: EcsSystem<SystemStage>) => a.order - b.order;

export const callFnWithoutArgs = (fn: () => unknown) => fn();

export const createCallFnWithUpdateArgs =
    (delta: number, time: number) => (fn: (delta: number, time: number) => unknown) =>
        fn(delta, time);

export const runSystemsWithoutArgs = async (systems: EcsSystem<'startup' | 'render'>[]) => {
    for (let i = 0; i < systems.length; i++) {
        const system = systems[i];

        if (isParallelSystem(system)) {
            await Promise.allSettled(system.fns.map(callFnWithoutArgs));
        } else {
            const maybePromise = system.fn();
            if (isPromise(maybePromise)) {
                await maybePromise;
            }
        }
    }
};

export const createRunSystemsWithUpdateArgs =
    (delta: number, time: number) => async (systems: EcsSystem<'before-update' | 'update' | 'after-update'>[]) => {
        const callFnWithUpdateArgs = createCallFnWithUpdateArgs(delta, time);

        for (let i = 0; i < systems.length; i++) {
            const system = systems[i];

            if (isParallelSystem(system)) {
                await Promise.allSettled(system.fns.map(callFnWithUpdateArgs));
            } else {
                const maybePromise = system.fn(delta, time);
                if (isPromise(maybePromise)) {
                    await maybePromise;
                }
            }
        }
    };

export const findComponentByTypes = (componentTypes: Component['type'][], components: Component[]) => {
    for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (componentTypes.includes(component.type)) {
            return component;
        }
    }

    return undefined;
};

export const removeComponentByType = (type: Component['type'], components: Component[]) => {
    for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (component.type === type) {
            arraySwapDelete(components, i);
            return;
        }
    }
};
