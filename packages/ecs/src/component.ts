export type Component<ComponentType extends string = string, Data = undefined> = Data extends undefined
    ? { type: ComponentType }
    : { type: ComponentType; data: Data };

export function createComponent<ComponentType extends string = string, Data = undefined>(
    type: ComponentType,
    data?: Data,
) {
    return (data === undefined ? { type } : { type, data }) as Component<ComponentType, Data>;
}
