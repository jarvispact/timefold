import { createComponent } from '@timefold/ecs';
import { GenericInterleavedObjPrimitive } from '@timefold/obj';
import {
    InterleavedLayout,
    InterleavedPrimitiveType,
    InterleavedPrimitiveData,
    InterleavedPrimitiveComponent,
} from './types';

export const type: InterleavedPrimitiveType = '@tf/InterleavedPrimitive';

type Args = Omit<InterleavedPrimitiveData, 'primitive'> & { primitive?: GPUPrimitiveState };

const defaultPrimitive: GPUPrimitiveState = {
    cullMode: 'back',
    topology: 'triangle-list',
};

export const create = (args: Args): InterleavedPrimitiveComponent => {
    return createComponent(type, { ...args, primitive: { ...defaultPrimitive, ...args.primitive } });
};

const ensureFloat32Array = (array: number[] | Float32Array) =>
    array instanceof Float32Array ? array : new Float32Array(array);

const ensureUint32Array = (array: number[] | Uint32Array) =>
    array instanceof Uint32Array ? array : new Uint32Array(array);

const objLayout: InterleavedLayout = {
    position: { format: 'float32x3', stride: 0 },
    uv: { format: 'float32x2', stride: 3 },
    normal: { format: 'float32x3', stride: 5 },
};

export const fromObjPrimitive = (objPrimitive: GenericInterleavedObjPrimitive): InterleavedPrimitiveComponent => {
    return createComponent(type, {
        mode: 'interleaved',
        layout: objLayout,
        primitive: { ...defaultPrimitive },
        vertices: ensureFloat32Array(objPrimitive.vertices),
        indices: 'indices' in objPrimitive ? ensureUint32Array(objPrimitive.indices) : undefined,
    });
};
