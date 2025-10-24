import {
    createView,
    createViewsForConfig,
    GenericMode,
    GenericTypedArrayMode,
    resolveViewConfigAndBufferSize,
    ViewForViewConstructor,
} from './internal-utils';
import { lookupTable, LookupTableEntry, WgslPrimitive, wgslTypes } from './lookup-table';
import {
    GenericWgslStructDefinition,
    WgslArray,
    WgslArrayCreateResult,
    WgslArrayElement,
    WgslArrayViewConfig,
    WgslArrayViews,
    WgslStruct,
    WgslStructCreateResult,
    WgslStructViewConfig,
    WgslStructViews,
    WgslType,
    WgslTypeCreateResult,
} from './types';

// ===========================================
// type

export function type<T extends WgslPrimitive>(type: T): WgslType<T> {
    const entry = lookupTable[type];
    const bufferSize = entry.size;
    const viewConfig = { type, scalar: entry.type, byteOffset: 0, elements: entry.elements };

    function create<Mode extends GenericMode>(args?: { mode?: Mode }) {
        const mode = args?.mode ?? 'array-buffer';

        if (mode === 'number-tuple') {
            return { view: entry.create() } as unknown as WgslTypeCreateResult<Mode, T>;
        }

        const buffer = mode === 'shared-array-buffer' ? new SharedArrayBuffer(entry.size) : new ArrayBuffer(entry.size);

        const view = createView(entry.type, buffer, 0, entry.elements);

        return { buffer, view } as unknown as WgslTypeCreateResult<Mode, T>;
    }

    function fromBuffer<Buffer extends ArrayBufferLike>(buffer: Buffer) {
        return createView(
            entry.type,
            buffer,
            0,
            entry.elements,
        ) as ViewForViewConstructor<Buffer>[LookupTableEntry<T>['type']];
    }

    return {
        type,
        wgsl: { type },
        bufferSize,
        viewConfig,
        create,
        fromBuffer,
    };
}

export function isType(value: unknown): value is WgslType<WgslPrimitive> {
    return (
        typeof value === 'object' &&
        !!value &&
        'type' in value &&
        typeof value.type === 'string' &&
        wgslTypes.includes(value.type)
    );
}

// ===========================================
// struct

export function struct<Name extends string, Definition extends GenericWgslStructDefinition>(
    name: Name,
    definition: Definition,
): WgslStruct<Name, Definition> {
    const wgslProperties = Object.keys(definition)
        .map((key) => {
            const value = definition[key];
            if (isType(value)) {
                return `  ${key}: ${value.type},`;
            } else if (isStruct(value)) {
                return `  ${key}: ${value.name},`;
            } else if (isArray(value)) {
                if (isType(value.element)) {
                    return `  ${key}: array<${value.element.type}, ${value.size}>,`;
                } else if (isStruct(value.element)) {
                    return `  ${key}: array<${value.element.name}, ${value.size}>,`;
                }
            }
        })
        .join('\n');

    const declaration = `struct ${name} {\n${wgslProperties}\n}`;

    const result = resolveViewConfigAndBufferSize({}, { definition });

    function create<Mode extends GenericMode>(args?: { mode?: Mode }) {
        const mode = args?.mode ?? 'array-buffer';

        if (mode === 'number-tuple') {
            const views = createViewsForConfig({}, result.viewConfig, undefined);
            return { views } as unknown as WgslStructCreateResult<Definition, Mode>;
        }

        const buffer =
            mode === 'shared-array-buffer'
                ? new SharedArrayBuffer(result.bufferSize)
                : new ArrayBuffer(result.bufferSize);

        const views = createViewsForConfig({}, result.viewConfig, buffer);
        return { buffer, views } as unknown as WgslStructCreateResult<Definition, Mode>;
    }

    function fromBuffer<Buffer extends ArrayBufferLike>(buffer: Buffer) {
        return createViewsForConfig({}, result.viewConfig, buffer) as WgslStructViews<
            Definition,
            Buffer,
            GenericTypedArrayMode
        >;
    }

    return {
        name,
        definition,
        wgsl: { type: name, declaration },
        bufferSize: result.bufferSize,
        viewConfig: result.viewConfig as WgslStructViewConfig,
        create,
        fromBuffer,
    };
}

export function isStruct(value: unknown): value is WgslStruct<string, GenericWgslStructDefinition> {
    return (
        typeof value === 'object' &&
        !!value &&
        'name' in value &&
        'definition' in value &&
        typeof value.definition === 'object' &&
        !Array.isArray(value.definition)
    );
}

// ===========================================
// array

export function array<Element extends WgslArrayElement, Size extends number>(
    element: Element,
    size: Size,
): WgslArray<Element, Size> {
    const result = resolveViewConfigAndBufferSize([], { element, size });

    function create<Mode extends GenericMode>(args?: { mode?: Mode }) {
        const mode = args?.mode ?? 'array-buffer';

        if (mode === 'number-tuple') {
            const views = createViewsForConfig([], result.viewConfig, undefined);
            return { views } as unknown as WgslArrayCreateResult<Element, Size, Mode>;
        }

        const buffer =
            mode === 'shared-array-buffer'
                ? new SharedArrayBuffer(result.bufferSize)
                : new ArrayBuffer(result.bufferSize);

        const views = createViewsForConfig([], result.viewConfig, buffer);
        return { buffer, views } as unknown as WgslArrayCreateResult<Element, Size, Mode>;
    }

    function fromBuffer<Buffer extends ArrayBufferLike>(buffer: Buffer) {
        return createViewsForConfig([], result.viewConfig, buffer) as WgslArrayViews<
            Element,
            Size,
            Buffer,
            GenericTypedArrayMode
        >;
    }

    return {
        element,
        size,
        wgsl: { type: `array<${element.wgsl.type}, ${size}>` },
        bufferSize: result.bufferSize,
        viewConfig: result.viewConfig as WgslArrayViewConfig<Size>,
        create,
        fromBuffer,
    };
}

export function isArray(value: unknown): value is WgslArray<WgslArrayElement, number> {
    return (
        typeof value === 'object' && !!value && 'element' in value && 'size' in value && typeof value.size === 'number'
    );
}
