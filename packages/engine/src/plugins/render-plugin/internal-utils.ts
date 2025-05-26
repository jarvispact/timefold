import { GenericCreateVertexBufferLayoutResult, WebgpuUtils } from '@timefold/webgpu';
import { GenericTypedArray, NonInterleavedAttributes, PrimitiveComponent } from '../../components';

type VertexBuffer = { slot: number; buffer: GPUBuffer };
export type Vertex = { buffers: VertexBuffer[]; count: number };
export type Index = { buffer: GPUBuffer; format: GPUIndexFormat; count: number };

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
