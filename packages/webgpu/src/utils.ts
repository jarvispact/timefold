import { formatMap, GenericTypedArrayConstructor, TupleIndices } from './internal-utils';
import {
    BindingsForGroup,
    BuffersByBindingKey,
    CreateContextOptions,
    CreateDeviceAndContextOptions,
    CreateDeviceAndContextResult,
    CreateDeviceOptions,
    CreateIndexBufferArgs,
    CreateIndexBufferResult,
    CreatePipelineLayoutArgs,
    CreatePipelineLayoutResult,
    CreatePipelineLayoutResult2,
    CreateVertexBufferLayoutDefinition,
    CreateVertexBufferLayoutResult,
    CreateVertexBufferMode,
    GenericBinding,
    InterleavedCreateBuffer,
    SupportedFormat,
    UniformGroup,
} from './types';

// ===========================================================
// render pass

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
    view: GPUTextureView,
    options?: Omit<GPURenderPassDepthStencilAttachment, 'view'>,
): GPURenderPassDepthStencilAttachment => {
    return { view, ...defaultDepthAttachmentOptions, ...options };
};

// ===========================================================
// device and context

const defaultAdapterOptions: GPURequestAdapterOptions = {
    powerPreference: 'high-performance',
    forceFallbackAdapter: false,
};

export const createDevice = async (options: CreateDeviceOptions = {}) => {
    const adapterOptions = { ...defaultAdapterOptions, ...options.adapter };
    const adapter = await navigator.gpu.requestAdapter(adapterOptions);
    if (!adapter) {
        throw new Error('Webgpu not available');
    }

    const device = await adapter.requestDevice(options.device);
    return device;
};

export const createContext = (options: CreateContextOptions) => {
    const context = options.canvas.getContext('webgpu');
    if (!context) {
        throw new Error('Webgpu not available');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: options.device,
        ...options.contextConfig,
        format: options.contextConfig?.format ?? format,
    });

    return context;
};

export const createDeviceAndContext = async (
    options: CreateDeviceAndContextOptions,
): Promise<CreateDeviceAndContextResult> => {
    const device = await createDevice({ adapter: options.adapter, device: options.device });
    const context = createContext({ canvas: options.canvas, device, contextConfig: options.contextConfig });
    const format = navigator.gpu.getPreferredCanvasFormat();
    return { device, context, format };
};

// ===========================================================
// transparency

export const getBlendState = (mode: 'opaque' | 'transparent'): GPUBlendState | undefined => {
    if (mode === 'opaque') return undefined;

    return {
        color: {
            operation: 'add',
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
        },
        alpha: {
            operation: 'add',
            srcFactor: 'one-minus-dst-alpha',
            dstFactor: 'one',
        },
    };
};

// ===========================================================
// vertex buffers

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
            return `  @location(${idx}) ${key}: ${formatMap[attr.format].wgsl},`;
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

        // TODO: `GPUBufferUsage.COPY_DST` not required together with `mappedAtCreation` ?
        // https://toji.dev/webgpu-best-practices/buffer-uploads#:~:text=usage%3A%20GPUBufferUsage.VERTEX%2C%20//%20COPY_DST%20is%20not%20required!

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
                mappedAtCreation: true,
            });

            const gpuBufferArray = new Uint8Array(buffer.getMappedRange());
            gpuBufferArray.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
            buffer.unmap();

            return {
                mode,
                // slot is actually the index into the layout (GPUVertexBufferLayout[])
                // but in our case it always matches the shader location as well
                slot: locationByName[name.toString()],
                buffer,
                ...(name === 'position' ? { count: data.length / formatMap[definition.position.format].stride } : {}),
            };
        };

        const createBuffers = (
            device: GPUDevice,
            attribs: { [K in keyof Definition]: InstanceType<GenericTypedArrayConstructor> },
        ) => {
            return {
                mode,
                attribs: Object.keys(attribs).reduce(
                    (accum, key: keyof Definition) => {
                        accum[key] = createBuffer(device, key, attribs[key]);
                        return accum;
                    },
                    {} as { [K in keyof Definition]: { slot: number; buffer: GPUBuffer; count?: number } },
                ),
            };
        };

        return {
            mode,
            layout,
            wgsl,
            createBuffers,
        } as unknown as CreateVertexBufferLayoutResult<Mode, Definition>;
    }

    let arrayStride = 0;
    let totalStride = 0;

    const attributes = vertexDefinitionKeys.map((key) => {
        const attr = definition[key] as { format: SupportedFormat; stride: number };
        const { stride, View } = formatMap[attr.format];

        // TODO: Is this a good idea?
        arrayStride += attr.stride === -1 ? 0 : stride * View.BYTES_PER_ELEMENT;
        totalStride += attr.stride === -1 ? 0 : stride;

        return {
            format: attr.format,
            shaderLocation: locationByName[key],
            // TODO: Is this a good idea?
            offset: attr.stride === -1 ? 0 : attr.stride * View.BYTES_PER_ELEMENT,
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
            mappedAtCreation: true,
        });

        const gpuBufferArray = new Uint8Array(buffer.getMappedRange());
        gpuBufferArray.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        buffer.unmap();

        return {
            mode,
            slot: 0,
            buffer,
            count: data.length / totalStride,
        };
    };

    return {
        mode,
        layout,
        wgsl,
        createBuffer,
    } as CreateVertexBufferLayoutResult<Mode, Definition>;
};

// ===========================================================
// index buffer

export const createIndexBuffer = <Format extends GPUIndexFormat>(
    device: GPUDevice,
    args: CreateIndexBufferArgs<Format>,
): CreateIndexBufferResult<Format> => {
    const buffer = device.createBuffer({
        size: Math.ceil(args.data.byteLength / 4) * 4,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });

    const gpuBufferArray = new Uint8Array(buffer.getMappedRange());
    gpuBufferArray.set(new Uint8Array(args.data.buffer, args.data.byteOffset, args.data.byteLength));
    buffer.unmap();

    return {
        buffer,
        count: args.data.length,
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
    args: { data: BufferSource | SharedArrayBuffer; width: number; height: number },
    options?: Omit<GPUTextureDescriptor, 'size'>,
): GPUTexture => {
    const descriptor = {
        ...getTextureDefaultDescriptor(args.width, args.height),
        ...options,
    };

    const texture = device.createTexture(descriptor);

    device.queue.writeTexture(
        { texture },
        args.data,
        { bytesPerRow: args.width * 4 },
        { width: args.width, height: args.height },
    );

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

// ===========================================================
// pipeline layout

export const createPipelineLayout = <const Groups extends UniformGroup<number, Record<string, GenericBinding>>[]>({
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

    return {
        layout,
        uniformGroups,
        createBindGroups,
    };
};

// TODO: Decide for one variant of the pipeline layout creation function
export const createPipelineLayout2 = <const Groups extends UniformGroup<number, Record<string, GenericBinding>>[]>({
    uniformGroups,
}: {
    uniformGroups: Groups;
}): CreatePipelineLayoutResult2<Groups> => {
    const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[][] = [];

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

        bindGroupLayoutEntries.push(layoutEntries);
    }

    const bindGroupLayouts: GPUBindGroupLayout[] = [];

    const createLayout = (device: GPUDevice) => {
        for (const entry of bindGroupLayoutEntries) {
            bindGroupLayouts.push(
                device.createBindGroupLayout({
                    entries: entry,
                }),
            );
        }

        return device.createPipelineLayout({
            bindGroupLayouts,
        });
    };

    const createBindGroups = <Group extends TupleIndices<Groups>>(
        device: GPUDevice,
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

    return {
        uniformGroups,
        createLayout,
        createBindGroups,
    };
};
