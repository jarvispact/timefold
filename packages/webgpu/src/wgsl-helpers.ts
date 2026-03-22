import { getTypeStructOrArrayString, SCALARS, ViewConfigEntry } from './internal';
import { WgslScalar, WgslStructDefinitionGeneric } from './wgsl-types';

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
