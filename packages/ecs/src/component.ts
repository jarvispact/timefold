import { Range, Increment, ComponentTypes } from './type-helpers';

const MAX_COMPONENT_TYPES = 128;
type MaxComponentTypes = typeof MAX_COMPONENT_TYPES;
type MaxComponentTypesRange = Range<Increment<MaxComponentTypes>>;

export function defineComponentTypes<const T extends string[]>(
    typeNames: T,
): T['length'] extends MaxComponentTypesRange
    ? ComponentTypes<T>
    : `ERR: Only ${MaxComponentTypes} component types supported.` {
    if (typeNames.length > MAX_COMPONENT_TYPES) return {} as never;

    const componentTypes: Record<string, number> = {};

    for (let i = 0; i < typeNames.length; i++) {
        const key = typeNames[i];
        componentTypes[key] = i;
    }

    return componentTypes as never;
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
