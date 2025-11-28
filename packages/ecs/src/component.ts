import { ComponentTypes } from './type-helpers';

export function defineComponentTypes<const T extends string[]>(typeNames: T): { T: ComponentTypes<T>; typeNames: T } {
    const T: Record<string, number> = {};

    for (let i = 0; i < typeNames.length; i++) {
        const key = typeNames[i];
        T[key] = i;
    }

    return { T, typeNames } as never;
}

export type Component<ComponentType extends number = number, Data = undefined> = Data extends undefined
    ? { type: ComponentType }
    : { type: ComponentType; data: Data };

export function createComponent<ComponentType extends number = number, Data = undefined>(
    type: ComponentType,
    data?: Data,
) {
    return (data === undefined ? { type } : { type, data }) as Component<ComponentType, Data>;
}
