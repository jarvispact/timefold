import { createComponent } from '@timefold/ecs';
import { GenericNonInterleavedObjPrimitive } from '@timefold/obj';
import {
    NonInterleavedPrimitiveData,
    NonInterleavedPrimitiveComponent,
    NonInterleavedAttributes,
    EngineComponentType,
} from './types';
import { ensureFloat32Array, ensureUint32Array } from '../internal';

export const type = EngineComponentType.NonInterleavedPrimitive;

type Args<T extends NonInterleavedAttributes> = Omit<NonInterleavedPrimitiveData<T>, 'primitive'> & {
    primitive?: GPUPrimitiveState;
};

const defaultPrimitive: GPUPrimitiveState = {
    cullMode: 'back',
    topology: 'triangle-list',
};

export const create = <T extends NonInterleavedAttributes>(args: Args<T>): NonInterleavedPrimitiveComponent<T> => {
    return createComponent(type, { ...args, primitive: { ...defaultPrimitive, ...args.primitive } });
};

export const fromObjPrimitive = (objPrimitive: GenericNonInterleavedObjPrimitive): NonInterleavedPrimitiveComponent => {
    const attributes: NonInterleavedAttributes = {
        position: { format: 'float32x3', data: ensureFloat32Array(objPrimitive.positions) },
        uv: { format: 'float32x2', data: ensureFloat32Array(objPrimitive.uvs) },
        normal: { format: 'float32x3', data: ensureFloat32Array(objPrimitive.normals) },
    };

    return createComponent(type, {
        primitive: { ...defaultPrimitive },
        attributes,
        indices: 'indices' in objPrimitive ? ensureUint32Array(objPrimitive.indices) : undefined,
    });
};
