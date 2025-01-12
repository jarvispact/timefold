import { RemoveNever, TupleIndices } from './internal-utils';
import * as Uniform from './uniform';

// ===========================================================
// render pass

export type RenderPassDescriptor = Omit<GPURenderPassDescriptor, 'colorAttachments'> & {
    colorAttachments: GPURenderPassColorAttachment[];
};

const defaultColorAttachmentOptions = {
    clearValue: [0, 0, 0, 1],
    loadOp: 'clear',
    storeOp: 'store',
} satisfies Omit<GPURenderPassColorAttachment, 'view'>;

export const createColorAttachmentFromView = (
    view: GPUTextureView,
    options?: Partial<Omit<GPURenderPassColorAttachment, 'view'>>,
): GPURenderPassColorAttachment => {
    return { ...defaultColorAttachmentOptions, ...options, view };
};

// ===========================================================
// device and context

const defaultAdapterOptions: GPURequestAdapterOptions = {
    powerPreference: 'high-performance',
    forceFallbackAdapter: false,
};

type CreateDeviceAndContextOptions = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    adapter?: GPURequestAdapterOptions;
    device?: GPUDeviceDescriptor;
    contextConfig?: Omit<GPUCanvasConfiguration, 'device'>;
};

export const createDeviceAndContext = async (options: CreateDeviceAndContextOptions) => {
    const adapterOptions = { ...defaultAdapterOptions, ...options.adapter };
    const adapter = await navigator.gpu.requestAdapter(adapterOptions);
    if (!adapter) {
        throw new Error('Webgpu not available');
    }

    const device = await adapter.requestDevice(options.device);
    const context = options.canvas.getContext('webgpu');
    if (!context) {
        throw new Error('Webgpu not available');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        ...options.contextConfig,
        format: options.contextConfig?.format ?? format,
    });

    return { device, context, format };
};

// ===========================================================
// vertex buffers

type GenericTypedArrayConstructor =
    | Int8ArrayConstructor
    | Uint8ArrayConstructor
    | Int16ArrayConstructor
    | Uint16ArrayConstructor
    | Int32ArrayConstructor
    | Uint32ArrayConstructor
    | Float32ArrayConstructor;

const formatMap = {
    sint8: { View: Int8Array, stride: 1 },
    sint8x2: { View: Int8Array, stride: 2 },
    sint8x4: { View: Int8Array, stride: 4 },

    uint8: { View: Uint8Array, stride: 1 },
    uint8x2: { View: Uint8Array, stride: 2 },
    uint8x4: { View: Uint8Array, stride: 4 },

    sint16: { View: Int16Array, stride: 1 },
    sint16x2: { View: Int16Array, stride: 2 },
    sint16x4: { View: Int16Array, stride: 4 },

    uint16: { View: Uint16Array, stride: 1 },
    uint16x2: { View: Uint16Array, stride: 2 },
    uint16x4: { View: Uint16Array, stride: 4 },

    sint32: { View: Int32Array, stride: 1 },
    sint32x2: { View: Int32Array, stride: 2 },
    sint32x3: { View: Int32Array, stride: 3 },
    sint32x4: { View: Int32Array, stride: 4 },

    uint32: { View: Uint32Array, stride: 1 },
    uint32x2: { View: Uint32Array, stride: 2 },
    uint32x3: { View: Uint32Array, stride: 3 },
    uint32x4: { View: Uint32Array, stride: 4 },

    float32: { View: Float32Array, stride: 1 },
    float32x2: { View: Float32Array, stride: 2 },
    float32x3: { View: Float32Array, stride: 3 },
    float32x4: { View: Float32Array, stride: 4 },
} satisfies Partial<Record<GPUVertexFormat, { View: GenericTypedArrayConstructor; stride: number }>>;

type FormatMap = typeof formatMap;
type SupportedFormat = keyof FormatMap;
type SupportedPositionFormat = 'float32x2' | 'float32x3' | 'float32x4';

type InterleavedMode = 'interleaved';
type NonInterleavedMode = 'non-interleaved';
type CreateVertexBufferMode = InterleavedMode | NonInterleavedMode;

type Attribute<Mode extends CreateVertexBufferMode> = {
    [Format in SupportedFormat]: {
        format: Format;
    } & (Mode extends InterleavedMode ? { offset: number } : { data: InstanceType<FormatMap[Format]['View']> });
}[SupportedFormat];

type PositionAttribute<Mode extends CreateVertexBufferMode> = {
    [Format in SupportedPositionFormat]: {
        format: Format;
    } & (Mode extends InterleavedMode ? { offset: number } : { data: InstanceType<FormatMap[Format]['View']> });
}[SupportedPositionFormat];

type GenericAttributes<Mode extends CreateVertexBufferMode> = {
    position: PositionAttribute<Mode>;
} & Record<string, Attribute<Mode>>;

type CreateVertexBuffersArgs<
    Mode extends CreateVertexBufferMode,
    Data extends InstanceType<GenericTypedArrayConstructor> | ArrayBufferLike,
> = Mode extends InterleavedMode
    ? Data extends InstanceType<GenericTypedArrayConstructor>
        ? {
              data: InstanceType<GenericTypedArrayConstructor>;
              stride: number;
              attributes: GenericAttributes<InterleavedMode>;
          }
        : {
              data: ArrayBufferLike;
              stride: number;
              attributes: GenericAttributes<InterleavedMode>;
              vertexCount: number;
          }
    : { attributes: GenericAttributes<NonInterleavedMode> };

type CreateVertexBuffersResult<
    Mode extends CreateVertexBufferMode,
    Attributes extends GenericAttributes<CreateVertexBufferMode>,
> = Mode extends InterleavedMode
    ? { layout: GPUVertexBufferLayout[]; slot: number; buffer: GPUBuffer; vertexCount: number }
    : {
          layout: GPUVertexBufferLayout[];
          buffers: {
              [Key in keyof Attributes]: { slot: number; buffer: GPUBuffer };
          };
          vertexCount: number;
      };

const isTypedArrayData = (
    args:
        | {
              data: InstanceType<GenericTypedArrayConstructor>;
              stride: number;
          }
        | {
              data: ArrayBufferLike;
              stride: number;
              vertexCount: number;
          },
): args is {
    data: InstanceType<GenericTypedArrayConstructor>;
    stride: number;
} => 'buffer' in args.data;

export const createVertexBuffers = <
    Mode extends CreateVertexBufferMode,
    Data extends InstanceType<GenericTypedArrayConstructor> | ArrayBufferLike,
    Args extends CreateVertexBuffersArgs<Mode, Data>,
>(
    device: GPUDevice,
    mode: Mode,
    args: Args,
): CreateVertexBuffersResult<Mode, Args['attributes']> => {
    if (mode === 'non-interleaved') {
        const posAttr = args.attributes.position as PositionAttribute<'non-interleaved'>;
        const posStride = formatMap[posAttr.format].stride;
        const len = posAttr.data.length;
        const vertexCount = len / posStride;
        const attributeKeys = Object.keys(args.attributes);
        let shaderLocation = 0;
        const layout: GPUVertexBufferLayout[] = attributeKeys.map((key) => {
            const attr = args.attributes[key] as Attribute<'non-interleaved'>;
            const stride = formatMap[attr.format].stride;
            return {
                arrayStride: stride * attr.data.BYTES_PER_ELEMENT,
                stepMode: 'vertex',
                attributes: [{ format: attr.format, shaderLocation: shaderLocation++, offset: 0 }],
            };
        });

        let slot = 0;
        const buffers = attributeKeys.reduce<Record<string, { slot: number; buffer: GPUBuffer }>>((accum, key) => {
            const attr = args.attributes[key] as Attribute<'non-interleaved'>;

            const buffer = device.createBuffer({
                label: 'vertex buffer vertices',
                size: attr.data.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });

            device.queue.writeBuffer(buffer, 0, attr.data);

            accum[key] = { slot: slot++, buffer };
            return accum;
        }, {});

        return {
            layout,
            buffers,
            vertexCount,
        } as CreateVertexBuffersResult<Mode, Args['attributes']>;
    }

    const _args = args as CreateVertexBuffersArgs<
        InterleavedMode,
        InstanceType<GenericTypedArrayConstructor> | ArrayBufferLike
    >;

    let shaderLocation = 0;
    const layout: GPUVertexBufferLayout[] = [
        {
            arrayStride: _args.stride * Float32Array.BYTES_PER_ELEMENT,
            stepMode: 'vertex',
            attributes: Object.keys(args.attributes).map((key) => {
                const attr = args.attributes[key] as Attribute<'interleaved'>;
                return {
                    format: attr.format,
                    shaderLocation: shaderLocation++,
                    offset: attr.offset * formatMap[attr.format].View.BYTES_PER_ELEMENT,
                };
            }),
        },
    ];

    const buffer = device.createBuffer({
        label: 'vertex buffer vertices',
        size: _args.data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(buffer, 0, _args.data);

    const vertexCount = isTypedArrayData(_args) ? _args.data.length / _args.stride : _args.vertexCount;

    return {
        layout,
        slot: 0,
        buffer,
        vertexCount,
    } as CreateVertexBuffersResult<Mode, Args['attributes']>;
};

// ===========================================================
// index buffer

type IndexFormatToTypedArray = {
    uint16: Uint16ArrayConstructor;
    uint32: Uint32ArrayConstructor;
};

type GenericTypedArrayConstructorForIndices = IndexFormatToTypedArray[keyof IndexFormatToTypedArray];

const isTypedIndexArrayData = (
    args:
        | { data: InstanceType<GenericTypedArrayConstructorForIndices> }
        | { data: ArrayBufferLike; indexCount: number },
): args is { data: InstanceType<GenericTypedArrayConstructorForIndices> } => 'buffer' in args.data;

type CreateIndexBufferArgs<Format extends GPUIndexFormat> = {
    format: Format;
} & ({ data: InstanceType<IndexFormatToTypedArray[Format]> } | { data: ArrayBufferLike; indexCount: number });

export const createIndexBuffer = <Format extends GPUIndexFormat>(
    device: GPUDevice,
    args: CreateIndexBufferArgs<Format>,
) => {
    const indexBuffer = device.createBuffer({
        size: args.data.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    const indexCount = isTypedIndexArrayData(args) ? args.data.length : args.indexCount;

    device.queue.writeBuffer(indexBuffer, 0, args.data);

    return {
        indexBuffer,
        indexCount,
        format: args.format,
    };
};

// ===========================================================
// uniform bindings

type BuffersByBindingKey<Group extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>> = RemoveNever<{
    [BindingKey in keyof Group['bindings']]: Group['bindings'][BindingKey]['type'] extends 'buffer' ? GPUBuffer : never;
}>;

export const createSampler = (device: GPUDevice, options: GPUSamplerDescriptor = {}): GPUSampler => {
    return device.createSampler(options);
};

const getTextureDefaultDescriptor = (width: number, height: number): GPUTextureDescriptor => {
    return {
        format: 'rgba8unorm',
        size: [width, height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        dimension: '2d',
    };
};

export const createImageBitmapTexture = (
    device: GPUDevice,
    image: ImageBitmap,
    options?: Omit<GPUTextureDescriptor, 'size'>,
): GPUTexture => {
    const descriptor = {
        ...getTextureDefaultDescriptor(image.width, image.height),
        ...options,
    };

    const texture = device.createTexture(descriptor);

    device.queue.copyExternalImageToTexture(
        { source: image, flipY: true },
        { texture },
        { width: image.width, height: image.height },
    );

    return texture;
};

export const createDataTexture = (
    device: GPUDevice,
    data: BufferSource | SharedArrayBuffer,
    width: number,
    height: number,
    options?: Omit<GPUTextureDescriptor, 'size'>,
): GPUTexture => {
    const descriptor = {
        ...getTextureDefaultDescriptor(width, height),
        ...options,
    };

    const texture = device.createTexture(descriptor);

    device.queue.writeTexture({ texture }, data, { bytesPerRow: width * 4 }, { width, height });

    return texture;
};

type CreateBufferDescriptorOptions = Pick<GPUBufferDescriptor, 'usage' | 'mappedAtCreation'>;

const bufferDefaultDescriptor: CreateBufferDescriptorOptions = {
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
};

export const createBufferDescriptor = (options?: CreateBufferDescriptorOptions): Omit<GPUBufferDescriptor, 'size'> => {
    return { ...bufferDefaultDescriptor, ...options };
};

type BindingsForGroup<Group extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>> = {
    [BindingKey in keyof Group['bindings']]: Group['bindings'][BindingKey]['type'] extends 'sampler'
        ? GPUSampler
        : Group['bindings'][BindingKey]['type'] extends 'texture'
          ? GPUTexture
          : Group['bindings'][BindingKey]['type'] extends 'buffer'
            ? ReturnType<typeof createBufferDescriptor>
            : never;
};

// ===========================================================
// pipeline layout

export const createPipelineLayout = <
    const Groups extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>[],
>({
    device,
    uniformGroups,
}: {
    device: GPUDevice;
    uniformGroups: Groups;
}) => {
    const bindGroupLayouts: GPUBindGroupLayout[] = [];

    for (let i = 0; i < uniformGroups.length; i++) {
        const uniformGroup = uniformGroups[i];
        const layoutEntries: GPUBindGroupLayoutEntry[] = [];
        const bindingKeys = Object.keys(uniformGroup.bindings);

        for (let j = 0; j < bindingKeys.length; j++) {
            const bindingKey = bindingKeys[j];
            const bindingValue = uniformGroup.bindings[bindingKey];

            if (bindingValue.type === 'sampler') {
                layoutEntries.push(bindingValue.layout);
            } else if (bindingValue.type === 'texture') {
                layoutEntries.push(bindingValue.layout);
            } else {
                layoutEntries.push(bindingValue.layout);
            }
        }

        const layout = device.createBindGroupLayout({
            label: `bind group layout | group ${uniformGroup.group}`,
            entries: layoutEntries,
        });

        bindGroupLayouts.push(layout);
    }

    const layout = device.createPipelineLayout({
        label: `pipeline layout | groups: ${bindGroupLayouts.map((l) => l.label).join(', ')}`,
        bindGroupLayouts,
    });

    const createBindGroups = <Group extends TupleIndices<Groups>>(
        group: Group,
        bindings: BindingsForGroup<Groups[Group]>,
    ) => {
        const bindgroupEntries: GPUBindGroupEntry[] = [];
        const layout = bindGroupLayouts[group];
        const bindingKeys = Object.keys(bindings);
        const buffers: Record<string, GPUBuffer> = {};

        for (let j = 0; j < bindingKeys.length; j++) {
            const bindingKey = bindingKeys[j];
            const binding = uniformGroups[group].bindings[bindingKey];
            const bindgroupValue = bindings[bindingKey];

            if (binding.type === 'sampler') {
                bindgroupEntries.push({ binding: binding.layout.binding, resource: bindgroupValue as GPUSampler });
            } else if (binding.type === 'texture') {
                bindgroupEntries.push({
                    binding: binding.layout.binding,
                    resource: (bindgroupValue as GPUTexture).createView(),
                });
            } else {
                const desc = bindgroupValue as ReturnType<typeof createBufferDescriptor>;

                const buffer = device.createBuffer({
                    size: binding.uniformType.bufferSize,
                    ...desc,
                });

                buffers[bindingKey] = buffer;
                bindgroupEntries.push({
                    binding: binding.layout.binding,
                    resource: { buffer },
                });
            }
        }

        const bindGroup = device.createBindGroup({
            label: `bind group | group ${group}`,
            layout,
            entries: bindgroupEntries,
        });

        return { bindGroup, buffers: buffers as BuffersByBindingKey<Groups[Group]> };
    };

    return { layout, createBindGroups };
};
