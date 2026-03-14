/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    getBufferSizeAndViewConfigForRuntimeArray,
    getBufferSizeAndViewConfigForSizedArray,
    getBufferSizeAndViewConfigForStruct,
} from './internal';
import {
    WgslArrayElementGeneric,
    WgslStructGetWgslOptions,
    WgslRuntimeArray,
    WgslSizedArray,
    WgslStruct,
    WgslStructDefinitionGeneric,
} from './wgsl-types';

const getFieldTypeName = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value.type === 'struct') return value.name;
    // sized-array
    return `array<${getFieldTypeName(value.element)}, ${value.size}>`;
};

const collectNestedStructs = (def: Record<string, any>, seen: Set<string>, declarations: string[]) => {
    for (const key in def) {
        const value = def[key];
        if (typeof value === 'string') continue;
        if (value.type === 'struct' && !seen.has(value.name)) {
            collectNestedStructs(value.definition, seen, declarations);
            seen.add(value.name);
            declarations.push(value.getWgsl());
        } else if (value.type === 'sized-array' && typeof value.element !== 'string') {
            if (value.element.type === 'struct' && !seen.has(value.element.name)) {
                collectNestedStructs(value.element.definition, seen, declarations);
                seen.add(value.element.name);
                declarations.push(value.element.getWgsl());
            }
        }
    }
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
            let result = '';

            if (options?.expandNested) {
                const seen = new Set<string>();
                const declarations: string[] = [];
                collectNestedStructs(definition, seen, declarations);
                for (let i = 0; i < declarations.length; i++) {
                    result += declarations[i] + '\n\n';
                }
            }

            result += `struct ${name} {\n`;
            const keys = Object.keys(definition);
            for (let i = 0; i < keys.length; i++) {
                result += `    ${keys[i]}: ${getFieldTypeName(definition[keys[i]])},\n`;
            }
            result += '}';

            return result;
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
