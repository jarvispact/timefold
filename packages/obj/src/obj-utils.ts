import {
    convertInterleavedToIndexed as _convertInterleavedToIndexed,
    convertNonInterleavedToIndexed as _convertNonInterleavedToIndexed,
    convertInterleavedToTypedArray as _convertInterleavedToTypedArray,
    convertNonInterleavedToTypedArray as _convertNonInterleavedToTypedArray,
} from './internal-utils';
import { GenericObjPrimitive, ObjObject } from './types';

export const convertInterleavedToIndexed = _convertInterleavedToIndexed;
export const convertNonInterleavedToIndexed = _convertNonInterleavedToIndexed;
export const convertInterleavedToTypedArray = _convertInterleavedToTypedArray;
export const convertNonInterleavedToTypedArray = _convertNonInterleavedToTypedArray;

export function indexPrimitivesByMaterial<T extends Record<string, ObjObject>>(objects: T) {
    const primitives = Object.values(objects).flatMap((o) => Object.values(o.primitives));

    const materialToPrimitives = primitives.reduce<Record<string, GenericObjPrimitive[]>>((accum, p) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!accum[p.name]) accum[p.name] = [];
        accum[p.name].push(p);
        return accum;
    }, {});

    return materialToPrimitives as Record<string, T[keyof T]['primitives'][keyof T[keyof T]['primitives']][]>;
}
