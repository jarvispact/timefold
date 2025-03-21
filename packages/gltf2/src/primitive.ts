import { getFormat } from './format';
import { objectKeys } from './internal';
import { accessorTypeMapping, componentTypeMapping, primitiveModeMapping } from './mappings';
import {
    ParsedGltf2Attributes,
    ParsedGltf2Primitive,
    ParsedGltf2PrimitiveLayout,
    ParsedGltf2PrimitiveLayoutAttributes,
    Gltf2Attribute,
    UnparsedGltf2Primitive,
    UnparsedGltf2Result,
} from './types';

// TODO: Should it also generate the layout directly?
// https://toji.dev/webgpu-gltf-case-study/#:~:text=we%20still%20need%20to%20treat%20those%20as%20separate%20buffers
export const parsePrimitiveLayout = (
    unparsedGltf: UnparsedGltf2Result,
    primitive: UnparsedGltf2Primitive,
): { key: string; primitiveLayout: ParsedGltf2PrimitiveLayout } => {
    const mode = primitive.mode ? primitiveModeMapping[primitive.mode] : 'triangle-list';
    const attribKeys: string[] = [];

    const attributes = objectKeys(primitive.attributes).reduce((accum, key) => {
        const accessorIdx = primitive.attributes[key as Gltf2Attribute] as number;
        const accessor = unparsedGltf.accessors[accessorIdx];
        const mapping = componentTypeMapping[accessor.componentType];
        const format = getFormat(mapping.type, accessor.type, accessor.normalized ?? false);
        attribKeys.push(`${key}:${format}`);
        accum[key] = format as never;
        return accum;
    }, {} as ParsedGltf2PrimitiveLayoutAttributes);

    const key = `${mode}(${attribKeys.sort().join('|')})`;

    return {
        key,
        primitiveLayout: {
            mode,
            attributes,
        },
    };
};

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

    const byteOffset = (accessor.byteOffset || 0) + bufferView.byteOffset;
    const size = accessor.count * accessorTypeMapping[accessor.type];

    return {
        format: mapping.indexFormat,
        data: mapping.createView(arrayBuffer, byteOffset, size) as Uint16Array | Uint32Array,
    };
};

export const parsePrimitive = (
    unparsedGltf: UnparsedGltf2Result,
    buffers: ArrayBuffer[],
    primitiveLayout: number,
    mesh: number,
    primitive: UnparsedGltf2Primitive,
): ParsedGltf2Primitive => {
    return {
        primitiveLayout,
        mesh,
        material: primitive.material,
        mode: primitive.mode ? primitiveModeMapping[primitive.mode] : 'triangle-list',
        attributes: objectKeys(primitive.attributes).reduce((accum, key) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const accessorIdx = primitive.attributes[key]!; // expect that gltf2 exporters do the correct thing
            const accessor = unparsedGltf.accessors[accessorIdx];
            const bufferView = unparsedGltf.bufferViews[accessor.bufferView];
            const arrayBuffer = buffers[bufferView.buffer];
            const mapping = componentTypeMapping[accessor.componentType];

            const byteOffset = (accessor.byteOffset || 0) + (bufferView.byteOffset || 0);
            const size = accessor.count * accessorTypeMapping[accessor.type];

            accum[key] = mapping.createView(arrayBuffer, byteOffset, size) as never;
            return accum;
        }, {} as ParsedGltf2Attributes),
        indices: getIndices(unparsedGltf, buffers, primitive.indices),
    };
};
