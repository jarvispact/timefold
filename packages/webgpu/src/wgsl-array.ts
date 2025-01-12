/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    ArrayBufferMode,
    createViewsForConfig,
    GenericMode,
    GenericTypedArrayMode,
    NumberTupleMode,
    resolveViewConfigAndBufferSize,
    SharedArrayBufferMode,
    Tuple,
    TypedArrayOrTuple,
    ViewConfigEntry,
} from './internal-utils';
import { WgslArrayType } from './lookup-table';
import { Struct, StructViews } from './wgsl-struct';
import { Type } from './wgsl-type';

export type ArrayElement =
    | Type<WgslArrayType>
    | Array<Type<WgslArrayType> | Struct<string, any>, any>
    | Struct<string, any>;

export type ArrayViews<
    Element extends ArrayElement,
    Size extends number,
    Buffer extends ArrayBufferLike,
    Mode extends GenericMode,
> =
    Element extends Type<WgslArrayType>
        ? Tuple<TypedArrayOrTuple<Element['type'], Buffer, Mode>, Size>
        : Element extends Array<infer NestedElement, infer NestedSize extends number>
          ? NestedElement extends Type<WgslArrayType>
              ? Tuple<Tuple<TypedArrayOrTuple<NestedElement['type'], Buffer, Mode>, NestedSize>, Size>
              : NestedElement extends Struct<string, infer NestedDefinition>
                ? Tuple<Tuple<StructViews<NestedDefinition, Buffer, Mode>, NestedSize>, Size>
                : never
          : Element extends Struct<string, infer Definition>
            ? Tuple<StructViews<Definition, Buffer, Mode>, Size>
            : never;

export type CreateResult<
    Element extends ArrayElement,
    Size extends number,
    Mode extends GenericMode,
> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; views: ArrayViews<Element, Size, ArrayBuffer, ArrayBufferMode> }
    : Mode extends NumberTupleMode
      ? { views: ArrayViews<Element, Size, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              views: ArrayViews<Element, Size, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : { buffer: ArrayBuffer; views: ArrayViews<Element, Size, ArrayBuffer, ArrayBufferMode> };

type ArrayViewConfig<Size extends number> = Tuple<
    ViewConfigEntry | Record<string, ViewConfigEntry> | ViewConfigEntry[],
    Size
>;

export type Array<Element extends ArrayElement, Size extends number> = {
    element: Element;
    size: Size;
    wgsl: { type: string };
    bufferSize: number;
    viewConfig: ArrayViewConfig<Size>;
    create: <Mode extends GenericMode>(args?: { mode?: Mode }) => CreateResult<Element, Size, Mode>;
    fromBuffer: <Buffer extends ArrayBufferLike>(
        buffer: Buffer,
    ) => ArrayViews<Element, Size, Buffer, GenericTypedArrayMode>;
};

export const array = <Element extends ArrayElement, Size extends number>(
    element: Element,
    size: Size,
): Array<Element, Size> => {
    const result = resolveViewConfigAndBufferSize([], { element, size });

    return {
        element,
        size,
        wgsl: { type: `array<${element.wgsl.type}, ${size}>` },
        bufferSize: result.bufferSize,
        viewConfig: result.viewConfig as ArrayViewConfig<Size>,
        create: <Mode extends GenericMode>(args?: { mode?: Mode }) => {
            const mode = args?.mode ?? 'array-buffer';

            if (mode === 'number-tuple') {
                const views = createViewsForConfig([], result.viewConfig, undefined);
                return { views } as unknown as CreateResult<Element, Size, Mode>;
            }

            const buffer =
                mode === 'shared-array-buffer'
                    ? new SharedArrayBuffer(result.bufferSize)
                    : new ArrayBuffer(result.bufferSize);

            const views = createViewsForConfig([], result.viewConfig, buffer);
            return { buffer, views } as unknown as CreateResult<Element, Size, Mode>;
        },
        fromBuffer: <Buffer extends ArrayBufferLike>(buffer: Buffer) =>
            createViewsForConfig([], result.viewConfig, buffer) as ArrayViews<
                Element,
                Size,
                Buffer,
                GenericTypedArrayMode
            >,
    };
};

export const isArray = (value: unknown): value is Array<ArrayElement, number> =>
    typeof value === 'object' && !!value && 'element' in value && 'size' in value && typeof value.size === 'number';
