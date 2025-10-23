import { createComponent } from '@timefold/ecs';
import { GenericInterleavedObjPrimitive, InterleavedInfo } from '@timefold/obj';
import {
    InterleavedLayout,
    InterleavedPrimitiveData,
    InterleavedPrimitiveComponent,
    EngineComponentType,
} from './types';
import { ensureFloat32Array, ensureUint32Array } from '../internal';

export const type = EngineComponentType.InterleavedPrimitive;

type Args = Omit<InterleavedPrimitiveData, 'primitive'> & { primitive?: GPUPrimitiveState };

const defaultPrimitive: GPUPrimitiveState = {
    cullMode: 'back',
    topology: 'triangle-list',
};

export const create = (args: Args): InterleavedPrimitiveComponent => {
    return createComponent(type, { ...args, primitive: { ...defaultPrimitive, ...args.primitive } });
};

const layoutFromObjInfo = (info: InterleavedInfo): InterleavedLayout => {
    return {
        position: { format: 'float32x3', stride: info.positionOffset },
        uv: { format: 'float32x2', stride: info.uvOffset },
        normal: { format: 'float32x3', stride: info.normalOffset },
    };
};

export const fromObjPrimitive = (
    objPrimitive: GenericInterleavedObjPrimitive,
    info: InterleavedInfo,
): InterleavedPrimitiveComponent => {
    return createComponent(type, {
        layout: layoutFromObjInfo(info),
        primitive: { ...defaultPrimitive },
        vertices: ensureFloat32Array(objPrimitive.vertices),
        indices: 'indices' in objPrimitive ? ensureUint32Array(objPrimitive.indices) : undefined,
    });
};
