import {
    getBufferSizeAndViewConfigForRuntimeArray,
    getBufferSizeAndViewConfigForSizedArray,
    getBufferSizeAndViewConfigForStruct,
} from './internal';
import { BufferMode, getStructWgsl } from './wgsl-helpers';
import {
    WgslArrayElementGeneric,
    WgslRuntimeArray,
    WgslRuntimeArrayCreateResult,
    WgslSizedArray,
    WgslSizedArrayCreateResult,
    WgslStruct,
    WgslStructCreateResult,
    WgslStructDefinitionGeneric,
} from './wgsl-types';

export const struct = <Name extends string, Definition extends WgslStructDefinitionGeneric>(
    name: Name,
    definition: Definition,
): WgslStruct<Name, Definition> => {
    const { bufferSize, viewConfig } = getBufferSizeAndViewConfigForStruct(definition);
    return {
        type: 'struct',
        name,
        definition,

        bufferSize,
        viewConfig,

        wgsl: getStructWgsl(name, definition),

        create: <Mode extends BufferMode = 'array-buffer'>(
            mode?: Mode,
        ): WgslStructCreateResult<WgslStruct<Name, Definition>, Mode> => {
            console.log(mode);
            return null as never;
        },
    };
};

export const sizedArray = <Element extends WgslArrayElementGeneric, Size extends number>(
    element: Element,
    size: Size,
): WgslSizedArray<Element, Size> => {
    const { bufferSize, viewConfig } = getBufferSizeAndViewConfigForSizedArray(element, size);
    return {
        type: 'sized-array',
        element,
        size,

        bufferSize,
        viewConfig,

        create: <Mode extends BufferMode = 'array-buffer'>(
            mode?: Mode,
        ): WgslSizedArrayCreateResult<WgslSizedArray<Element, Size>, Mode> => {
            console.log(mode);
            return null as never;
        },
    };
};

export const runtimeArray = <Element extends WgslArrayElementGeneric>(
    element: Element,
    maxSize: number,
): WgslRuntimeArray<Element> => {
    const { bufferSize, viewConfig } = getBufferSizeAndViewConfigForRuntimeArray(element, maxSize);
    return {
        type: 'runtime-array',
        element,
        maxSize,

        bufferSize,
        viewConfig,

        create: <Mode extends BufferMode = 'array-buffer'>(
            mode?: Mode,
        ): WgslRuntimeArrayCreateResult<WgslRuntimeArray<Element>, Mode> => {
            console.log(mode);
            return null as never;
        },
    };
};
