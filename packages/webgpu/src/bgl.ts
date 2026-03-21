import { createPipelineLayout, defaultVisibility, getWgsl, WithVisibility } from './bgl-helpers';
import {
    BglBufferOptions,
    BglExternalTextureEntry,
    BglLayoutDefinitionGeneric,
    BglReadonlyStorageEntry,
    BglSamplerEntry,
    BglStorageEntry,
    BglStorageTextureEntry,
    BglStorageTypeGeneric,
    BglTextureEntry,
    BglUniformEntry,
    BglUniformTypeGeneric,
    BindgroupLayout,
} from './bgl-types';

export const uniform = <Type extends BglUniformTypeGeneric>(
    type: Type,
    options?: WithVisibility<BglBufferOptions>,
): BglUniformEntry<Type> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'uniform',
        type,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const storage = <Type extends BglStorageTypeGeneric>(
    type: Type,
    options?: WithVisibility<BglBufferOptions>,
): BglStorageEntry<Type> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'storage',
        type,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const readOnlyStorage = <Type extends BglStorageTypeGeneric>(
    type: Type,
    options?: WithVisibility<BglBufferOptions>,
): BglReadonlyStorageEntry<Type> => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'read-only-storage',
        type,
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const sampler = (options?: WithVisibility<GPUSamplerBindingLayout>): BglSamplerEntry => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'sampler',
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const texture = (options?: WithVisibility<GPUTextureBindingLayout>): BglTextureEntry => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'texture',
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const storageTexture = (options: WithVisibility<GPUStorageTextureBindingLayout>): BglStorageTextureEntry => {
    const { visibility, ...remainingOptions } = options;
    return {
        kind: 'storage-texture',
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const externalTexture = (options?: WithVisibility<GPUExternalTextureBindingLayout>): BglExternalTextureEntry => {
    const { visibility, ...remainingOptions } = options ?? {};
    return {
        kind: 'external-texture',
        visibility: visibility ?? defaultVisibility,
        options: remainingOptions,
    };
};

export const layout = <Definiton extends BglLayoutDefinitionGeneric>(
    definition: Definiton,
): BindgroupLayout<Definiton> => {
    return {
        definition,
        wgsl: getWgsl(definition),
        createPipelineLayout: (device) => createPipelineLayout(device, definition),
    };
};
