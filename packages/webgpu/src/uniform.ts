import {
    BufferBinding,
    GenericBinding,
    GenericUniformType,
    GenericWgslStructDefinition,
    SamplerBinding,
    TextureBinding,
    UniformBindingOptions,
    UniformGroup,
} from './types';
import { isArray, isStruct } from './wgsl';

const defaultSamplerArgs: UniformBindingOptions & { sampler: GPUSamplerBindingLayout } = {
    visibility: GPUShaderStage.FRAGMENT,
    sampler: {},
};

export const sampler = <Binding extends number>(
    binding: Binding,
    args?: UniformBindingOptions & { sampler?: GPUSamplerBindingLayout },
): SamplerBinding<Binding> => {
    const _args = {
        visibility: args?.visibility ?? defaultSamplerArgs.visibility,
        sampler: { ...defaultSamplerArgs.sampler, ...args?.sampler },
    };

    return {
        type: 'sampler',
        layout: { binding, ..._args },
    };
};

const defaultTextureArgs: UniformBindingOptions & { texture: GPUTextureBindingLayout } = {
    visibility: GPUShaderStage.FRAGMENT,
    texture: {},
};

export const texture = <Binding extends number>(
    binding: Binding,
    args?: UniformBindingOptions & { texture?: GPUTextureBindingLayout },
): TextureBinding<Binding> => {
    const _args = {
        visibility: args?.visibility ?? defaultTextureArgs.visibility,
        texture: { ...defaultTextureArgs.texture, ...args?.texture },
    };

    return {
        type: 'texture',
        layout: { binding, ..._args },
    };
};

const defaultBufferArgs: UniformBindingOptions & { buffer: GPUBufferBindingLayout } = {
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
    buffer: { type: 'uniform' },
};

export const buffer = <Binding extends number, Type extends GenericUniformType>(
    binding: Binding,
    type: Type,
    args?: Partial<UniformBindingOptions> & { buffer?: GPUBufferBindingLayout },
): BufferBinding<Binding, Type> => {
    const _args = {
        visibility: args?.visibility ?? defaultBufferArgs.visibility,
        buffer: { ...defaultBufferArgs.buffer, ...args?.buffer },
    };

    return {
        type: 'buffer',
        uniformType: type,
        layout: { binding, ..._args },
    };
};

export const group = <G extends number, Bindings extends Record<string, GenericBinding>>(
    group: G,
    bindings: Bindings,
): UniformGroup<G, Bindings> => {
    const uniformDeclarations = Object.keys(bindings)
        .map((key) => {
            const binding = bindings[key];
            if (binding.type === 'sampler') {
                const samplerType = binding.layout.sampler.type === 'comparison' ? 'sampler_comparison' : 'sampler';
                return `@group(${group}) @binding(${binding.layout.binding}) var ${key}: ${samplerType};`;
            } else if (binding.type === 'texture') {
                const dimension = binding.layout.texture.viewDimension ?? '2d';
                const sampleType = binding.layout.texture.sampleType;
                const multisampled = binding.layout.texture.multisampled;

                const textureTypeString =
                    sampleType === 'depth'
                        ? `texture_depth${multisampled ? '_multisampled' : ''}_2d`
                        : `texture${multisampled ? '_multisampled' : ''}_${dimension}<f32>`;

                return `@group(${group}) @binding(${binding.layout.binding}) var ${key}: ${textureTypeString};`;
            } else {
                const type = binding.uniformType.wgsl.type;
                const _var = binding.layout.buffer.type === 'uniform' ? 'uniform' : 'storage, read';
                return `@group(${group}) @binding(${binding.layout.binding}) var<${_var}> ${key}: ${type};`;
            }
        })
        .join('\n');

    return {
        group,
        bindings,
        uniformDeclarations,
    };
};

const resolveUniqueStructs = (structsByName: Record<string, string>, definition: GenericWgslStructDefinition) => {
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

export const getWgslFromGroups = (groups: UniformGroup<number, Record<string, GenericBinding>>[]) => {
    const structsByName: Record<string, string> = {};

    for (const group of groups) {
        const bindingValues = Object.values(group.bindings);

        for (const binding of bindingValues) {
            if (binding.type !== 'buffer') continue;
            if (isStruct(binding.uniformType)) {
                resolveUniqueStructs(structsByName, binding.uniformType.definition);
                structsByName[binding.uniformType.wgsl.type] = binding.uniformType.wgsl.declaration;
            } else if (isArray(binding.uniformType)) {
                if (isStruct(binding.uniformType.element)) {
                    resolveUniqueStructs(structsByName, binding.uniformType.element.definition);
                    structsByName[binding.uniformType.element.wgsl.type] = binding.uniformType.element.wgsl.declaration;
                }
            }
        }
    }

    const uniqueStructDeclarations = Object.values(structsByName).join('\n\n');
    const uniformDeclarations = groups.map((g) => g.uniformDeclarations).join('\n');

    return `${uniqueStructDeclarations}\n\n${uniformDeclarations}`;
};
