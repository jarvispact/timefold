export type Component<ComponentType extends number = number, Data = undefined> = Data extends undefined
    ? { type: ComponentType }
    : { type: ComponentType; data: Data };

export const createComponent = <ComponentType extends number = number, Data = undefined>(
    type: ComponentType,
    data?: Data,
) => (data === undefined ? { type } : { type, data }) as Component<ComponentType, Data>;
