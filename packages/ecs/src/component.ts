type TagComponent<Type extends number> = { type: Type };
type DataComponent<Type extends number, Data> = { type: Type; data: Data };

export type Component<Type extends number = number, Data = undefined> = Data extends undefined
    ? TagComponent<Type>
    : DataComponent<Type, Data>;

const createTagComponent = <Type extends number>(type: Type): TagComponent<Type> => ({ type });

const createDataComponent = <Type extends number, Data>(type: Type, data: Data): DataComponent<Type, Data> => ({
    type,
    data,
});

export const createComponent = <Type extends number, Data = undefined>(type: Type, data?: Data) => {
    return (data === undefined ? createTagComponent(type) : createDataComponent(type, data)) as Component<Type, Data>;
};
