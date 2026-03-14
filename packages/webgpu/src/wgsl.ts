import {
    WgslArrayElementGeneric,
    WgslRuntimeArray,
    WgslSizedArray,
    WgslStruct,
    WgslStructDefinitionGeneric,
} from './wgsl-types';

export const struct = <Name extends string, Definition extends WgslStructDefinitionGeneric>(
    name: Name,
    definition: Definition,
): WgslStruct<Name, Definition> => {
    return {
        type: 'struct',
        name,
        definition,
        byteSize: 0, // TODO: compute byteSize
        getWgsl: () => '',
    };
};

export const sizedArray = <Element extends WgslArrayElementGeneric, Size extends number>(
    element: Element,
    size: Size,
): WgslSizedArray<Element, Size> => {
    return {
        type: 'sized-array',
        element,
        size,
        byteSize: 0, // TODO: compute byteSize
        getWgsl: () => '',
    };
};

export const runtimeArray = <Element extends WgslArrayElementGeneric>(
    element: Element,
    maxSize: number,
): WgslRuntimeArray<Element> => {
    return {
        type: 'runtime-array',
        element,
        maxSize,
        byteSize: 0, // TODO: compute byteSize
        getWgsl: () => '',
    };
};
