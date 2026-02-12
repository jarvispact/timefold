import { Increment, Prettify } from './internal-utils';

type CreateT<
    T extends string[],
    Idx extends number = 0,
    Result extends Record<string, number> = NonNullable<unknown>,
> = T extends [infer Head extends string, ...infer Tail extends string[]]
    ? CreateT<Tail, Increment<Idx>, Result & Record<Head, Idx>>
    : Prettify<Result>;

type CreateByName<T extends string[]> = Prettify<{ [K in T[number]]: K }>;

export const defineComponentTypes = <const Types extends string[]>(Types: Types) => {
    const T = {} as Record<string, number>;
    const ByName = {} as Record<string, string>;

    for (let i = 0; i < Types.length; i++) {
        T[Types[i]] = i;
        ByName[Types[i]] = Types[i];
    }

    return { T, Types, ByName } as {
        T: CreateT<Types>;
        Types: Types;
        ByName: CreateByName<Types>;
    };
};

export type Component<Type extends number = number, Data = undefined> = [Data] extends [undefined]
    ? { type: Type }
    : { type: Type; data: Data };

export const createComponent = <Type extends number, Data = undefined>(type: Type, data?: Data) => {
    return (data === undefined ? { type } : { type, data }) as Component<Type, Data>;
};
