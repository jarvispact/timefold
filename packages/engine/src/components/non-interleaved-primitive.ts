import { createComponent } from '@timefold/ecs';
import { GenericNonInterleavedObjPrimitive } from '@timefold/obj';
import {
    NonInterleavedPrimitiveType,
    NonInterleavedPrimitiveData,
    NonInterleavedPrimitiveComponent,
    NonInterleavedAttributes,
} from './types';

export const type: NonInterleavedPrimitiveType = '@tf/NonInterleavedPrimitive';

export const create = (data: NonInterleavedPrimitiveData): NonInterleavedPrimitiveComponent => {
    return createComponent(type, data);
};

const ensureFloat32Array = (array: number[] | Float32Array) =>
    array instanceof Float32Array ? array : new Float32Array(array);

const ensureUint32Array = (array: number[] | Uint32Array) =>
    array instanceof Uint32Array ? array : new Uint32Array(array);

export const fromObjPrimitive = (objPrimitive: GenericNonInterleavedObjPrimitive): NonInterleavedPrimitiveComponent => {
    const attributes: NonInterleavedAttributes = {
        position: { format: 'float32x3', data: ensureFloat32Array(objPrimitive.positions) },
        uv: { format: 'float32x2', data: ensureFloat32Array(objPrimitive.uvs) },
        normal: { format: 'float32x3', data: ensureFloat32Array(objPrimitive.normals) },
    };

    return createComponent(type, {
        mode: 'non-interleaved',
        attributes,
        indices: 'indices' in objPrimitive ? ensureUint32Array(objPrimitive.indices) : undefined,
    });
};
