import {
    WgslArrayElementGeneric,
    WgslPrimitive,
    WgslRuntimeArray,
    WgslSizedArray,
    WgslStruct,
    WgslStructDefinitionGeneric,
} from './wgsl-types';

export type BglUniformTypeGeneric =
    | WgslPrimitive
    | WgslStruct<string, WgslStructDefinitionGeneric>
    | WgslSizedArray<WgslArrayElementGeneric, number>;

export type BglStorageTypeGeneric =
    | WgslPrimitive
    | WgslStruct<string, WgslStructDefinitionGeneric>
    | WgslSizedArray<WgslArrayElementGeneric, number>
    | WgslRuntimeArray<WgslArrayElementGeneric>;

export type BglBufferOptions = Omit<GPUBufferBindingLayout, 'type' | 'minBindingSize'>;

export type BglUniformEntry<Type extends BglUniformTypeGeneric> = {
    kind: 'uniform';
    type: Type;
    visibility: number;
    options: BglBufferOptions;
};

export type BglStorageEntry<Type extends BglStorageTypeGeneric> = {
    kind: 'storage';
    type: Type;
    visibility: number;
    options: BglBufferOptions;
};

export type BglReadonlyStorageEntry<Type extends BglStorageTypeGeneric> = {
    kind: 'read-only-storage';
    type: Type;
    visibility: number;
    options: BglBufferOptions;
};

export type BglUniformEntryKind = (
    | BglUniformEntry<BglUniformTypeGeneric>
    | BglStorageEntry<BglStorageTypeGeneric>
    | BglReadonlyStorageEntry<BglStorageTypeGeneric>
)['kind'];

export type BglSamplerEntry = {
    kind: 'sampler';
    visibility: number;
    options: GPUSamplerBindingLayout;
};

export type BglTextureEntry = {
    kind: 'texture';
    visibility: number;
    options: GPUTextureBindingLayout;
};

export type BglStorageTextureEntry = {
    kind: 'storage-texture';
    visibility: number;
    options: GPUStorageTextureBindingLayout;
};

export type BglExternalTextureEntry = {
    kind: 'external-texture';
    visibility: number;
    options: GPUExternalTextureBindingLayout;
};

export type BglEntryGeneric =
    | BglUniformEntry<BglUniformTypeGeneric>
    | BglStorageEntry<BglStorageTypeGeneric>
    | BglReadonlyStorageEntry<BglStorageTypeGeneric>
    | BglSamplerEntry
    | BglTextureEntry
    | BglStorageTextureEntry
    | BglExternalTextureEntry;

export type BglLayoutDefinitionGeneric = Record<string, Record<string, BglEntryGeneric>>;

export type BindgroupLayout<Definiton extends BglLayoutDefinitionGeneric> = {
    definition: Definiton;
    wgsl: string;
    createPipelineLayout: (device: GPUDevice) => GPUPipelineLayout;
};
