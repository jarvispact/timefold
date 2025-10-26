/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    ArrayBufferCastedToTupleMode,
    ArrayBufferMode,
    FormatMap,
    GenericMode,
    GenericTypedArrayConstructor,
    GenericTypedArrayMode,
    NumberTupleMode,
    RemoveNever,
    SharedArrayBufferCastedToTupleMode,
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
    ? { buffer: ArrayBuffer; view: TypedArrayOrTuple<Type, ArrayBuffer, NumberTupleMode> }
    : Mode extends NumberTupleMode
      ? { view: TypedArrayOrTuple<Type, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              view: TypedArrayOrTuple<Type, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : Mode extends SharedArrayBufferCastedToTupleMode
          ? {
                buffer: SharedArrayBuffer;
                view: TypedArrayOrTuple<Type, SharedArrayBuffer, NumberTupleMode>;
            }
          : Mode extends ArrayBufferCastedToTupleMode
            ? { buffer: ArrayBuffer; view: TypedArrayOrTuple<Type, ArrayBuffer, NumberTupleMode> }
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

export type InferWgslTypeResult<
    T extends WgslType<WgslPrimitive>,
    Mode extends GenericMode = 'array-buffer-casted-to-tuple',
> = T extends WgslType<infer WT> ? WgslTypeCreateResult<Mode, WT> : never;

// ===========================================================
// wgsl struct

type StructDefinitionValue =
    | WgslType<WgslPrimitive>
    | FixedSizeWgslArray<WgslArrayElement, any>
    | WgslStruct<string, any>;
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
          : Definition[Key] extends FixedSizeWgslArray<infer Element, infer Size>
            ? WgslArrayViews<Element, Size, Buffer, Mode>
            : never;
};

export type WgslStructCreateResult<
    Definition extends GenericWgslStructDefinition,
    Mode extends GenericMode,
> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; views: WgslStructViews<Definition, ArrayBuffer, NumberTupleMode> }
    : Mode extends NumberTupleMode
      ? { views: WgslStructViews<Definition, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              views: WgslStructViews<Definition, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : Mode extends SharedArrayBufferCastedToTupleMode
          ? {
                buffer: SharedArrayBuffer;
                views: WgslStructViews<Definition, SharedArrayBuffer, NumberTupleMode>;
            }
          : Mode extends ArrayBufferCastedToTupleMode
            ? { buffer: ArrayBuffer; views: WgslStructViews<Definition, ArrayBuffer, NumberTupleMode> }
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

export type InferWgslStructResult<
    T extends WgslStruct<string, any>,
    Mode extends GenericMode = 'array-buffer-casted-to-tuple',
> = T extends WgslStruct<string, infer Definition> ? WgslStructCreateResult<Definition, Mode> : never;

// ===========================================================
// wgsl array

export type WgslArrayElement =
    | WgslType<WgslArrayType>
    | FixedSizeWgslArray<WgslType<WgslArrayType> | WgslStruct<string, any>, any>
    | WgslStruct<string, any>;

export type WgslArrayViews<
    Element extends WgslArrayElement,
    Size extends number | 'dynamic',
    Buffer extends ArrayBufferLike,
    Mode extends GenericMode,
> =
    Element extends WgslType<WgslArrayType>
        ? Size extends number
            ? Tuple<TypedArrayOrTuple<Element['type'], Buffer, Mode>, Size>
            : TypedArrayOrTuple<Element['type'], Buffer, Mode>[]
        : Element extends FixedSizeWgslArray<infer NestedElement, infer NestedSize extends number>
          ? NestedElement extends WgslType<WgslArrayType>
              ? Size extends number
                  ? Tuple<Tuple<TypedArrayOrTuple<NestedElement['type'], Buffer, Mode>, NestedSize>, Size>
                  : Tuple<TypedArrayOrTuple<NestedElement['type'], Buffer, Mode>, NestedSize>[]
              : NestedElement extends WgslStruct<string, infer NestedDefinition>
                ? Size extends number
                    ? Tuple<Tuple<WgslStructViews<NestedDefinition, Buffer, Mode>, NestedSize>, Size>
                    : Tuple<WgslStructViews<NestedDefinition, Buffer, Mode>, NestedSize>[]
                : never
          : Element extends WgslStruct<string, infer Definition>
            ? Size extends number
                ? Tuple<WgslStructViews<Definition, Buffer, Mode>, Size>
                : WgslStructViews<Definition, Buffer, Mode>[]
            : never;

export type WgslArrayCreateResult<
    Element extends WgslArrayElement,
    Size extends number | 'dynamic',
    Mode extends GenericMode,
> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; views: WgslArrayViews<Element, Size, ArrayBuffer, NumberTupleMode> }
    : Mode extends NumberTupleMode
      ? { views: WgslArrayViews<Element, Size, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              views: WgslArrayViews<Element, Size, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : Mode extends SharedArrayBufferCastedToTupleMode
          ? {
                buffer: SharedArrayBuffer;
                views: WgslArrayViews<Element, Size, SharedArrayBuffer, NumberTupleMode>;
            }
          : Mode extends ArrayBufferCastedToTupleMode
            ? {
                  buffer: ArrayBuffer;
                  views: WgslArrayViews<Element, Size, ArrayBuffer, NumberTupleMode>;
              }
            : {
                  buffer: ArrayBuffer;
                  views: WgslArrayViews<Element, Size, ArrayBuffer, ArrayBufferMode>;
              };

export type WgslArrayViewConfig<Size extends number> = Tuple<
    ViewConfigEntry | Record<string, ViewConfigEntry> | ViewConfigEntry[],
    Size
>;

export type FixedSizeWgslArray<Element extends WgslArrayElement, Size extends number> = {
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

export type RuntimeSizedWgslArray<Element extends WgslArrayElement> = {
    element: Element;
    wgsl: { type: string };
    bufferSize: number;
    viewConfig: (ViewConfigEntry | Record<string, ViewConfigEntry> | ViewConfigEntry[])[];
    create: <Mode extends GenericMode>(args?: { mode?: Mode }) => WgslArrayCreateResult<Element, 'dynamic', Mode>;
    fromBuffer: <Buffer extends ArrayBufferLike>(
        buffer: Buffer,
    ) => WgslArrayViews<Element, 'dynamic', Buffer, GenericTypedArrayMode>;
};

export type InferWgslArrayResult<
    T extends FixedSizeWgslArray<WgslArrayElement, any> | RuntimeSizedWgslArray<WgslArrayElement>,
    Mode extends GenericMode = 'array-buffer-casted-to-tuple',
> =
    T extends FixedSizeWgslArray<infer Element, infer Size>
        ? WgslArrayCreateResult<Element, Size, Mode>
        : T extends RuntimeSizedWgslArray<infer Element>
          ? WgslArrayCreateResult<Element, 'dynamic', Mode>
          : never;

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

export type GenericUniformType =
    | WgslType<WgslPrimitive>
    | FixedSizeWgslArray<WgslArrayElement, any>
    | RuntimeSizedWgslArray<WgslArrayElement>
    | WgslStruct<string, any>;

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

export type IndexFormatToTypedArray<
    Format extends GPUIndexFormat,
    T extends ArrayBufferLike = ArrayBufferLike,
> = Format extends 'uint16' ? Uint16Array<T> : Uint32Array<T>;

export type GenericIndexBufferTypedArray<T extends ArrayBufferLike = ArrayBufferLike> = Uint16Array<T> | Uint32Array<T>;

export type CreateIndexBufferArgs<Format extends GPUIndexFormat> = {
    format: Format;
    data: IndexFormatToTypedArray<Format, ArrayBuffer>;
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

type TypedArrayWithBuffer<
    TArray extends GenericTypedArrayConstructor,
    TBuffer extends ArrayBufferLike,
> = TArray extends Int8ArrayConstructor
    ? Int8Array<TBuffer>
    : TArray extends Uint8ArrayConstructor
      ? Uint8Array<TBuffer>
      : TArray extends Int16ArrayConstructor
        ? Int16Array<TBuffer>
        : TArray extends Uint16ArrayConstructor
          ? Uint16Array<TBuffer>
          : TArray extends Int32ArrayConstructor
            ? Int32Array<TBuffer>
            : TArray extends Uint32ArrayConstructor
              ? Uint32Array<TBuffer>
              : TArray extends Float32ArrayConstructor
                ? Float32Array<TBuffer>
                : never;

export type AttribFormatToTypedArray<
    Format extends SupportedFormat,
    T extends ArrayBufferLike = ArrayBufferLike,
> = TypedArrayWithBuffer<FormatMap[Format]['View'], T>;

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

export type CreateBindGroupResult<Group extends UniformGroup<number, Record<string, GenericBinding>>> = {
    group: Group['group'];
    bindGroup: GPUBindGroup;
    buffers: BuffersByBindingKey<Group>;
};

export type CreatePipelineLayoutResult<Groups extends UniformGroup<number, Record<string, GenericBinding>>[]> = {
    uniformGroups: Groups;
    createLayout: (device: GPUDevice) => GPUPipelineLayout;
    createBindGroups: <Group extends TupleIndices<Groups>>(args: {
        device: GPUDevice;
        group: Group;
        bindings: BindingsForGroup<Groups[Group]>;
    }) => CreateBindGroupResult<Groups[Group]>;
};
