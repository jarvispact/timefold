import { getTypeStructOrArrayString } from './internal';
import { WgslStructDefinitionGeneric } from './wgsl-types';

export const getStructWgsl = (name: string, definition: WgslStructDefinitionGeneric) => {
    const indent = '    ';

    const propertyLines = Object.keys(definition).map((key) => {
        const value = definition[key];
        return `${indent}${key}: ${getTypeStructOrArrayString(value)}`;
    });

    return `struct ${name} {\n${propertyLines.join(',\n')}\n}`;
};
