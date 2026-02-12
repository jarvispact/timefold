type BuildTuple<N extends number, Result extends unknown[] = []> = Result['length'] extends N
    ? Result
    : BuildTuple<N, [...Result, unknown]>;

export type Increment<N extends number> = [...BuildTuple<N>, unknown]['length'] extends number
    ? [...BuildTuple<N>, unknown]['length']
    : never;

export type Prettify<T extends Record<string, unknown>> = { [K in keyof T]: T[K] } & {};
