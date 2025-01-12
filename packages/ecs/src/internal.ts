import * as Component from './component';
import * as Event from './event';
import * as Plugin from './plugin';
import * as System from './system';

export const objectKeys = <Obj extends Record<string, unknown>>(obj: Obj) => Object.keys(obj) as (keyof Obj)[];

export const isPromise = (value: unknown): value is Promise<unknown> =>
    !!value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';

export const arrayOfAll =
    <T>() =>
    <U extends T[]>(array: U & ([T] extends [U[number]] ? unknown : 'Invalid')) =>
        array;

export type ComponentsByType = Record<Component.Type['type'], Component.Type | undefined>;

export type Subscriber = (event: Event.Generic) => void;

export const arraySwapDelete = <Item>(arr: Item[], idx: number) => {
    arr[idx] = arr[arr.length - 1];
    return arr.pop();
};

export const sortPlugin = (a: Plugin.Plugin, b: Plugin.Plugin) => a.order - b.order;

export const sortSystem = (a: System.System<System.Stage>, b: System.System<System.Stage>) => a.order - b.order;

export const callFnWithoutArgs = (fn: () => unknown) => fn();

export const createCallFnWithUpdateArgs =
    (delta: number, time: number) => (fn: (delta: number, time: number) => unknown) =>
        fn(delta, time);

export const runSystemsWithoutArgs = async (systems: System.System<'startup' | 'render'>[]) => {
    for (let i = 0; i < systems.length; i++) {
        const system = systems[i];

        if (System.isParallel(system)) {
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
    (delta: number, time: number) => async (systems: System.System<'before-update' | 'update' | 'after-update'>[]) => {
        const callFnWithUpdateArgs = createCallFnWithUpdateArgs(delta, time);

        for (let i = 0; i < systems.length; i++) {
            const system = systems[i];

            if (System.isParallel(system)) {
                await Promise.allSettled(system.fns.map(callFnWithUpdateArgs));
            } else {
                const maybePromise = system.fn(delta, time);
                if (isPromise(maybePromise)) {
                    await maybePromise;
                }
            }
        }
    };

export const findComponentByTypes = (componentTypes: Component.Type['type'][], components: Component.Type[]) => {
    for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (componentTypes.includes(component.type)) {
            return component;
        }
    }

    return undefined;
};

export const removeComponentByType = (type: Component.Type['type'], components: Component.Type[]) => {
    for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (component.type === type) {
            arraySwapDelete(components, i);
            return;
        }
    }
};
