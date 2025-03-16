import { objectKeys } from './internal';
import { accessorTypeMapping, componentTypeMapping, primitiveModeMapping } from './mappings';
import { ParsedGltf2Attributes, ParsedGltf2Primitive, UnparsedGltf2Primitive, UnparsedGltf2Result } from './types';

const getIndices = (
    unparsedGltf: UnparsedGltf2Result,
    buffers: ArrayBuffer[],
    indices: number | undefined,
): ParsedGltf2Primitive['indices'] => {
    if (!indices) return undefined;

    const accessor = unparsedGltf.accessors[indices];
    const bufferView = unparsedGltf.bufferViews[accessor.bufferView];
    const arrayBuffer = buffers[bufferView.buffer];
    const mapping = componentTypeMapping[accessor.componentType];

    const byteOffset = (accessor.byteOffset || 0) + (bufferView.byteOffset || 0);
    const size = accessor.count * accessorTypeMapping[accessor.type];

    return {
        type: mapping.type,
        // @ts-expect-error - TODO fix this
        data: new mapping.ctor(arrayBuffer, byteOffset, size),
    };
};

export const parsePrimitive = (
    unparsedGltf: UnparsedGltf2Result,
    buffers: ArrayBuffer[],
    mesh: number,
    primitive: UnparsedGltf2Primitive,
): ParsedGltf2Primitive => {
    return {
        mesh,
        // primitiveLayout: -1, // Set later
        material: primitive.material,
        mode: primitive.mode ? primitiveModeMapping[primitive.mode] : 'triangle-list',
        attributes: objectKeys(primitive.attributes).reduce((accum, key) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const accessorIdx = primitive.attributes[key]!; // TODO
            const accessor = unparsedGltf.accessors[accessorIdx];
            const bufferView = unparsedGltf.bufferViews[accessor.bufferView];
            const arrayBuffer = buffers[bufferView.buffer];
            const mapping = componentTypeMapping[accessor.componentType];

            const byteOffset = (accessor.byteOffset || 0) + (bufferView.byteOffset || 0);
            const size = accessor.count * accessorTypeMapping[accessor.type];

            // @ts-expect-error - type issue
            accum[key] = new mapping.ctor(arrayBuffer, byteOffset, size);
            return accum;
        }, {} as ParsedGltf2Attributes),
        indices: getIndices(unparsedGltf, buffers, primitive.indices),
    };
};
