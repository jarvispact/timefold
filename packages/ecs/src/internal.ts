/* eslint-disable @typescript-eslint/no-explicit-any */

export type Prettify<T extends Record<string, unknown>> = { [K in keyof T]: T[K] } & {};

export type RemoveReadonly<T> = { -readonly [K in keyof T]: T[K] };

export type Reverse<T extends unknown[], Result extends unknown[] = []> = T extends [infer Head, ...infer Tail]
    ? Reverse<Tail, [Head, ...Result]>
    : Result;

export type Schema<Uri extends string, Type> = {
    uri: Uri;
    is: (data: unknown) => data is Type;
    serialize: (data: Type) => string;
    deserialize: (data: string) => Type;
};

export type GenericComponentDefinition = { name: string; definition?: Schema<string, any> };
