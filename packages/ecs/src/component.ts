/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prettify, RemoveReadonly } from './internal';
import { Schema } from './schema';

export type Component<Type extends string = string, Data = undefined> = Data extends undefined
    ? { type: Type }
    : { type: Type; data: Data };

export const createComponent = <Type extends string, Data = undefined>(type: Type, data?: Data) => {
    return (data === undefined ? { type } : { type, data }) as Component<Type, Data>;
};

export type InferComponents<D extends Record<string, Schema<string, any> | undefined>> = {
    [K in keyof D & string]: D[K] extends Schema<string, infer Type>
        ? Component<K, Prettify<RemoveReadonly<Type>>>
        : Component<K>;
}[keyof D & string];

export const defineComponents = <const D extends Record<string, Schema<string, any> | undefined>>(definitions: D) =>
    definitions;
