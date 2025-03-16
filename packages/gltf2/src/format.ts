import { accessorTypeMapping, ParsedComponentTypeType, UnparsedAccessorType } from './mappings';

// Copy paste from @timefold/webgpu => internal-utils.ts => formatMap
type FormatToTypedArray = {
    sint8x2: Int8Array;
    sint8x4: Int8Array;

    uint8x2: Uint8Array;
    uint8x4: Uint8Array;

    sint16x2: Int16Array;
    sint16x4: Int16Array;

    uint16x2: Uint16Array;
    uint16x4: Uint16Array;

    sint32: Int32Array;
    sint32x2: Int32Array;
    sint32x3: Int32Array;
    sint32x4: Int32Array;

    uint32: Uint32Array;
    uint32x2: Uint32Array;
    uint32x3: Uint32Array;
    uint32x4: Uint32Array;

    float32: Float32Array;
    float32x2: Float32Array;
    float32x3: Float32Array;
    float32x4: Float32Array;

    snorm8x2: Int8Array;
    snorm8x4: Int8Array;

    snorm16x2: Int16Array;
    snorm16x4: Int16Array;

    unorm8x2: Uint8Array;
    unorm8x4: Uint8Array;

    unorm16x2: Uint16Array;
    unorm16x4: Uint16Array;

    'unorm10-10-10-2': Uint32Array;
};

export type Format = keyof FormatToTypedArray;
export type TypedArrayForFormat<T extends Format> = FormatToTypedArray[T];

export const getFormat = (
    componentType: ParsedComponentTypeType,
    accessorType: UnparsedAccessorType,
    normalized: boolean,
): Format => {
    const norm = normalized ? 'norm' : 'int';
    const cnt = accessorTypeMapping[accessorType];
    const x = cnt > 1 ? `x${cnt}` : '';
    switch (componentType) {
        case 'BYTE':
            return `s${norm}8${x}` as Format;
        case 'UNSIGNED_BYTE':
            return `u${norm}8${x}` as Format;
        case 'SHORT':
            return `s${norm}16${x}` as Format;
        case 'UNSIGNED_SHORT':
            return `u${norm}16${x}` as Format;
        case 'UNSIGNED_INT':
            return `u${norm}32${x}` as Format;
        case 'FLOAT':
            return `float32${x}` as Format;
    }
};
