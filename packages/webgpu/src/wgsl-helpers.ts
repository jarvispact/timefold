import {
    getTypeStructOrArrayString,
    getVertexFormatByteSize,
    SCALARS,
    VERTEX_LOOKUP_TABLE,
    ViewConfigEntry,
} from './internal';
import { WgslScalar, WgslStructDefinitionGeneric, WgslVertexCreateOptions, WgslVertexFormat } from './wgsl-types';

const createModeToBuffer = {
    'shared-array-buffer': SharedArrayBuffer,
    'array-buffer': ArrayBuffer,
};

type CreateModeToBufferCtor = typeof createModeToBuffer;

export type BufferMode = keyof CreateModeToBufferCtor;

export type CreateModeToBufferInstance = {
    [K in BufferMode]: InstanceType<CreateModeToBufferCtor[K]>;
};

export const createBuffer = <Mode extends BufferMode>(size: number, mode: Mode) =>
    new createModeToBuffer[mode](size) as InstanceType<CreateModeToBufferCtor[Mode]>;

const scalarToTypedArray = {
    f32: Float32Array,
    i32: Int32Array,
    u32: Uint32Array,
} satisfies Record<WgslScalar, unknown>;

type ScalarToTypedArray<Mode extends BufferMode> = {
    f32: Float32Array<InstanceType<CreateModeToBufferCtor[Mode]>>;
    i32: Int32Array<InstanceType<CreateModeToBufferCtor[Mode]>>;
    u32: Uint32Array<InstanceType<CreateModeToBufferCtor[Mode]>>;
};

type GetModeFromBuffer<Buffer extends ArrayBufferLike> = Buffer extends SharedArrayBuffer
    ? 'shared-array-buffer'
    : 'array-buffer';

export type TypedArrayForScalarAndMode<
    Scalar extends WgslScalar,
    Mode extends BufferMode,
> = ScalarToTypedArray<Mode>[Scalar];

export const createTypedArray = <Buffer extends ArrayBufferLike, Scalar extends WgslScalar>(
    buffer: Buffer,
    offset: number,
    componentCount: number,
    scalar: Scalar,
) =>
    new scalarToTypedArray[scalar](buffer as never, offset, componentCount) as ScalarToTypedArray<
        GetModeFromBuffer<Buffer>
    >[Scalar];

export const getStructWgsl = (name: string, definition: WgslStructDefinitionGeneric) => {
    const indent = '    ';

    const propertyLines = Object.keys(definition).map((key) => {
        const value = definition[key];
        return `${indent}${key}: ${getTypeStructOrArrayString(value)}`;
    });

    return `struct ${name} {\n${propertyLines.join(',\n')}\n}`;
};

export const isViewConfigEntry = (value: unknown): value is ViewConfigEntry<WgslScalar> =>
    typeof value === 'object' &&
    value !== null &&
    'scalar' in value &&
    'byteOffset' in value &&
    'componentCount' in value &&
    SCALARS.includes((value as { scalar: string }).scalar) &&
    typeof (value as { byteOffset: unknown }).byteOffset === 'number' &&
    typeof (value as { componentCount: unknown }).componentCount === 'number';

export const buildViews = (buffer: ArrayBufferLike, viewConfig: unknown): unknown => {
    if (isViewConfigEntry(viewConfig)) {
        return createTypedArray(buffer, viewConfig.byteOffset, viewConfig.componentCount, viewConfig.scalar);
    }

    if (Array.isArray(viewConfig)) {
        const result: unknown[] = [];
        for (let i = 0; i < viewConfig.length; i++) {
            result.push(buildViews(buffer, viewConfig[i]));
        }
        return result;
    }

    const result: Record<string, unknown> = {};
    const config = viewConfig as Record<string, unknown>;

    for (const key in config) {
        result[key] = buildViews(buffer, config[key]);
    }

    return result;
};

// vertex helpers

export const getVertexStructWgsl = (name: string, definition: Record<string, WgslVertexFormat>) => {
    const indent = '    ';
    const keys = Object.keys(definition);
    const lines: string[] = [];

    for (let i = 0; i < keys.length; i++) {
        const wgslType = VERTEX_LOOKUP_TABLE[definition[keys[i]]].wgsl;
        lines.push(`${indent}@location(${i}) ${keys[i]}: ${wgslType}`);
    }

    return `struct ${name} {\n${lines.join(',\n')}\n}`;
};

export type VertexAttributeInfo = { key: string; format: WgslVertexFormat; byteSize: number };

export const getVertexAttributeInfo = (definition: Record<string, WgslVertexFormat>) => {
    const keys = Object.keys(definition);
    const attributes: VertexAttributeInfo[] = [];
    let interleavedStride = 0;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const format = definition[key];
        const byteSize = getVertexFormatByteSize(format);
        attributes.push({ key, format, byteSize });
        interleavedStride += byteSize;
    }

    return { attributes, interleavedStride };
};

export const getVertexBufferLayout = (attributes: VertexAttributeInfo[], interleavedStride: number) => {
    const interleavedAttrs: GPUVertexAttribute[] = [];
    let offset = 0;
    for (let i = 0; i < attributes.length; i++) {
        interleavedAttrs.push({
            shaderLocation: i,
            offset,
            format: attributes[i].format as GPUVertexFormat,
        });
        offset += attributes[i].byteSize;
    }

    const interleaved: GPUVertexBufferLayout[] = [{ arrayStride: interleavedStride, attributes: interleavedAttrs }];

    const nonInterleaved: GPUVertexBufferLayout[] = [];
    for (let i = 0; i < attributes.length; i++) {
        nonInterleaved.push({
            arrayStride: attributes[i].byteSize,
            attributes: [
                {
                    shaderLocation: i,
                    offset: 0,
                    format: attributes[i].format as GPUVertexFormat,
                },
            ],
        });
    }

    return { interleaved, nonInterleaved };
};

const DEFAULT_VERTEX_USAGE = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

export const createInterleavedBuffer = (
    device: GPUDevice,
    data: ArrayBuffer,
    interleavedStride: number,
    options?: WgslVertexCreateOptions,
) => {
    const buffer = device.createBuffer({
        ...options,
        size: data.byteLength,
        usage: options?.usage ?? DEFAULT_VERTEX_USAGE,
    });
    device.queue.writeBuffer(buffer, 0, data);
    return { slot: 0, buffer, vertexCount: data.byteLength / interleavedStride };
};

export const createNonInterleavedBuffers = (
    device: GPUDevice,
    attribs: Record<string, ArrayBufferView>,
    attributes: VertexAttributeInfo[],
    options?: WgslVertexCreateOptions,
) => {
    const result: { slot: number; buffer: GPUBuffer }[] = [];
    let vertexCount = 0;

    for (let i = 0; i < attributes.length; i++) {
        const typedArray = attribs[attributes[i].key];
        const buffer = device.createBuffer({
            ...options,
            size: typedArray.byteLength,
            usage: options?.usage ?? DEFAULT_VERTEX_USAGE,
        });
        device.queue.writeBuffer(buffer, 0, typedArray as never);
        result.push({ slot: i, buffer });

        if (i === 0) {
            vertexCount = typedArray.byteLength / attributes[i].byteSize;
        }
    }

    return { attributes: result, vertexCount };
};
