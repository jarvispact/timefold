import { GenericValue, getTypeStructOrArrayString, isSizedArray, isStruct } from './internal';
import { WgslStructDefinitionGeneric, WgslStructGetWgslOptions } from './wgsl-types';

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

export const getStructWgsl = (
    name: string,
    definition: WgslStructDefinitionGeneric,
    options?: WgslStructGetWgslOptions,
) => {
    const indent = '    ';

    const propertyLines = Object.keys(definition).map((key) => {
        const value = definition[key];
        return `${indent}${key}: ${getTypeStructOrArrayString(value)}`;
    });

    const toplevel = `struct ${name} {\n${propertyLines.join(',\n')}\n}`;

    if (options?.expandNested) {
        const nestedStructs = getDeduplicatedNestedStructs(definition).join('\n\n');
        return [nestedStructs, toplevel].join('\n\n');
    }

    return toplevel;
};
