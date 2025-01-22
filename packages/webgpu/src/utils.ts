import {
    CreateVertexBufferMode,
    formatMap,
    FormatMap,
    GenericTypedArrayConstructor,
    IndexFormatToTypedArray,
    InterleavedMode,
    isTypedIndexArrayData,
    NonInterleavedMode,
    RemoveNever,
    SupportedFormat,
    SupportedPositionFormat,
    TupleIndices,
} from './internal-utils';
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

const defaultDepthAttachmentOptions = {
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
} satisfies Omit<GPURenderPassDepthStencilAttachment, 'view'>;

export const createDepthAttachmentFromView = (
    device: GPUDevice,
    width: number,
    height: number,
    options?: Omit<GPURenderPassDepthStencilAttachment, 'view'>,
): GPURenderPassDepthStencilAttachment => {
    const depthTexture = device.createTexture({
        size: [width, height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    return {
        view: depthTexture.createView(),
        ...defaultDepthAttachmentOptions,
        ...options,
    };
};

// ===========================================================
// device and context

const defaultAdapterOptions: GPURequestAdapterOptions = {
    powerPreference: 'high-performance',
    forceFallbackAdapter: false,
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

export const createDeviceAndContext = async (
    options: CreateDeviceAndContextOptions,
): Promise<CreateDeviceAndContextResult> => {
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

export type CreateVertexBufferLayoutDefinition<Mode extends CreateVertexBufferMode> = Mode extends InterleavedMode
    ? {
          position: { format: SupportedPositionFormat; offset: number };
      } & Record<string, { format: SupportedFormat; offset: number }>
    : {
          position: { format: SupportedPositionFormat };
      } & Record<string, { format: SupportedFormat }>;

type InterleavedCreateBuffer = (
    device: GPUDevice,
    data: Float32Array,
) => { slot: number; buffer: GPUBuffer; count: number };

type NonInterleavedCreateBuffer<Definition extends CreateVertexBufferLayoutDefinition<NonInterleavedMode>> = <
    Name extends keyof Definition,
>(
    device: GPUDevice,
    name: Name,
    data: InstanceType<FormatMap[Definition[Name]['format']]['View']>,
) => { slot: number; buffer: GPUBuffer } & (Name extends 'position' ? { count: number } : NonNullable<unknown>);

export type CreateVertexBufferLayoutResult<
    Mode extends CreateVertexBufferMode,
    Definition extends CreateVertexBufferLayoutDefinition<Mode>,
> = Mode extends InterleavedMode
    ? {
          layout: GPUVertexBufferLayout[];
          wgsl: string;
          createBuffer: InterleavedCreateBuffer;
      }
    : {
          layout: GPUVertexBufferLayout[];
          wgsl: string;
          createBuffer: NonInterleavedCreateBuffer<Definition>;
      };

export const createVertexBufferLayout = <
    Mode extends CreateVertexBufferMode,
    Definition extends CreateVertexBufferLayoutDefinition<Mode>,
>(
    mode: Mode,
    definition: Definition,
): CreateVertexBufferLayoutResult<Mode, Definition> => {
    const vertexDefinitionKeys = Object.keys(definition);

    const locationByName: Record<string, number> = {};

    const vertexProperties = vertexDefinitionKeys
        .map((key, idx) => {
            locationByName[key] = idx;
            const attr = definition[key];
            return `  @location(${idx}) ${key}: ${formatMap[attr.format].wgslType},`;
        })
        .join('\n');

    const wgsl = `struct Vertex {\n${vertexProperties}\n}`;

    if (mode === 'non-interleaved') {
        const layout: GPUVertexBufferLayout[] = vertexDefinitionKeys.map((key) => {
            const attr = definition[key];
            const { stride, View } = formatMap[attr.format];
            return {
                arrayStride: stride * View.BYTES_PER_ELEMENT,
                stepMode: 'vertex',
                attributes: [{ format: attr.format, shaderLocation: locationByName[key], offset: 0 }],
            };
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
        const createBuffer = <Name extends keyof Definition>(
            device: GPUDevice,
            name: Name,
            data: InstanceType<GenericTypedArrayConstructor>,
        ) => {
            const buffer = device.createBuffer({
                label: `${name.toString()} vertex buffer`,
                size: data.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });

            device.queue.writeBuffer(buffer, 0, data);

            return {
                // slot is actually the index into the layout (GPUVertexBufferLayout[])
                // but in our case it always matches the shader location as well
                slot: locationByName[name.toString()],
                buffer,
                ...(name === 'position' ? { count: data.length / formatMap[definition.position.format].stride } : {}),
            };
        };

        return {
            layout,
            wgsl,
            createBuffer,
        } as CreateVertexBufferLayoutResult<Mode, Definition>;
    }

    let arrayStride = 0;
    let totalStride = 0;

    const attributes = vertexDefinitionKeys.map((key) => {
        const attr = definition[key] as { format: SupportedFormat; offset: number };
        const { stride, View } = formatMap[attr.format];
        arrayStride += stride * View.BYTES_PER_ELEMENT;
        totalStride += attr.offset;

        return {
            format: attr.format,
            shaderLocation: locationByName[key],
            offset: attr.offset * View.BYTES_PER_ELEMENT,
        };
    });

    const layout: GPUVertexBufferLayout[] = [
        {
            arrayStride,
            stepMode: 'vertex',
            attributes,
        },
    ];

    const createBuffer: InterleavedCreateBuffer = (device, data) => {
        const buffer = device.createBuffer({
            label: 'interleaved vertex buffer',
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(buffer, 0, data);

        return {
            slot: 0,
            buffer,
            count: data.length / totalStride,
        };
    };

    return {
        layout,
        wgsl,
        createBuffer,
    } as CreateVertexBufferLayoutResult<Mode, Definition>;
};

// ===========================================================
// index buffer

export type CreateIndexBufferArgs<Format extends GPUIndexFormat> = {
    format: Format;
} & ({ data: InstanceType<IndexFormatToTypedArray[Format]> } | { data: ArrayBufferLike; indexCount: number });

export type CreateIndexBufferResult<Format extends GPUIndexFormat = GPUIndexFormat> = {
    buffer: GPUBuffer;
    count: number;
    format: Format;
};

export const createIndexBuffer = <Format extends GPUIndexFormat>(
    device: GPUDevice,
    args: CreateIndexBufferArgs<Format>,
): CreateIndexBufferResult<Format> => {
    const buffer = device.createBuffer({
        size: args.data.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    const count = isTypedIndexArrayData(args) ? args.data.length : args.indexCount;

    device.queue.writeBuffer(buffer, 0, args.data);

    return {
        buffer,
        count,
        format: args.format,
    };
};

// ===========================================================
// uniform bindings

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

type BuffersByBindingKey<Group extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>> = RemoveNever<{
    [BindingKey in keyof Group['bindings']]: Group['bindings'][BindingKey]['type'] extends 'buffer' ? GPUBuffer : never;
}>;

export type CreatePipelineLayoutArgs<Groups extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>[]> = {
    device: GPUDevice;
    uniformGroups: Groups;
};

export type CreateBindGroupsResult<
    Groups extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>[],
    Group extends TupleIndices<Groups>,
> = {
    group: Group;
    bindGroup: GPUBindGroup;
    buffers: BuffersByBindingKey<Groups[Group]>;
};

export type CreatePipelineLayoutResult<Groups extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>[]> =
    {
        layout: GPUPipelineLayout;
        createBindGroups: <Group extends TupleIndices<Groups>>(
            group: Group,
            bindings: BindingsForGroup<Groups[Group]>,
        ) => CreateBindGroupsResult<Groups, Group>;
    };

export const createPipelineLayout = <
    const Groups extends Uniform.Group<number, Record<string, Uniform.GenericBinding>>[],
>({
    device,
    uniformGroups,
}: CreatePipelineLayoutArgs<Groups>): CreatePipelineLayoutResult<Groups> => {
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

        return { group, bindGroup, buffers: buffers as BuffersByBindingKey<Groups[Group]> };
    };

    return { layout, createBindGroups };
};
