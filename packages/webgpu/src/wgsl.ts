import {
    getBufferSizeAndViewConfigForRuntimeArray,
    getBufferSizeAndViewConfigForSizedArray,
    getBufferSizeAndViewConfigForStruct,
    isSizedArray,
    isStruct,
} from './internal';
import {
    WgslArrayElementGeneric,
    WgslStructGetWgslOptions,
    WgslRuntimeArray,
    WgslSizedArray,
    WgslStruct,
    WgslStructDefinitionGeneric,
} from './wgsl-types';

type GenericValue =
    | string
    | WgslStruct<string, WgslStructDefinitionGeneric>
    | WgslSizedArray<WgslArrayElementGeneric, number>;

const getValueString = (value: GenericValue): string => {
    if (typeof value === 'string') return value;
    if (isStruct(value)) return value.name;
    return `array<${getValueString(value.element)}, ${value.size}>`;
};

const collectNestedStructs = (definition: WgslStructDefinitionGeneric, seen: Set<string>, result: string[]): void => {
    for (const key of Object.keys(definition)) {
        const value = definition[key] as GenericValue;
        const nested = isStruct(value) ? value : isSizedArray(value) && isStruct(value.element) ? value.element : null;
        if (nested === null || seen.has(nested.name)) continue;
        seen.add(nested.name);
        collectNestedStructs(nested.definition, seen, result);
        result.push(nested.getWgsl());
    }
};

const getDeduplicatedNestedStructs = (structDefinition: WgslStructDefinitionGeneric): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    collectNestedStructs(structDefinition, seen, result);
    return result;
};

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

        getWgsl: (options?: WgslStructGetWgslOptions) => {
            const indent = '    ';

            const propertyLines = Object.keys(definition).map((key) => {
                const value = definition[key];
                return `${indent}${key}: ${getValueString(value)}`;
            });

            const toplevel = `struct ${name} {\n${propertyLines.join(',\n')}\n}`;

            if (options?.expandNested) {
                const nestedStructs = getDeduplicatedNestedStructs(definition).join('\n\n');
                return [nestedStructs, toplevel].join('\n\n');
            }

            return toplevel;
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
