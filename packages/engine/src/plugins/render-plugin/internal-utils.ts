import { GenericCreateVertexBufferLayoutResult, WebgpuUtils } from '@timefold/webgpu';
import { GenericTypedArray, InterleavedLayout, NonInterleavedAttributes, PrimitiveComponent } from '../../components';

// Vertex Layout

const serializePrimitiveState = (primitive: GPUPrimitiveState) => {
    return [
        primitive.cullMode ?? 'back',
        primitive.frontFace ?? 'ccw',
        primitive.topology ?? 'triangle-list',
        primitive.stripIndexFormat,
        primitive.unclippedDepth,
    ]
        .filter(Boolean)
        .join(':');
};

const serializeLayout = (layout: InterleavedLayout) => {
    return Object.keys(layout)
        .map((key) => {
            const value = layout[key];
            return `${key}:${value.format}:${value.stride}`;
        })
        .join('|');
};

const serializeAttribs = (attribs: NonInterleavedAttributes) => {
    return Object.keys(attribs)
        .map((key) => {
            const value = attribs[key];
            return `${key}:${value.format}`;
        })
        .join('|');
};

export const serializePrimitiveLayout = (primitive: PrimitiveComponent): string => {
    const primtiveKey = serializePrimitiveState(primitive.data.primitive);

    const layoutKey =
        primitive.type === '@tf/InterleavedPrimitive'
            ? serializeLayout(primitive.data.layout)
            : serializeAttribs(primitive.data.attributes);

    return `${primitive.type}-${primtiveKey}-${layoutKey}`;
};

// Vertex and Index

type VertexBuffer = { slot: number; buffer: GPUBuffer };
export type Vertex = { buffers: VertexBuffer[]; count: number };
export type Index = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };
export type RenderablePrimitive = { vertex: Vertex; index?: Index };

const getData = (attribs: NonInterleavedAttributes) => {
    const data = {} as { position: Float32Array } & Record<string, GenericTypedArray>;

    for (const key of Object.keys(attribs)) {
        data[key] = attribs[key].data;
    }

    return data;
};

export const getVertexAndIndexFromPrimitive = (
    device: GPUDevice,
    primitiveLayout: GenericCreateVertexBufferLayoutResult,
    primitive: PrimitiveComponent,
): { vertex: Vertex; index?: Index } | undefined => {
    const vertex =
        primitiveLayout.mode === 'interleaved'
            ? primitive.type === '@tf/InterleavedPrimitive'
                ? primitiveLayout.createBuffer(device, primitive.data.vertices)
                : undefined
            : primitive.type === '@tf/NonInterleavedPrimitive'
              ? primitiveLayout.createBuffers(device, getData(primitive.data.attributes))
              : undefined;

    if (vertex === undefined) {
        return undefined;
    }

    const index = primitive.data.indices
        ? WebgpuUtils.createIndexBuffer(device, {
              format: primitive.data.indices instanceof Uint16Array ? 'uint16' : 'uint32',
              data: primitive.data.indices,
          })
        : undefined;

    const buffers =
        vertex.mode === 'interleaved' ? [{ buffer: vertex.buffer, slot: vertex.slot }] : Object.values(vertex.attribs);

    const count = vertex.mode === 'interleaved' ? vertex.count : vertex.attribs.position.count;

    return { vertex: { buffers, count }, index };
};

// Bindgroup

export type BindgroupResult<Buffers extends Record<string, GPUBuffer>> = {
    group: number;
    bindGroup: GPUBindGroup;
    buffers: Buffers;
};

type BindgroupBinding = {
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

export type Bindgroup = {
    group: number;
    bindgroup: GPUBindGroup;
    binding: BindgroupBinding;
};
