import { lookupTable, LookupTableEntry, WgslType } from './lookup-table';
import { ArrayElement, isArray } from './wgsl-array';
import { GenericStructDefinition, isStruct } from './wgsl-struct';
import { isType } from './wgsl-type';

// uniforms

export type ViewForViewConstructor<T extends ArrayBufferLike> = {
    i32: Int32Array<T>;
    u32: Uint32Array<T>;
    f32: Float32Array<T>;
};

export type WgslScalar = keyof ViewForViewConstructor<ArrayBufferLike>;

type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;
export type Tuple<T, N extends number> = N extends N ? (number extends N ? T[] : _TupleOf<T, N, []>) : never;

export type TupleIndices<T extends readonly unknown[]> =
    Extract<keyof T, `${number}`> extends `${infer N extends number}` ? N : never;

type FilteredKeys<T> = {
    [K in keyof T]: T[K] extends never ? never : K;
}[keyof T];

export type RemoveNever<T> = {
    [K in FilteredKeys<T>]: T[K];
};

export type ArrayBufferMode = 'array-buffer';
export type SharedArrayBufferMode = 'shared-array-buffer';
export type NumberTupleMode = 'number-tuple';
export type GenericTypedArrayMode = ArrayBufferMode | SharedArrayBufferMode;
export type GenericMode = GenericTypedArrayMode | NumberTupleMode;

export type TypedArrayOrTuple<T extends WgslType, Buffer extends ArrayBufferLike, Mode extends GenericMode> =
    LookupTableEntry<T> extends {
        create: infer Create extends () => number[];
        type: infer Type extends WgslScalar;
    }
        ? Mode extends GenericTypedArrayMode
            ? ViewForViewConstructor<Buffer>[Type]
            : ReturnType<Create> extends [number]
              ? number
              : ReturnType<Create>
        : never;

export type ViewConfigEntry = {
    type: WgslType;
    scalar: WgslScalar;
    byteOffset: number;
    elements: number;
};

const isViewConfig = (value: unknown): value is ViewConfigEntry =>
    typeof value === 'object' && !!value && 'elements' in value && 'byteOffset' in value && 'scalar' in value;

const roundUp = (k: number, n: number) => Math.ceil(n / k) * k;

export const resolveViewConfigAndBufferSize = <ViewConfig extends Record<string, unknown> | unknown[]>(
    viewConfig: ViewConfig,
    input: ViewConfig extends Record<string, unknown>
        ? { definition: GenericStructDefinition }
        : { element: ArrayElement; size: number },
    bufferSize: number = 0,
    byteOffset: number = 0,
) => {
    let maxAlignment = 0;

    const handleType = (wgslType: WgslType, isInArray: boolean): ViewConfigEntry => {
        const { elements, size, align, type } = lookupTable[wgslType];
        byteOffset = roundUp(align, byteOffset);
        const viewConfig = { elements, byteOffset, scalar: type, type: wgslType };
        byteOffset += isInArray ? roundUp(align, size) : size;
        bufferSize = Math.max(bufferSize, byteOffset);
        maxAlignment = Math.max(maxAlignment, align);
        return viewConfig;
    };

    const handleStruct = (definition: GenericStructDefinition) => {
        const nestedResult = resolveViewConfigAndBufferSize({}, { definition }, bufferSize, byteOffset);
        byteOffset = nestedResult.bufferSize;
        bufferSize = Math.max(bufferSize, byteOffset);
        return nestedResult.viewConfig;
    };

    if (Array.isArray(viewConfig) && 'element' in input && 'size' in input) {
        for (let i = 0; i < input.size; i++) {
            if (isType(input.element)) {
                viewConfig.push(handleType(input.element.type, true));
            } else if (isStruct(input.element)) {
                viewConfig.push(handleStruct(input.element.definition));
            } else if (isArray(input.element)) {
                const nestedResult = resolveViewConfigAndBufferSize([], input.element, bufferSize, byteOffset);
                byteOffset = nestedResult.bufferSize;
                bufferSize = Math.max(bufferSize, byteOffset);
                viewConfig.push(nestedResult.viewConfig);
            }
        }
    } else if (!Array.isArray(viewConfig) && 'definition' in input) {
        const definitionKeys = Object.keys(input.definition);
        for (const definitionKey of definitionKeys) {
            const definitionValue = input.definition[definitionKey];
            if (isType(definitionValue)) {
                viewConfig[definitionKey] = handleType(definitionValue.type, false);
            } else if (isStruct(definitionValue)) {
                viewConfig[definitionKey] = handleStruct(definitionValue.definition);
            } else if (isArray(definitionValue)) {
                const nestedResult = resolveViewConfigAndBufferSize([], definitionValue, bufferSize, byteOffset);
                byteOffset = nestedResult.bufferSize;
                bufferSize = Math.max(bufferSize, byteOffset);
                viewConfig[definitionKey] = nestedResult.viewConfig;
            }
        }

        bufferSize = maxAlignment === 0 ? bufferSize : roundUp(maxAlignment, bufferSize);
    }

    return { bufferSize, viewConfig };
};

export const createView = (
    scalar: WgslScalar,
    buffer: ArrayBufferLike,
    byteOffset: number,
    elements: number,
): Int32Array | Uint32Array | Float32Array => {
    switch (scalar) {
        case 'i32':
            return new Int32Array(buffer, byteOffset, elements);
        case 'u32':
            return new Uint32Array(buffer, byteOffset, elements);
        case 'f32':
            return new Float32Array(buffer, byteOffset, elements);
    }
};

type UnknownViewConfigEntry = ViewConfigEntry | Record<string, ViewConfigEntry> | ViewConfigEntry[];

const handleViewConfig = (entry: ViewConfigEntry, buffer: ArrayBufferLike | undefined) => {
    if (buffer) {
        return createView(entry.scalar, buffer, entry.byteOffset, entry.elements);
    } else {
        return lookupTable[entry.type].create();
    }
};

export const createViewsForConfig = <Views extends Record<string, unknown> | unknown[]>(
    views: Views,
    input: Views extends Record<string, unknown> ? Record<string, unknown> : unknown[],
    buffer: ArrayBufferLike | undefined,
) => {
    if (Array.isArray(views) && Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
            const entry = input[i] as UnknownViewConfigEntry;
            if (isViewConfig(entry)) {
                views.push(handleViewConfig(entry, buffer));
            } else if (Array.isArray(entry)) {
                views.push(createViewsForConfig([], entry, buffer));
            } else {
                views.push(createViewsForConfig({}, entry, buffer));
            }
        }
    } else if (!Array.isArray(views) && !Array.isArray(input)) {
        for (const viewConfigKey of Object.keys(input)) {
            const entry = input[viewConfigKey] as UnknownViewConfigEntry;
            if (isViewConfig(entry)) {
                views[viewConfigKey] = handleViewConfig(entry, buffer);
            } else if (Array.isArray(entry)) {
                views[viewConfigKey] = createViewsForConfig([], entry, buffer);
            } else {
                views[viewConfigKey] = createViewsForConfig({}, entry, buffer);
            }
        }
    }
    return views;
};

// vertex

export type GenericTypedArrayConstructor =
    | Int8ArrayConstructor
    | Uint8ArrayConstructor
    | Int16ArrayConstructor
    | Uint16ArrayConstructor
    | Int32ArrayConstructor
    | Uint32ArrayConstructor
    | Float32ArrayConstructor;

export const formatMap = {
    sint8x2: { View: Int8Array, stride: 2, wgsl: 'vec2<i32>' },
    sint8x4: { View: Int8Array, stride: 4, wgsl: 'vec4<i32>' },

    uint8x2: { View: Uint8Array, stride: 2, wgsl: 'vec2<u32>' },
    uint8x4: { View: Uint8Array, stride: 4, wgsl: 'vec4<u32>' },

    sint16x2: { View: Int16Array, stride: 2, wgsl: 'vec2<i32>' },
    sint16x4: { View: Int16Array, stride: 4, wgsl: 'vec4<i32>' },

    uint16x2: { View: Uint16Array, stride: 2, wgsl: 'vec2<u32>' },
    uint16x4: { View: Uint16Array, stride: 4, wgsl: 'vec4<u32>' },

    sint32: { View: Int32Array, stride: 1, wgsl: 'i32' },
    sint32x2: { View: Int32Array, stride: 2, wgsl: 'vec2<i32>' },
    sint32x3: { View: Int32Array, stride: 3, wgsl: 'vec3<i32>' },
    sint32x4: { View: Int32Array, stride: 4, wgsl: 'vec4<i32>' },

    uint32: { View: Uint32Array, stride: 1, wgsl: 'u32' },
    uint32x2: { View: Uint32Array, stride: 2, wgsl: 'vec2<u32>' },
    uint32x3: { View: Uint32Array, stride: 3, wgsl: 'vec3<u32>' },
    uint32x4: { View: Uint32Array, stride: 4, wgsl: 'vec4<u32>' },

    float32: { View: Float32Array, stride: 1, wgsl: 'f32' },
    float32x2: { View: Float32Array, stride: 2, wgsl: 'vec2<f32>' },
    float32x3: { View: Float32Array, stride: 3, wgsl: 'vec3<f32>' },
    float32x4: { View: Float32Array, stride: 4, wgsl: 'vec4<f32>' },

    snorm8x2: { View: Int8Array, stride: 2, wgsl: 'vec2<f32>' },
    snorm8x4: { View: Int8Array, stride: 4, wgsl: 'vec4<f32>' },

    snorm16x2: { View: Int16Array, stride: 2, wgsl: 'vec2<f32>' },
    snorm16x4: { View: Int16Array, stride: 4, wgsl: 'vec4<f32>' },

    unorm8x2: { View: Uint8Array, stride: 2, wgsl: 'vec2<f32>' },
    unorm8x4: { View: Uint8Array, stride: 4, wgsl: 'vec4<f32>' },

    unorm16x2: { View: Uint16Array, stride: 2, wgsl: 'vec2<f32>' },
    unorm16x4: { View: Uint16Array, stride: 4, wgsl: 'vec4<f32>' },

    'unorm10-10-10-2': { View: Uint32Array, stride: 4, wgsl: 'vec4<f32>' },
} satisfies Partial<Record<GPUVertexFormat, { View: GenericTypedArrayConstructor; stride: number; wgsl: WgslType }>>;

export type FormatMap = typeof formatMap;
export type SupportedFormat = keyof FormatMap;
export type SupportedPositionFormat = 'float32x2' | 'float32x3' | 'float32x4';

export type InterleavedMode = 'interleaved';
export type NonInterleavedMode = 'non-interleaved';
export type CreateVertexBufferMode = InterleavedMode | NonInterleavedMode;

// index

export type IndexFormatToTypedArray = {
    uint16: Uint16ArrayConstructor;
    uint32: Uint32ArrayConstructor;
};

type GenericTypedArrayConstructorForIndices = IndexFormatToTypedArray[keyof IndexFormatToTypedArray];

export const isTypedIndexArrayData = (
    args:
        | { data: InstanceType<GenericTypedArrayConstructorForIndices> }
        | { data: ArrayBufferLike; indexCount: number },
): args is { data: InstanceType<GenericTypedArrayConstructorForIndices> } => 'buffer' in args.data;
