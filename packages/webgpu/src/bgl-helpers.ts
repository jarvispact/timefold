import {
    BglBufferOptions,
    BglEntryGeneric,
    BglGroup,
    BglSamplerEntry,
    BglStorageTextureEntry,
    BglTextureEntry,
    BglUniformEntryKind,
} from './bgl-types';
import { getTypeStructOrArrayString, isStruct, isRuntimeArray, isWgslPrimitive, WGSL_LOOKUP_TABLE } from './internal';
import { GenericWgslType, WgslStruct, WgslStructDefinitionGeneric } from './wgsl-types';

export type WithVisibility<T> = T & { visibility?: GPUShaderStageFlags };

export const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;

const getUniformOptionsWithTypeAndMinBindingSize = (
    kind: BglUniformEntryKind,
    type: GenericWgslType,
    options: BglBufferOptions,
): GPUBufferBindingLayout => {
    return {
        type: kind,
        minBindingSize: isWgslPrimitive(type) ? WGSL_LOOKUP_TABLE[type].size : type.bufferSize,
        hasDynamicOffset: options.hasDynamicOffset,
    };
};

const viewDimensionToWgsl = (viewDimension: string): string => viewDimension.replace('-', '_');

const sampleTypeToWgslComponent = (sampleType: string): string => {
    if (sampleType === 'sint') return 'i32';
    if (sampleType === 'uint') return 'u32';
    return 'f32';
};

const samplerToDeclaration = (entry: BglSamplerEntry<string>): string => {
    const type = entry.options.type === 'comparison' ? 'sampler_comparison' : 'sampler';
    return `var ${entry.name}: ${type}`;
};

const textureToDeclaration = (entry: BglTextureEntry<string>): string => {
    const sampleType = entry.options.sampleType ?? 'float';
    const viewDimension = viewDimensionToWgsl(entry.options.viewDimension ?? '2d');
    const multisampled = entry.options.multisampled ?? false;

    if (sampleType === 'depth') {
        const suffix = multisampled ? 'multisampled_2d' : viewDimension;
        return `var ${entry.name}: texture_depth_${suffix}`;
    }

    const component = sampleTypeToWgslComponent(sampleType);
    if (multisampled) return `var ${entry.name}: texture_multisampled_2d<${component}>`;
    return `var ${entry.name}: texture_${viewDimension}<${component}>`;
};

const storageTextureAccessToWgsl = (access: string): string => {
    if (access === 'write-only') return 'write';
    if (access === 'read-only') return 'read';
    return 'read_write';
};

const storageTextureToDeclaration = (entry: BglStorageTextureEntry<string>): string => {
    const viewDimension = viewDimensionToWgsl(entry.options.viewDimension ?? '2d');
    const access = storageTextureAccessToWgsl(entry.options.access ?? 'write-only');
    return `var ${entry.name}: texture_storage_${viewDimension}<${entry.options.format}, ${access}>`;
};

const entryToDeclaration = (entry: BglEntryGeneric): string => {
    switch (entry.kind) {
        case 'uniform':
            return `var<uniform> ${entry.name}: ${getTypeStructOrArrayString(entry.type)}`;
        case 'storage':
            return `var<storage, read_write> ${entry.name}: ${getTypeStructOrArrayString(entry.type)}`;
        case 'read-only-storage':
            return `var<storage, read> ${entry.name}: ${getTypeStructOrArrayString(entry.type)}`;
        case 'sampler':
            return samplerToDeclaration(entry);
        case 'texture':
            return textureToDeclaration(entry);
        case 'storage-texture':
            return storageTextureToDeclaration(entry);
        case 'external-texture':
            return `var ${entry.name}: texture_external`;
    }
};

export const entryToBindgroupLayout = (
    entry: BglEntryGeneric,
): Omit<GPUBindGroupLayoutEntry, 'binding' | 'visibility'> => {
    switch (entry.kind) {
        case 'uniform':
        case 'storage':
        case 'read-only-storage':
            return { buffer: getUniformOptionsWithTypeAndMinBindingSize(entry.kind, entry.type, entry.options) };
        case 'sampler':
            return { sampler: entry.options };
        case 'texture':
            return { texture: entry.options };
        case 'storage-texture':
            return { storageTexture: entry.options };
        case 'external-texture':
            return { externalTexture: entry.options };
    }
};

const hasBufferType = (entry: BglEntryGeneric): entry is BglEntryGeneric & { type: GenericWgslType } =>
    entry.kind === 'uniform' || entry.kind === 'storage' || entry.kind === 'read-only-storage';

const collectStructs = (
    type: GenericWgslType,
    seen: Set<string>,
    result: WgslStruct<string, WgslStructDefinitionGeneric>[],
): void => {
    if (isRuntimeArray(type)) {
        collectStructs(type.element as GenericWgslType, seen, result);
        return;
    }

    if (!isStruct(type)) return;

    if (seen.has(type.name)) return;

    for (const key in type.definition) {
        const member = type.definition[key];
        if (!isWgslPrimitive(member)) collectStructs(member as GenericWgslType, seen, result);
    }

    seen.add(type.name);
    result.push(type);
};

export const getWgsl = (groups: BglGroup<BglEntryGeneric[]>[]): string => {
    const seen = new Set<string>();
    const structs: WgslStruct<string, WgslStructDefinitionGeneric>[] = [];

    for (const group of groups) {
        for (const entry of group.entries) {
            if (!hasBufferType(entry)) continue;
            collectStructs(entry.type, seen, structs);
        }
    }

    const deduplicatedStructs = structs.map((struct) => struct.getWgsl()).join('\n\n');

    const groupsAndBindings = groups
        .flatMap((group, groupIdx) => {
            return group.entries.map(
                (entry, bindingIdx) => `@group(${groupIdx}) @binding(${bindingIdx}) ${entryToDeclaration(entry)};`,
            );
        })
        .join('\n');

    return [deduplicatedStructs, groupsAndBindings].filter((s) => s.length > 0).join('\n\n');
};

export const createPipelineLayout = (device: GPUDevice, groups: BglGroup<BglEntryGeneric[]>[]): GPUPipelineLayout => {
    const bindGroupLayouts = groups.map((group) => {
        return device.createBindGroupLayout({
            entries: group.entries.map((entry, entryIdx) => {
                return {
                    binding: entryIdx,
                    visibility: entry.visibility,
                    ...entryToBindgroupLayout(entry),
                };
            }),
        });
    });

    const layout = device.createPipelineLayout({
        bindGroupLayouts,
    });

    return layout;
};
