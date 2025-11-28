type BuildTuple<N extends number, Result extends unknown[] = []> = Result['length'] extends N
    ? Result
    : BuildTuple<N, [...Result, unknown]>;

export type Increment<N extends number> = [...BuildTuple<N>, unknown]['length'] extends number
    ? [...BuildTuple<N>, unknown]['length']
    : never;

export type Prettyfy<T extends Record<string, unknown>> = { [K in keyof T]: T[K] } & {};

export type ComponentTypes<
    T extends string[],
    Idx extends number = 0,
    Result extends Record<string, number> = NonNullable<unknown>,
> = T extends [infer Head extends string, ...infer Tail extends string[]]
    ? ComponentTypes<Tail, Increment<Idx>, Result & Record<Head, Idx>>
    : Prettyfy<Result>;
