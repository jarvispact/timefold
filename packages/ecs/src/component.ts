export type Type<ComponentType extends string | number = string | number, Data = undefined> = Data extends undefined
    ? { type: ComponentType }
    : { type: ComponentType; data: Data };

export const create = <ComponentType extends string | number = string | number, Data = undefined>(
    type: ComponentType,
    data?: Data,
) => (data === undefined ? { type } : { type, data }) as Type<ComponentType, Data>;
