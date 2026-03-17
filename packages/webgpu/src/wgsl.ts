import {
    getBufferSizeAndViewConfigForRuntimeArray,
    getBufferSizeAndViewConfigForSizedArray,
    getBufferSizeAndViewConfigForStruct,
} from './internal';
import { getStructWgsl } from './wgsl-helpers';
import {
    WgslArrayElementGeneric,
    WgslStructGetWgslOptions,
    WgslRuntimeArray,
    WgslSizedArray,
    WgslStruct,
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

        getWgsl: (options?: WgslStructGetWgslOptions) => getStructWgsl(name, definition, options),
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
    };
};
