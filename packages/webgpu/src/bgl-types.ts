import { Prettify } from './internal';
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

// --- createGroup types -------------------------------------------------------

export type BglBufferEntry =
    | BglUniformEntry<BglUniformTypeGeneric>
    | BglStorageEntry<BglStorageTypeGeneric>
    | BglReadonlyStorageEntry<BglStorageTypeGeneric>;

type BglNonBufferResourceMap = {
    sampler: GPUSampler;
    texture: GPUTextureView;
    'storage-texture': GPUTextureView;
    'external-texture': GPUExternalTexture;
};

export type BufferKeysOf<Group extends Record<string, BglEntryGeneric>> = {
    [K in keyof Group]: Group[K] extends BglBufferEntry ? K : never;
}[keyof Group];

type NonBufferKeysOf<Group extends Record<string, BglEntryGeneric>> = {
    [K in keyof Group]: Group[K] extends BglBufferEntry ? never : K;
}[keyof Group];

type BglGroupResources<Group extends Record<string, BglEntryGeneric>> = {
    [K in NonBufferKeysOf<Group>]: Group[K] extends { kind: infer Kind }
        ? Kind extends keyof BglNonBufferResourceMap
            ? BglNonBufferResourceMap[Kind]
            : never
        : never;
};

export type BglGroup<Group extends Record<string, BglEntryGeneric>> = {
    buffers: { [K in BufferKeysOf<Group>]: GPUBuffer };
    bindGroup: GPUBindGroup;
    index: number;
};

export type CreateGroup<Def extends BglLayoutDefinitionGeneric> = <G extends string & keyof Def>(
    groupName: G,
    ...args: NonBufferKeysOf<Def[G]> extends never ? [] : [resources: BglGroupResources<Def[G]>]
) => Prettify<BglGroup<Def[G]>>;

export type BglInitResult<Definition extends BglLayoutDefinitionGeneric> = {
    pipelineLayout: GPUPipelineLayout;
    createGroup: CreateGroup<Definition>;
};

// --- layout ------------------------------------------------------------------

export type BindgroupLayout<Definiton extends BglLayoutDefinitionGeneric> = {
    definition: Definiton;
    wgsl: string;
    init: (device: GPUDevice) => BglInitResult<Definiton>;
};
