/* eslint-disable @typescript-eslint/no-explicit-any */

import { isType, Type } from './wgsl-type';
import { Array as WgslArray, ArrayElement, ArrayViews, isArray } from './wgsl-array';
import { WgslType } from './lookup-table';
import {
    ArrayBufferMode,
    createViewsForConfig,
    GenericMode,
    GenericTypedArrayMode,
    NumberTupleMode,
    resolveViewConfigAndBufferSize,
    SharedArrayBufferMode,
    TypedArrayOrTuple,
    ViewConfigEntry,
} from './internal-utils';

type StructDefinitionValue = Type<WgslType> | WgslArray<ArrayElement, any> | Struct<string, any>;
export type GenericStructDefinition = Record<string, StructDefinitionValue>;

export type StructViews<
    Definition extends GenericStructDefinition,
    Buffer extends ArrayBufferLike,
    Mode extends GenericMode,
> = {
    [Key in keyof Definition]: Definition[Key] extends Type<infer T>
        ? TypedArrayOrTuple<T, Buffer, Mode>
        : Definition[Key] extends Struct<string, infer NestedDefinition>
          ? StructViews<NestedDefinition, Buffer, Mode>
          : Definition[Key] extends WgslArray<infer Element, infer Size>
            ? ArrayViews<Element, Size, Buffer, Mode>
            : never;
};

export type CreateResult<
    Definition extends GenericStructDefinition,
    Mode extends GenericMode,
> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; views: StructViews<Definition, ArrayBuffer, ArrayBufferMode> }
    : Mode extends NumberTupleMode
      ? { views: StructViews<Definition, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              views: StructViews<Definition, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : { buffer: ArrayBuffer; views: StructViews<Definition, ArrayBuffer, ArrayBufferMode> };

type StructViewConfig = Record<string, ViewConfigEntry | ViewConfigEntry[] | Record<string, unknown>>;

export type Struct<Name extends string, Definition extends GenericStructDefinition> = {
    name: Name;
    definition: Definition;
    wgsl: { type: string; declaration: string };
    bufferSize: number;
    viewConfig: StructViewConfig;
    create: <Mode extends GenericMode>(args?: { mode?: Mode }) => CreateResult<Definition, Mode>;
    fromBuffer: <Buffer extends ArrayBufferLike>(
        buffer: Buffer,
    ) => StructViews<Definition, Buffer, GenericTypedArrayMode>;
};

export const struct = <Name extends string, Definition extends GenericStructDefinition>(
    name: Name,
    definition: Definition,
): Struct<Name, Definition> => {
    const wgslProperties = Object.keys(definition)
        .map((key) => {
            const value = definition[key];
            if (isType(value)) {
                return `  ${key}: ${value.type},`;
            } else if (isStruct(value)) {
                return `  ${key}: ${value.name},`;
            } else if (isArray(value)) {
                if (isType(value.element)) {
                    return `  ${key}: array<${value.element.type}, ${value.size}>,`;
                } else if (isStruct(value.element)) {
                    return `  ${key}: array<${value.element.name}, ${value.size}>,`;
                }
            }
        })
        .join('\n');

    const declaration = `struct ${name} {\n${wgslProperties}\n}`;

    const result = resolveViewConfigAndBufferSize({}, { definition });

    return {
        name,
        definition,
        wgsl: { type: name, declaration },
        bufferSize: result.bufferSize,
        viewConfig: result.viewConfig as StructViewConfig,
        create: <Mode extends GenericMode>(args?: { mode?: Mode }) => {
            const mode = args?.mode ?? 'array-buffer';

            if (mode === 'number-tuple') {
                const views = createViewsForConfig({}, result.viewConfig, undefined);
                return { views } as unknown as CreateResult<Definition, Mode>;
            }

            const buffer =
                mode === 'shared-array-buffer'
                    ? new SharedArrayBuffer(result.bufferSize)
                    : new ArrayBuffer(result.bufferSize);

            const views = createViewsForConfig({}, result.viewConfig, buffer);
            return { buffer, views } as unknown as CreateResult<Definition, Mode>;
        },
        fromBuffer: <Buffer extends ArrayBufferLike>(buffer: Buffer) =>
            createViewsForConfig({}, result.viewConfig, buffer) as StructViews<
                Definition,
                Buffer,
                GenericTypedArrayMode
            >,
    };
};

export const isStruct = (value: unknown): value is Struct<string, GenericStructDefinition> =>
    typeof value === 'object' &&
    !!value &&
    'name' in value &&
    'definition' in value &&
    typeof value.definition === 'object' &&
    !Array.isArray(value.definition);
