import { getFormat } from './format';
import { objectKeys } from './internal';
import { accessorTypeMapping, componentTypeMapping, primitiveModeMapping } from './mappings';
import {
    ParsedGltf2Attributes,
    ParsedGltf2Primitive,
    ParsedGltf2PrimitiveLayout,
    UnparsedGltf2Primitive,
    UnparsedGltf2Result,
} from './types';

// TODO: rename offset to stride here and in @timefold/webgpu
export const parsePrimitiveLayout = (
    unparsedGltf: UnparsedGltf2Result,
    primitive: UnparsedGltf2Primitive,
): { key: string; primitiveLayout: ParsedGltf2PrimitiveLayout } => {
    const mode = primitive.mode ? primitiveModeMapping[primitive.mode] : 'triangle-list';
    const attribKeys: string[] = [];

    const bufferViewSet = new Set<number>();

    const attributeKeys = objectKeys(primitive.attributes);
    for (const attributeKey of attributeKeys) {
        const accessorIdx = primitive.attributes[attributeKey] as number;
        const accessor = unparsedGltf.accessors[accessorIdx];
        const mapping = componentTypeMapping[accessor.componentType];
        const format = getFormat(mapping.type, accessor.type, accessor.normalized ?? false);
        attribKeys.push(`${attributeKey}:${format}`);
        bufferViewSet.add(accessor.bufferView);
    }

    const isInterleaved = bufferViewSet.size === 1;
    const modeAndAttribsKey = `${mode}(${attribKeys.sort().join('|')})`;
    // TODO: key is wrong. Can be non-interleaved
    const key = `interleaved(${modeAndAttribsKey})`;

    const attributes = {} as ParsedGltf2PrimitiveLayout['attributes'];

    for (const attributeKey of attributeKeys) {
        const accessorIdx = primitive.attributes[attributeKey] as number;
        const accessor = unparsedGltf.accessors[accessorIdx];
        const bufferView = unparsedGltf.bufferViews[accessor.bufferView];
        const mapping = componentTypeMapping[accessor.componentType];
        const format = getFormat(mapping.type, accessor.type, accessor.normalized ?? false);

        const byteOffset = (accessor.byteOffset || 0) + bufferView.byteOffset;
        const byteSize = mapping.byteSize;

        attributes[attributeKey] = { format: format as never, stride: isInterleaved ? byteOffset / byteSize : 0 };
    }

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
    if (indices === undefined) return undefined;

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
    primitiveLayout: ParsedGltf2PrimitiveLayout,
    primitiveLayoutIndex: number,
    mesh: number,
    primitive: UnparsedGltf2Primitive,
): ParsedGltf2Primitive => {
    if (primitiveLayout.type === 'interleaved') {
        // If the layout is of type "interleaved", we grab the info from the POSITION, but it should be the same for the other attributes
        const accessorIdx = primitive.attributes.POSITION;
        const accessor = unparsedGltf.accessors[accessorIdx];
        const bufferView = unparsedGltf.bufferViews[accessor.bufferView];
        const arrayBuffer = buffers[bufferView.buffer];
        const mapping = componentTypeMapping[accessor.componentType];
        const byteOffset = (accessor.byteOffset || 0) + bufferView.byteOffset;
        const size = bufferView.byteLength / mapping.byteSize;

        return {
            type: 'interleaved',
            primitiveLayout: primitiveLayoutIndex,
            mesh,
            material: primitive.material,
            mode: primitive.mode ? primitiveModeMapping[primitive.mode] : 'triangle-list',
            vertices: mapping.createView(arrayBuffer, byteOffset, size) as Float32Array,
            indices: getIndices(unparsedGltf, buffers, primitive.indices),
        };
    }

    return {
        type: 'non-interleaved',
        primitiveLayout: primitiveLayoutIndex,
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

            accum[key] = mapping.createView(arrayBuffer, byteOffset, size) as Float32Array;
            return accum;
        }, {} as ParsedGltf2Attributes),
        indices: getIndices(unparsedGltf, buffers, primitive.indices),
    };
};
