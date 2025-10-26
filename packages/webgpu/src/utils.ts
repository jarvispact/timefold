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
    CreatePipelineLayoutResult,
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

export function createColorAttachmentFromView(
    view: GPUTextureView,
    options?: Partial<Omit<GPURenderPassColorAttachment, 'view'>>,
): GPURenderPassColorAttachment {
    return { ...defaultColorAttachmentOptions, ...options, view };
}

const defaultDepthAttachmentOptions = {
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
} satisfies Omit<GPURenderPassDepthStencilAttachment, 'view'>;

export function createDepthAttachmentFromView(
    view: GPUTextureView,
    options?: Omit<GPURenderPassDepthStencilAttachment, 'view'>,
): GPURenderPassDepthStencilAttachment {
    return { view, ...defaultDepthAttachmentOptions, ...options };
}

// ===========================================================
// device and context

const defaultAdapterOptions: GPURequestAdapterOptions = {
    powerPreference: 'high-performance',
    forceFallbackAdapter: false,
};

export async function createDevice(options: CreateDeviceOptions = {}) {
    const adapterOptions = { ...defaultAdapterOptions, ...options.adapter };
    const adapter = await navigator.gpu.requestAdapter(adapterOptions);
    if (!adapter) {
        throw new Error('Webgpu not available');
    }

    const device = await adapter.requestDevice(options.device);
    return device;
}

export function createContext(options: CreateContextOptions) {
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
}

export async function createDeviceAndContext(
    options: CreateDeviceAndContextOptions,
): Promise<CreateDeviceAndContextResult> {
    const device = await createDevice({ adapter: options.adapter, device: options.device });
    const context = createContext({ canvas: options.canvas, device, contextConfig: options.contextConfig });
    const format = navigator.gpu.getPreferredCanvasFormat();
    return { device, context, format };
}

// ===========================================================
// transparency

export function getBlendState(mode: 'opaque' | 'transparent'): GPUBlendState | undefined {
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
}

// ===========================================================
// vertex buffers

export function createVertexBufferLayout<
    Mode extends CreateVertexBufferMode,
    Definition extends CreateVertexBufferLayoutDefinition<Mode>,
>({
    label,
    mode,
    definition,
}: {
    label: string;
    mode: Mode;
    definition: Definition;
}): CreateVertexBufferLayoutResult<Mode, Definition> {
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
        function createBuffer<Name extends keyof Definition>(
            device: GPUDevice,
            name: Name,
            data: InstanceType<GenericTypedArrayConstructor>,
        ) {
            const buffer = device.createBuffer({
                label: `[${label}] ${name.toString()} vertex buffer`,
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
        }

        function createBuffers(
            device: GPUDevice,
            attribs: { [K in keyof Definition]: InstanceType<GenericTypedArrayConstructor> },
        ) {
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
        }

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

        arrayStride += stride * View.BYTES_PER_ELEMENT;
        totalStride += stride;

        return {
            format: attr.format,
            shaderLocation: locationByName[key],
            offset: attr.stride * View.BYTES_PER_ELEMENT,
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
            label: `[${label}] interleaved vertex buffer`,
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
}

// ===========================================================
// index buffer

export function createIndexBuffer<Format extends GPUIndexFormat>({
    device,
    label,
    format,
    data,
}: CreateIndexBufferArgs<Format> & { label: string; device: GPUDevice }): CreateIndexBufferResult<Format> {
    const buffer = device.createBuffer({
        label,
        size: Math.ceil(data.byteLength / 4) * 4,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });

    const gpuBufferArray = new Uint8Array(buffer.getMappedRange());
    gpuBufferArray.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    buffer.unmap();

    return {
        buffer,
        count: data.length,
        format: format,
    };
}

// ===========================================================
// uniform bindings

export function createSampler({
    device,
    ...options
}: GPUSamplerDescriptor & { label: string; device: GPUDevice }): GPUSampler {
    return device.createSampler(options);
}

function getTextureDefaultDescriptor(width: number, height: number): GPUTextureDescriptor {
    return {
        format: 'rgba8unorm',
        size: [width, height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        dimension: '2d',
    };
}

export function createImageBitmapTexture({
    device,
    image,
    ...options
}: Omit<GPUTextureDescriptor, 'size' | 'dimension' | 'format' | 'usage'> & {
    label: string;
    device: GPUDevice;
    image: ImageBitmap;
    format?: GPUTextureFormat;
    usage?: number;
}): GPUTexture {
    const descriptor = {
        ...getTextureDefaultDescriptor(image.width, image.height),
        ...options,
    };

    const texture = device.createTexture(descriptor);

    device.queue.copyExternalImageToTexture(
        { source: image },
        { texture },
        { width: image.width, height: image.height },
    );

    return texture;
}

function getTextureArrayDefaultDescriptor(width: number, height: number, arrayLength: number): GPUTextureDescriptor {
    return {
        format: 'rgba8unorm',
        size: [width, height, arrayLength],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        dimension: '2d',
        textureBindingViewDimension: '2d-array',
    };
}

export function createImageBitmapTextureArray({
    device,
    images,
    ...options
}: Omit<GPUTextureDescriptor, 'size' | 'dimension' | 'format' | 'usage' | 'textureBindingViewDimension'> & {
    label: string;
    device: GPUDevice;
    images: ImageBitmap[];
    format?: GPUTextureFormat;
    usage?: number;
}): GPUTexture {
    const descriptor = {
        ...getTextureArrayDefaultDescriptor(images[0].width, images[0].height, images.length),
        ...options,
    };

    const texture = device.createTexture(descriptor);

    for (let i = 0; i < images.length; i++) {
        const image = images[i];

        device.queue.copyExternalImageToTexture(
            { source: image },
            { texture, origin: { x: 0, y: 0, z: i } },
            { width: image.width, height: image.height },
        );
    }

    return texture;
}

export function createDataTexture({
    device,
    width,
    height,
    data,
    ...options
}: Omit<GPUTextureDescriptor, 'size' | 'dimension' | 'format' | 'usage'> & {
    label: string;
    data: BufferSource | SharedArrayBuffer;
    width: number;
    height: number;
} & {
    device: GPUDevice;
}): GPUTexture {
    const descriptor = {
        ...getTextureDefaultDescriptor(width, height),
        ...options,
    };

    const texture = device.createTexture(descriptor);

    device.queue.writeTexture({ texture }, data, { bytesPerRow: width * 4 }, { width: width, height: height });

    return texture;
}

export function createDataTextureArray({
    device,
    width,
    height,
    dataArray,
    ...options
}: Omit<GPUTextureDescriptor, 'size' | 'dimension' | 'format' | 'usage' | 'textureBindingViewDimension'> & {
    label: string;
    device: GPUDevice;
    width: number;
    height: number;
    dataArray: (BufferSource | SharedArrayBuffer)[];
}): GPUTexture {
    const descriptor = {
        ...getTextureArrayDefaultDescriptor(width, height, dataArray.length),
        ...options,
    };

    const texture = device.createTexture(descriptor);

    for (let i = 0; i < dataArray.length; i++) {
        const data = dataArray[i];
        device.queue.writeTexture({ texture }, data, { bytesPerRow: width * 4 }, { width: width, height: height });
    }

    return texture;
}

type CreateBufferDescriptorOptions = Omit<GPUBufferDescriptor, 'size'>;

const uniformBufferDefaultDescriptor: CreateBufferDescriptorOptions = {
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
};

const storageBufferDefaultDescriptor: CreateBufferDescriptorOptions = {
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
};

export function createUniformBufferDescriptor(
    options: Omit<GPUBufferDescriptor, 'size' | 'usage'> & { label: string },
) {
    return { ...uniformBufferDefaultDescriptor, ...options };
}

export function createStorageBufferDescriptor(
    options: Omit<GPUBufferDescriptor, 'size' | 'usage'> & { label: string },
) {
    return { ...storageBufferDefaultDescriptor, ...options };
}

// pipeline layout

export function createPipelineLayout<const Groups extends UniformGroup<number, Record<string, GenericBinding>>[]>({
    bindGroupLayoutLabel,
    pipelineLayoutLabel,
    uniformGroups,
}: {
    bindGroupLayoutLabel: string;
    pipelineLayoutLabel: string;
    uniformGroups: Groups;
}): CreatePipelineLayoutResult<Groups> {
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

    function createLayout(device: GPUDevice) {
        for (const entry of bindGroupLayoutEntries) {
            bindGroupLayouts.push(
                device.createBindGroupLayout({
                    label: bindGroupLayoutLabel,
                    entries: entry,
                }),
            );
        }

        return device.createPipelineLayout({
            label: pipelineLayoutLabel,
            bindGroupLayouts,
        });
    }

    function createBindGroups<Group extends TupleIndices<Groups>>({
        device,
        group,
        bindings,
    }: {
        device: GPUDevice;
        group: Group;
        bindings: BindingsForGroup<Groups[Group]>;
    }) {
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
                const desc = bindgroupValue as
                    | ReturnType<typeof createUniformBufferDescriptor>
                    | ReturnType<typeof createStorageBufferDescriptor>;

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
    }

    return {
        uniformGroups,
        createLayout,
        createBindGroups,
    };
}
