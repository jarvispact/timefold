export type Component<
    ComponentType extends string | number = string | number,
    Data = undefined,
> = Data extends undefined ? { type: ComponentType } : { type: ComponentType; data: Data };

export const createComponent = <ComponentType extends string | number = string | number, Data = undefined>(
    type: ComponentType,
    data?: Data,
) => (data === undefined ? { type } : { type, data }) as Component<ComponentType, Data>;
