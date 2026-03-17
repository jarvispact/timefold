import { BglBufferOptions, BglEntryGeneric, BglGroup, BglUniformEntryKind } from './bgl-types';
import { getTypeStructOrArrayString, isStruct, isWgslPrimitive, WGSL_LOOKUP_TABLE } from './internal';
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

const entryToDeclaration = (entry: BglEntryGeneric): string => {
    switch (entry.kind) {
        case 'uniform':
            return `var<uniform> ${entry.name}: ${getTypeStructOrArrayString(entry.type)}`;
        default:
            return '';
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

export const getWgsl = (groups: BglGroup<BglEntryGeneric[]>[]): string => {
    const structs = groups
        .flatMap((group) => group.entries.filter((entry) => entry.kind === 'uniform'))
        .filter((u) => isStruct(u.type))
        .map((u) => u.type) as WgslStruct<string, WgslStructDefinitionGeneric>[];

    const byName = structs.reduce<Record<string, WgslStruct<string, WgslStructDefinitionGeneric> | undefined>>(
        (accum, struct) => {
            if (!accum[struct.name]) {
                accum[struct.name] = struct;
            }
            return accum;
        },
        {},
    );

    const deduplicatedStructs = Object.values(byName)
        .map((struct) => struct?.getWgsl())
        .join('\n\n');

    const groupsAndBindings = groups
        .flatMap((group, groupIdx) => {
            return group.entries.map(
                (entry, bindingIdx) => `@group(${groupIdx}) @binding(${bindingIdx}) ${entryToDeclaration(entry)};`,
            );
        })
        .join('\n');

    return [deduplicatedStructs, groupsAndBindings].join('\n\n');
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
