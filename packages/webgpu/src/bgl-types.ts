/* eslint-disable @typescript-eslint/no-explicit-any */

import { WgslPrimitive, WgslRuntimeArray, WgslSizedArray, WgslStruct } from './wgsl-types';

export type BglUniformTypeGeneric = WgslPrimitive | WgslStruct<string, any> | WgslSizedArray<any, number>;

export type BglStorageTypeGeneric =
    | WgslPrimitive
    | WgslStruct<string, any>
    | WgslSizedArray<any, number>
    | WgslRuntimeArray<any>;

export type BglBufferOptions = Omit<GPUBufferBindingLayout, 'type' | 'minBindingSize'>;

export type BglUniformEntry<Type extends BglUniformTypeGeneric, Name extends string> = {
    kind: 'uniform';
    type: Type;
    name: Name;
    visibility: number;
    options: BglBufferOptions;
};

export type BglStorageEntry<Type extends BglStorageTypeGeneric, Name extends string> = {
    kind: 'storage';
    type: Type;
    name: Name;
    visibility: number;
    options: BglBufferOptions;
};

export type BglReadonlyStorageEntry<Type extends BglStorageTypeGeneric, Name extends string> = {
    kind: 'read-only-storage';
    type: Type;
    name: Name;
    visibility: number;
    options: BglBufferOptions;
};

export type BglUniformEntryKind = (
    | BglUniformEntry<BglUniformTypeGeneric, string>
    | BglStorageEntry<BglStorageTypeGeneric, string>
    | BglReadonlyStorageEntry<BglStorageTypeGeneric, string>
)['kind'];

export type BglSamplerEntry<Name extends string> = {
    kind: 'sampler';
    name: Name;
    visibility: number;
    options: GPUSamplerBindingLayout;
};

export type BglTextureEntry<Name extends string> = {
    kind: 'texture';
    name: Name;
    visibility: number;
    options: GPUTextureBindingLayout;
};

export type BglStorageTextureEntry<Name extends string> = {
    kind: 'storage-texture';
    name: Name;
    visibility: number;
    options: GPUStorageTextureBindingLayout;
};

export type BglExternalTextureEntry<Name extends string> = {
    kind: 'external-texture';
    name: Name;
    visibility: number;
    options: GPUExternalTextureBindingLayout;
};

export type BglEntryGeneric =
    | BglUniformEntry<BglUniformTypeGeneric, string>
    | BglStorageEntry<BglStorageTypeGeneric, string>
    | BglReadonlyStorageEntry<BglStorageTypeGeneric, string>
    | BglSamplerEntry<string>
    | BglTextureEntry<string>
    | BglStorageTextureEntry<string>
    | BglExternalTextureEntry<string>;

export type BglGroup<Entries extends BglEntryGeneric[]> = { entries: Entries };

export type BglGroups<Groups extends BglGroup<BglEntryGeneric[]>[]> = {
    groups: Groups;
    getWgsl: () => string;
    createPipelineLayout: (device: GPUDevice) => GPUPipelineLayout;
};
