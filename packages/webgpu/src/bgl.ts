import { createPipelineLayout, defaultVisibility, getWgsl, WithVisibility } from './bgl-helpers';
import {
    BglBufferOptions,
    BglEntryGeneric,
    BglExternalTextureEntry,
    BglGroup,
    BglGroups,
    BglReadonlyStorageEntry,
    BglSamplerEntry,
    BglStorageEntry,
    BglStorageTextureEntry,
    BglStorageTypeGeneric,
    BglTextureEntry,
    BglUniformEntry,
    BglUniformTypeGeneric,
} from './bgl-types';

export const uniform = <Type extends BglUniformTypeGeneric, Name extends string>(
    type: Type,
    name: Name,
    options?: WithVisibility<BglBufferOptions>,
): BglUniformEntry<Type, Name> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'uniform',
        type,
        name,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const storage = <Type extends BglStorageTypeGeneric, Name extends string>(
    type: Type,
    name: Name,
    options?: WithVisibility<BglBufferOptions>,
): BglStorageEntry<Type, Name> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'storage',
        type,
        name,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const readOnlyStorage = <Type extends BglStorageTypeGeneric, Name extends string>(
    type: Type,
    name: Name,
    options?: WithVisibility<BglBufferOptions>,
): BglReadonlyStorageEntry<Type, Name> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'read-only-storage',
        type,
        name,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const sampler = <Name extends string>(
    name: Name,
    options?: WithVisibility<GPUSamplerBindingLayout>,
): BglSamplerEntry<Name> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'sampler',
        name,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const texture = <Name extends string>(
    name: Name,
    options?: WithVisibility<GPUTextureBindingLayout>,
): BglTextureEntry<Name> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'texture',
        name,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const storageTexture = <Name extends string>(
    name: Name,
    options: WithVisibility<GPUStorageTextureBindingLayout>,
): BglStorageTextureEntry<Name> => {
    const { visibility, ...remainingOptions } = options;
    return {
        kind: 'storage-texture',
        name,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const externalTexture = <Name extends string>(
    name: Name,
    options?: WithVisibility<GPUExternalTextureBindingLayout>,
): BglExternalTextureEntry<Name> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'external-texture',
        name,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const group = <const Entries extends BglEntryGeneric[]>(entries: Entries): BglGroup<Entries> => ({ entries });

export const groups = <const Groups extends BglGroup<BglEntryGeneric[]>[]>(groups: Groups): BglGroups<Groups> => ({
    groups,
    getWgsl: () => getWgsl(groups),
    createPipelineLayout: (device) => createPipelineLayout(device, groups),
});
