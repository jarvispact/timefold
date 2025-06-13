/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    ArrayBufferMode,
    FormatMap,
    GenericMode,
    GenericTypedArrayMode,
    IndexFormatToTypedArray,
    NumberTupleMode,
    RemoveNever,
    SharedArrayBufferMode,
    Tuple,
    TupleIndices,
    TypedArrayOrTuple,
    ViewConfigEntry,
    ViewForViewConstructor,
} from './internal-utils';
import { LookupTableEntry, WgslArrayType, WgslPrimitive } from './lookup-table';

// ===========================================================
// wgsl type

export type WgslTypeCreateResult<Mode extends GenericMode, Type extends WgslPrimitive> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; view: TypedArrayOrTuple<Type, ArrayBuffer, ArrayBufferMode> }
    : Mode extends NumberTupleMode
      ? { view: TypedArrayOrTuple<Type, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              view: TypedArrayOrTuple<Type, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : { buffer: ArrayBuffer; view: TypedArrayOrTuple<Type, ArrayBuffer, ArrayBufferMode> };

export type WgslType<T extends WgslPrimitive> = {
    type: T;
    wgsl: { type: string };
    bufferSize: number;
    viewConfig: ViewConfigEntry;
    create: <Mode extends GenericMode>(args?: { mode?: Mode }) => WgslTypeCreateResult<Mode, T>;
    fromBuffer: <Buffer extends ArrayBufferLike>(
        buffer: Buffer,
    ) => ViewForViewConstructor<Buffer>[LookupTableEntry<T>['type']];
};

export type InferWgslTypeResult<T extends WgslType<WgslPrimitive>, Mode extends GenericMode = 'array-buffer'> =
    T extends WgslType<infer WT> ? WgslTypeCreateResult<Mode, WT> : never;

// ===========================================================
// wgsl struct

type StructDefinitionValue = WgslType<WgslPrimitive> | WgslArray<WgslArrayElement, any> | WgslStruct<string, any>;
export type GenericWgslStructDefinition = Record<string, StructDefinitionValue>;

export type WgslStructViews<
    Definition extends GenericWgslStructDefinition,
    Buffer extends ArrayBufferLike,
    Mode extends GenericMode,
> = {
    [Key in keyof Definition]: Definition[Key] extends WgslType<infer T>
        ? TypedArrayOrTuple<T, Buffer, Mode>
        : Definition[Key] extends WgslStruct<string, infer NestedDefinition>
          ? WgslStructViews<NestedDefinition, Buffer, Mode>
          : Definition[Key] extends WgslArray<infer Element, infer Size>
            ? WgslArrayViews<Element, Size, Buffer, Mode>
            : never;
};

export type WgslStructCreateResult<
    Definition extends GenericWgslStructDefinition,
    Mode extends GenericMode,
> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; views: WgslStructViews<Definition, ArrayBuffer, ArrayBufferMode> }
    : Mode extends NumberTupleMode
      ? { views: WgslStructViews<Definition, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              views: WgslStructViews<Definition, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : { buffer: ArrayBuffer; views: WgslStructViews<Definition, ArrayBuffer, ArrayBufferMode> };

export type WgslStructViewConfig = Record<string, ViewConfigEntry | ViewConfigEntry[] | Record<string, unknown>>;

export type WgslStruct<Name extends string, Definition extends GenericWgslStructDefinition> = {
    name: Name;
    definition: Definition;
    wgsl: { type: string; declaration: string };
    bufferSize: number;
    viewConfig: WgslStructViewConfig;
    create: <Mode extends GenericMode>(args?: { mode?: Mode }) => WgslStructCreateResult<Definition, Mode>;
    fromBuffer: <Buffer extends ArrayBufferLike>(
        buffer: Buffer,
    ) => WgslStructViews<Definition, Buffer, GenericTypedArrayMode>;
};

export type InferWgslStructResult<T extends WgslStruct<string, any>, Mode extends GenericMode = 'array-buffer'> =
    T extends WgslStruct<string, infer Definition> ? WgslStructCreateResult<Definition, Mode> : never;

// ===========================================================
// wgsl array

export type WgslArrayElement =
    | WgslType<WgslArrayType>
    | WgslArray<WgslType<WgslArrayType> | WgslStruct<string, any>, any>
    | WgslStruct<string, any>;

export type WgslArrayViews<
    Element extends WgslArrayElement,
    Size extends number,
    Buffer extends ArrayBufferLike,
    Mode extends GenericMode,
> =
    Element extends WgslType<WgslArrayType>
        ? Tuple<TypedArrayOrTuple<Element['type'], Buffer, Mode>, Size>
        : Element extends WgslArray<infer NestedElement, infer NestedSize extends number>
          ? NestedElement extends WgslType<WgslArrayType>
              ? Tuple<Tuple<TypedArrayOrTuple<NestedElement['type'], Buffer, Mode>, NestedSize>, Size>
              : NestedElement extends WgslStruct<string, infer NestedDefinition>
                ? Tuple<Tuple<WgslStructViews<NestedDefinition, Buffer, Mode>, NestedSize>, Size>
                : never
          : Element extends WgslStruct<string, infer Definition>
            ? Tuple<WgslStructViews<Definition, Buffer, Mode>, Size>
            : never;

export type WgslArrayCreateResult<
    Element extends WgslArrayElement,
    Size extends number,
    Mode extends GenericMode,
> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; views: WgslArrayViews<Element, Size, ArrayBuffer, ArrayBufferMode> }
    : Mode extends NumberTupleMode
      ? { views: WgslArrayViews<Element, Size, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              views: WgslArrayViews<Element, Size, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : { buffer: ArrayBuffer; views: WgslArrayViews<Element, Size, ArrayBuffer, ArrayBufferMode> };

export type WgslArrayViewConfig<Size extends number> = Tuple<
    ViewConfigEntry | Record<string, ViewConfigEntry> | ViewConfigEntry[],
    Size
>;

export type WgslArray<Element extends WgslArrayElement, Size extends number> = {
    element: Element;
    size: Size;
    wgsl: { type: string };
    bufferSize: number;
    viewConfig: WgslArrayViewConfig<Size>;
    create: <Mode extends GenericMode>(args?: { mode?: Mode }) => WgslArrayCreateResult<Element, Size, Mode>;
    fromBuffer: <Buffer extends ArrayBufferLike>(
        buffer: Buffer,
    ) => WgslArrayViews<Element, Size, Buffer, GenericTypedArrayMode>;
};

export type InferWgslArrayResult<
    T extends WgslArray<WgslArrayElement, any>,
    Mode extends GenericMode = 'array-buffer',
> = T extends WgslArray<infer Element, infer Size> ? WgslArrayCreateResult<Element, Size, Mode> : never;

// ===========================================================
// uniforms

export type UniformBindingOptions = {
    /* GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE */
    visibility: number;
};

export type SamplerBinding<Binding extends number> = {
    type: 'sampler';
    layout: { binding: Binding } & UniformBindingOptions & { sampler: GPUSamplerBindingLayout };
};

export type TextureBinding<Binding extends number> = {
    type: 'texture';
    layout: { binding: Binding } & UniformBindingOptions & { texture: GPUTextureBindingLayout };
};

export type GenericUniformType = WgslType<WgslPrimitive> | WgslArray<WgslArrayElement, any> | WgslStruct<string, any>;

export type BufferBinding<Binding extends number, Type extends GenericUniformType> = {
    type: 'buffer';
    uniformType: Type;
    layout: { binding: Binding } & UniformBindingOptions & { buffer: GPUBufferBindingLayout };
};

export type GenericBinding =
    | SamplerBinding<number>
    | TextureBinding<number>
    | BufferBinding<number, GenericUniformType>;

export type UniformGroup<Group extends number, Bindings extends Record<string, GenericBinding>> = {
    group: Group;
    bindings: Bindings;
    uniformDeclarations: string;
};

// ===========================================================
// render pass

export type RenderPassDescriptor = Omit<GPURenderPassDescriptor, 'colorAttachments'> & {
    colorAttachments: GPURenderPassColorAttachment[];
};

// ===========================================================
// device and context

export type CreateContextOptions = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    device: GPUDevice;
    contextConfig?: Omit<GPUCanvasConfiguration, 'device'>;
};

export type CreateDeviceOptions = {
    adapter?: GPURequestAdapterOptions;
    device?: GPUDeviceDescriptor;
};

export type CreateDeviceAndContextOptions = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    adapter?: GPURequestAdapterOptions;
    device?: GPUDeviceDescriptor;
    contextConfig?: Omit<GPUCanvasConfiguration, 'device'>;
};

export type CreateDeviceAndContextResult = {
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
};

// ===========================================================
// index buffer

export type CreateIndexBufferArgs<Format extends GPUIndexFormat> = {
    format: Format;
    data: InstanceType<IndexFormatToTypedArray[Format]>;
};

export type CreateIndexBufferResult<Format extends GPUIndexFormat = GPUIndexFormat> = {
    buffer: GPUBuffer;
    count: number;
    format: Format;
};

// ===========================================================
// vertex buffers

export type SupportedFormat = keyof FormatMap;
export type SupportedPositionFormat = 'float32x2' | 'float32x3' | 'float32x4';

export type InterleavedMode = 'interleaved';
export type NonInterleavedMode = 'non-interleaved';
export type CreateVertexBufferMode = InterleavedMode | NonInterleavedMode;

export type CreateVertexBufferLayoutDefinition<Mode extends CreateVertexBufferMode> = Mode extends InterleavedMode
    ? {
          position: { format: SupportedPositionFormat; stride: number };
      } & Record<string, { format: SupportedFormat; stride: number }>
    : {
          position: { format: SupportedPositionFormat };
      } & Record<string, { format: SupportedFormat }>;

export type InterleavedCreateBuffer = (
    device: GPUDevice,
    data: Float32Array,
) => { mode: InterleavedMode; slot: number; buffer: GPUBuffer; count: number };

type NonInterleavedCreateBuffers<Definition extends CreateVertexBufferLayoutDefinition<NonInterleavedMode>> = (
    device: GPUDevice,
    attribs: { [K in keyof Definition]: InstanceType<FormatMap[Definition[K]['format']]['View']> },
) => {
    mode: NonInterleavedMode;
    attribs: {
        [K in keyof Definition]: { slot: number; buffer: GPUBuffer } & (K extends 'position'
            ? { count: number }
            : NonNullable<unknown>);
    };
};

type InterleavedCreateVertexBufferLayoutResult = {
    mode: InterleavedMode;
    layout: GPUVertexBufferLayout[];
    wgsl: string;
    createBuffer: InterleavedCreateBuffer;
};

type NonInterleavedCreateVertexBufferLayoutResult<
    Definition extends CreateVertexBufferLayoutDefinition<NonInterleavedMode>,
> = {
    mode: NonInterleavedMode;
    layout: GPUVertexBufferLayout[];
    wgsl: string;
    createBuffers: NonInterleavedCreateBuffers<Definition>;
};

export type GenericCreateVertexBufferLayoutResult =
    | InterleavedCreateVertexBufferLayoutResult
    | NonInterleavedCreateVertexBufferLayoutResult<
          {
              position: { format: SupportedPositionFormat };
          } & Record<string, { format: SupportedFormat }>
      >;

export type CreateVertexBufferLayoutResult<
    Mode extends CreateVertexBufferMode,
    Definition extends CreateVertexBufferLayoutDefinition<Mode>,
> = Mode extends InterleavedMode
    ? InterleavedCreateVertexBufferLayoutResult
    : NonInterleavedCreateVertexBufferLayoutResult<Definition>;

export type GenericVertexBufferResult =
    | ReturnType<InterleavedCreateBuffer>
    | ReturnType<NonInterleavedCreateBuffers<CreateVertexBufferLayoutDefinition<NonInterleavedMode>>>;

// ===========================================================
// pipeline layout

export type BindingsForGroup<Group extends UniformGroup<number, Record<string, GenericBinding>>> = {
    [BindingKey in keyof Group['bindings']]: Group['bindings'][BindingKey]['type'] extends 'sampler'
        ? GPUSampler
        : Group['bindings'][BindingKey]['type'] extends 'texture'
          ? GPUTexture
          : Group['bindings'][BindingKey]['type'] extends 'buffer'
            ? Omit<GPUBufferDescriptor, 'size'>
            : never;
};

export type BuffersByBindingKey<Group extends UniformGroup<number, Record<string, GenericBinding>>> = RemoveNever<{
    [BindingKey in keyof Group['bindings']]: Group['bindings'][BindingKey]['type'] extends 'buffer' ? GPUBuffer : never;
}>;

export type CreatePipelineLayoutArgs<Groups extends UniformGroup<number, Record<string, GenericBinding>>[]> = {
    device: GPUDevice;
    uniformGroups: Groups;
};

export type CreateBindGroupResult<Group extends UniformGroup<number, Record<string, GenericBinding>>> = {
    group: Group['group'];
    bindGroup: GPUBindGroup;
    buffers: BuffersByBindingKey<Group>;
};

export type CreatePipelineLayoutResult<Groups extends UniformGroup<number, Record<string, GenericBinding>>[]> = {
    layout: GPUPipelineLayout;
    uniformGroups: Groups;
    createBindGroups: <Group extends TupleIndices<Groups>>(
        group: Group,
        bindings: BindingsForGroup<Groups[Group]>,
    ) => CreateBindGroupResult<Groups[Group]>;
};

// TODO: Decide for one variant of the `CreatePipelineLayoutResult` type.
export type CreatePipelineLayoutResult2<Groups extends UniformGroup<number, Record<string, GenericBinding>>[]> = {
    uniformGroups: Groups;
    createLayout: (device: GPUDevice) => GPUPipelineLayout;
    createBindGroups: <Group extends TupleIndices<Groups>>(
        device: GPUDevice,
        group: Group,
        bindings: BindingsForGroup<Groups[Group]>,
    ) => CreateBindGroupResult<Groups[Group]>;
};
