import {
    ArrayBufferMode,
    createView,
    GenericMode,
    NumberTupleMode,
    SharedArrayBufferMode,
    TypedArrayOrTuple,
    ViewConfigEntry,
    ViewForViewConstructor,
} from './internal-utils';
import { lookupTable, LookupTableEntry, WgslType, wgslTypes } from './lookup-table';

export type CreateResult<Mode extends GenericMode, Type extends WgslType> = GenericMode extends Mode
    ? { buffer: ArrayBuffer; view: TypedArrayOrTuple<Type, ArrayBuffer, ArrayBufferMode> }
    : Mode extends NumberTupleMode
      ? { view: TypedArrayOrTuple<Type, ArrayBufferLike, NumberTupleMode> }
      : Mode extends SharedArrayBufferMode
        ? {
              buffer: SharedArrayBuffer;
              view: TypedArrayOrTuple<Type, SharedArrayBuffer, SharedArrayBufferMode>;
          }
        : { buffer: ArrayBuffer; view: TypedArrayOrTuple<Type, ArrayBuffer, ArrayBufferMode> };

export type Type<T extends WgslType> = {
    type: T;
    wgsl: { type: string };
    bufferSize: number;
    viewConfig: ViewConfigEntry;
    create: <Mode extends GenericMode>(args?: { mode?: Mode }) => CreateResult<Mode, T>;
    fromBuffer: <Buffer extends ArrayBufferLike>(
        buffer: Buffer,
    ) => ViewForViewConstructor<Buffer>[LookupTableEntry<T>['type']];
};

export const type = <T extends WgslType>(type: T): Type<T> => {
    const entry = lookupTable[type];
    const bufferSize = entry.size;
    const viewConfig = { type, scalar: entry.type, byteOffset: 0, elements: entry.elements };
    return {
        type,
        wgsl: { type },
        bufferSize,
        viewConfig,
        create: <Mode extends GenericMode>(args?: { mode?: Mode }) => {
            const mode = args?.mode ?? 'array-buffer';

            if (mode === 'number-tuple') {
                return { view: entry.create() } as unknown as CreateResult<Mode, T>;
            }

            const buffer =
                mode === 'shared-array-buffer' ? new SharedArrayBuffer(entry.size) : new ArrayBuffer(entry.size);

            const view = createView(entry.type, buffer, 0, entry.elements);

            return { buffer, view } as unknown as CreateResult<Mode, T>;
        },
        fromBuffer: <Buffer extends ArrayBufferLike>(buffer: Buffer) =>
            createView(
                entry.type,
                buffer,
                0,
                entry.elements,
            ) as ViewForViewConstructor<Buffer>[LookupTableEntry<T>['type']],
    };
};

export const isType = (value: unknown): value is Type<WgslType> =>
    typeof value === 'object' &&
    !!value &&
    'type' in value &&
    typeof value.type === 'string' &&
    wgslTypes.includes(value.type);
