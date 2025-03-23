import { getFormat } from './format';
import { objectKeys } from './internal';
import { accessorTypeMapping, componentTypeMapping, primitiveModeMapping } from './mappings';
import {
    ParsedGltf2Primitive,
    ParsedGltf2PrimitiveLayout,
    ParsedGltf2PrimitiveLayoutAttributes,
    Gltf2Attribute,
    UnparsedGltf2Primitive,
    UnparsedGltf2Result,
    ParsedGltf2PrimitiveInterleaved,
    ParsedGltf2PrimitiveNonInterleaved,
    ParsedGltf2AttributesNonInterleaved,
} from './types';

export const parsePrimitiveLayout = (
    unparsedGltf: UnparsedGltf2Result,
    primitive: UnparsedGltf2Primitive,
): { key: string; primitiveLayout: ParsedGltf2PrimitiveLayout } => {
    const mode = primitive.mode ? primitiveModeMapping[primitive.mode] : 'triangle-list';
    const attribKeys: string[] = [];

    const bufferViewSet = new Set<number>();
    const attributeKeys = objectKeys(primitive.attributes);

    attributeKeys.forEach((key) => {
        const accessorIdx = primitive.attributes[key as Gltf2Attribute] as number;
        const accessor = unparsedGltf.accessors[accessorIdx];
        bufferViewSet.add(accessor.bufferView);
    });

    const isInterleaved = attributeKeys.length > 1 && bufferViewSet.size === 1;

    const attributes = attributeKeys.reduce((accum, key) => {
        const accessorIdx = primitive.attributes[key as Gltf2Attribute] as number;
        const accessor = unparsedGltf.accessors[accessorIdx];
        const bufferView = unparsedGltf.bufferViews[accessor.bufferView];
        const mapping = componentTypeMapping[accessor.componentType];
        const format = getFormat(mapping.type, accessor.type, accessor.normalized ?? false);

        const byteOffset = (accessor.byteOffset || 0) + bufferView.byteOffset;
        const byteSize = mapping.byteSize;

        attribKeys.push(`${key}:${format}`);

        accum[key] = {
            format: format as never,
            offset: isInterleaved ? byteOffset / byteSize : 0,
        };
        return accum;
    }, {} as ParsedGltf2PrimitiveLayoutAttributes);

    const modeAndAttribs = `${mode}(${attribKeys.sort().join('|')})`;
    const key = isInterleaved ? `interleaved(${modeAndAttribs})` : `non-interleaved(${modeAndAttribs})`;

    return {
        key,
        primitiveLayout: {
            type: isInterleaved ? 'interleaved' : 'non-interleaved',
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
    parsedPrimitiveLayout: ParsedGltf2PrimitiveLayout,
    parsedPrimitiveLayoutIndex: number,
    mesh: number,
    primitive: UnparsedGltf2Primitive,
): ParsedGltf2Primitive => {
    if (parsedPrimitiveLayout.type === 'interleaved') {
        // Assume that all bufferViews point are the same as the one for 'POSITION'
        const accessorIdx = primitive.attributes.POSITION;
        const accessor = unparsedGltf.accessors[accessorIdx];
        const bufferView = unparsedGltf.bufferViews[accessor.bufferView];
        const arrayBuffer = buffers[bufferView.buffer];
        const mapping = componentTypeMapping[accessor.componentType];

        const byteOffset = (accessor.byteOffset || 0) + bufferView.byteOffset;

        const parsedPrimitive: ParsedGltf2PrimitiveInterleaved = {
            type: 'interleaved',
            primitiveLayout: parsedPrimitiveLayoutIndex,
            mesh,
            material: primitive.material,
            mode: primitive.mode ? primitiveModeMapping[primitive.mode] : 'triangle-list',
            vertices: mapping.createView(arrayBuffer, byteOffset, bufferView.byteLength / mapping.byteSize) as never,
            indices: getIndices(unparsedGltf, buffers, primitive.indices),
        };

        return parsedPrimitive;
    }

    const parsedPrimitive: ParsedGltf2PrimitiveNonInterleaved = {
        type: 'non-interleaved',
        primitiveLayout: parsedPrimitiveLayoutIndex,
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

            const byteOffset = (accessor.byteOffset || 0) + bufferView.byteOffset;
            const size = accessor.count * accessorTypeMapping[accessor.type];

            accum[key] = mapping.createView(arrayBuffer, byteOffset, size) as never;
            return accum;
        }, {} as ParsedGltf2AttributesNonInterleaved),
        indices: getIndices(unparsedGltf, buffers, primitive.indices),
    };

    return parsedPrimitive;
};
