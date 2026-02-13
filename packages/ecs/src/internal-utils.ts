type BuildTuple<N extends number, Result extends unknown[] = []> = Result['length'] extends N
    ? Result
    : BuildTuple<N, [...Result, unknown]>;

export type Increment<N extends number> = [...BuildTuple<N>, unknown]['length'] extends number
    ? [...BuildTuple<N>, unknown]['length']
    : never;

export type Prettify<T extends Record<string, unknown>> = { [K in keyof T]: T[K] } & {};

export type IndexTupleByName<
    Q extends { name: string }[],
    ByName extends Record<string, unknown> = NonNullable<unknown>,
> = Q extends [infer First extends { name: string }, ...infer Rest extends { name: string }[]]
    ? IndexTupleByName<Rest, ByName & Record<First['name'], First>>
    : ByName;
