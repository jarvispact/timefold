/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema, Reverse, Prettify, GenericComponentDefinition } from './internal';
import { InferSchemaType } from './schema';

export type Component<Type extends number = number, Data = undefined> = Data extends undefined
    ? { type: Type }
    : { type: Type; data: Data };

export const createComponent = <Type extends number, Data = undefined>(type: Type, data?: Data) => {
    return (data === undefined ? { type } : { type, data }) as Component<Type, Data>;
};

type ByNameEntry<Type extends number, Definition extends GenericComponentDefinition> =
    Definition['definition'] extends Schema<string, any>
        ? {
              type: Type;
              definition: Definition['definition'] extends Schema<string, any> ? Definition['definition'] : undefined;
              create: (
                  data: InferSchemaType<Definition['definition']>,
              ) => Component<Type, InferSchemaType<Definition['definition']>>;
          }
        : {
              type: Type;
              create: () => Component<Type>;
          };

type CreateT<
    DefinitionArray extends GenericComponentDefinition[],
    ReverseDefinitionArray extends GenericComponentDefinition[] = Reverse<DefinitionArray>,
    Result extends Record<string, unknown> = NonNullable<unknown>,
> = ReverseDefinitionArray extends [
    infer Head extends GenericComponentDefinition,
    ...infer Tail extends GenericComponentDefinition[],
]
    ? CreateT<DefinitionArray, Tail, Result & Record<Head['name'], Tail['length']>>
    : Prettify<Result>;

type Registry<
    DefinitionArray extends GenericComponentDefinition[],
    ReverseDefinitionArray extends GenericComponentDefinition[] = Reverse<DefinitionArray>,
    Result extends Record<string, unknown> = NonNullable<unknown>,
> = ReverseDefinitionArray extends [
    infer Head extends GenericComponentDefinition,
    ...infer Tail extends GenericComponentDefinition[],
]
    ? Registry<DefinitionArray, Tail, Result & Record<Head['name'], ByNameEntry<Tail['length'], Head>>>
    : Prettify<Result>;

type ComponentRegistry<ComponentDefinitions extends GenericComponentDefinition[]> = {
    T: CreateT<ComponentDefinitions>;
    components: ComponentDefinitions;
    registry: Registry<ComponentDefinitions>;
};

type InferComponentFromDefinition<Type extends number, Definition extends GenericComponentDefinition> =
    Definition['definition'] extends Schema<string, any>
        ? Component<Type, InferSchemaType<Definition['definition']>>
        : Component<Type>;

export type InferComponents<
    DefinitionArray extends GenericComponentDefinition[],
    ReverseDefinitionArray extends GenericComponentDefinition[] = Reverse<DefinitionArray>,
    Result = never,
> = ReverseDefinitionArray extends [
    infer Head extends GenericComponentDefinition,
    ...infer Tail extends GenericComponentDefinition[],
]
    ? InferComponents<DefinitionArray, Tail, Result | InferComponentFromDefinition<Tail['length'], Head>>
    : Result;

export const componentRegistry = <const ComponentDefinitions extends GenericComponentDefinition[]>(
    components: ComponentDefinitions,
) => {
    const T: Record<string, number> = {};
    const registry: Record<string, unknown> = {};

    for (let i = 0; i < components.length; i++) {
        const def = components[i];
        T[def.name] = i;
        registry[def.name] = {
            type: i,
            definition: def.definition,
            create: (data?: any) => (data === undefined ? createComponent(i) : createComponent(i, data)),
        };
    }

    return { T, components, registry } as ComponentRegistry<ComponentDefinitions>;
};
