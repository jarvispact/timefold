/* eslint-disable @typescript-eslint/no-explicit-any */

import { WgslType } from './lookup-table';
import { Array, ArrayElement, isArray } from './wgsl-array';
import { GenericStructDefinition, isStruct, Struct } from './wgsl-struct';
import { Type } from './wgsl-type';

type BindingOptions = {
    /* GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE */
    visibility: number;
};

export type Sampler<Binding extends number> = {
    type: 'sampler';
    layout: { binding: Binding } & BindingOptions & { sampler: GPUSamplerBindingLayout };
};

export const sampler = <Binding extends number>(
    binding: Binding,
    args: BindingOptions & { sampler: GPUSamplerBindingLayout },
): Sampler<Binding> => ({
    type: 'sampler',
    layout: { binding, ...args },
});

export type Texture<Binding extends number> = {
    type: 'texture';
    layout: { binding: Binding } & BindingOptions & { texture: GPUTextureBindingLayout };
};

export const texture = <Binding extends number>(
    binding: Binding,
    args: BindingOptions & { texture: GPUTextureBindingLayout },
): Texture<Binding> => ({
    type: 'texture',
    layout: { binding, ...args },
});

type GenericUniformType = Type<WgslType> | Array<ArrayElement, any> | Struct<string, any>;

export type Buffer<Binding extends number, Type extends GenericUniformType> = {
    type: 'buffer';
    uniformType: Type;
    layout: { binding: Binding } & BindingOptions & { buffer: GPUBufferBindingLayout };
};

export const buffer = <Binding extends number, Type extends GenericUniformType>(
    binding: Binding,
    type: Type,
    args: BindingOptions & { buffer: GPUBufferBindingLayout },
): Buffer<Binding, Type> => ({
    type: 'buffer',
    uniformType: type,
    layout: { binding, ...args },
});

export type GenericBinding = Sampler<number> | Texture<number> | Buffer<number, GenericUniformType>;

export type Group<Group extends number, Bindings extends Record<string, GenericBinding>> = {
    group: Group;
    bindings: Bindings;
    uniformDeclarations: string;
};

export const group = <G extends number, Bindings extends Record<string, GenericBinding>>(
    group: G,
    bindings: Bindings,
): Group<G, Bindings> => {
    const uniformDeclarations = Object.keys(bindings)
        .map((key) => {
            const binding = bindings[key];
            if (binding.type === 'sampler') {
                return `@group(${group}) @binding(${binding.layout.binding}) var ${key}: sampler;`;
            } else if (binding.type === 'texture') {
                const dimension = binding.layout.texture.viewDimension ?? '2d';
                return `@group(${group}) @binding(${binding.layout.binding}) var ${key}: texture_${dimension}<f32>;`;
            } else {
                const type = binding.uniformType.wgsl.type;
                return `@group(${group}) @binding(${binding.layout.binding}) var<uniform> ${key}: ${type};`;
            }
        })
        .join('\n');

    return {
        group,
        bindings,
        uniformDeclarations,
    };
};

const resolveUniqueStructs = (structsByName: Record<string, string>, definition: GenericStructDefinition) => {
    const definitionValues = Object.values(definition);

    for (const definitionValue of definitionValues) {
        if (isStruct(definitionValue)) {
            resolveUniqueStructs(structsByName, definitionValue.definition);
            structsByName[definitionValue.wgsl.type] = definitionValue.wgsl.declaration;
        } else if (isArray(definitionValue)) {
            if (isStruct(definitionValue.element)) {
                resolveUniqueStructs(structsByName, definitionValue.element.definition);
                structsByName[definitionValue.element.wgsl.type] = definitionValue.element.wgsl.declaration;
            }
        }
    }
};

export const getWgslFromGroups = (groups: Group<number, Record<string, GenericBinding>>[]) => {
    const structsByName: Record<string, string> = {};

    for (const group of groups) {
        const bindingValues = Object.values(group.bindings);

        for (const binding of bindingValues) {
            if (binding.type !== 'buffer') continue;
            if (!isStruct(binding.uniformType)) continue;
            resolveUniqueStructs(structsByName, binding.uniformType.definition);
            structsByName[binding.uniformType.wgsl.type] = binding.uniformType.wgsl.declaration;
        }
    }

    const uniqueStructDeclarations = Object.values(structsByName).join('\n\n');
    const uniformDeclarations = groups.map((g) => g.uniformDeclarations).join('\n');

    return `${uniqueStructDeclarations}\n\n${uniformDeclarations}`;
};
