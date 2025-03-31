import {
    Gltf2AttributeWithoutPosition,
    ParsedGltf2CameraOrthographic,
    ParsedGltf2CameraPerspective,
    ParsedGltf2Primitive,
    ParsedGltf2PrimitiveInterleaved,
    ParsedGltf2PrimitiveLayout,
    ParsedGltf2PrimitiveLayoutWithAttribs,
    ParsedGltf2PrimitiveNonInterleaved,
    ParsedGltf2PrimitiveNonInterleavedWithAttribs,
    ParsedGltf2PrimitiveWithIndices,
} from './types';

export const isInterleavedPrimitive = (primitive: unknown): primitive is ParsedGltf2PrimitiveInterleaved =>
    typeof primitive === 'object' && !!primitive && 'type' in primitive && primitive.type === 'interleaved';

export const isNonInterleavedPrimitive = (primitive: unknown): primitive is ParsedGltf2PrimitiveNonInterleaved =>
    typeof primitive === 'object' && !!primitive && 'type' in primitive && primitive.type === 'non-interleaved';

export const isOrthographicCamera = (camera: unknown): camera is ParsedGltf2CameraOrthographic =>
    typeof camera === 'object' && !!camera && 'type' in camera && camera.type === 'orthographic';

export const isPerspectiveCamera = (camera: unknown): camera is ParsedGltf2CameraPerspective =>
    typeof camera === 'object' && !!camera && 'type' in camera && camera.type === 'perspective';

export const primitiveLayoutHasRequiredAttribs = <Attribs extends readonly Gltf2AttributeWithoutPosition[]>(
    layout: ParsedGltf2PrimitiveLayout,
    attribs: Attribs,
): layout is ParsedGltf2PrimitiveLayoutWithAttribs<Attribs> => attribs.every((key) => !!layout.attributes[key]);

export const primitiveIsInterleaved = (primitive: ParsedGltf2Primitive): primitive is ParsedGltf2PrimitiveInterleaved =>
    primitive.type === 'interleaved';

export const primitiveIsNonInterleaved = (
    primitive: ParsedGltf2Primitive,
): primitive is ParsedGltf2PrimitiveNonInterleaved => primitive.type === 'non-interleaved';

export const primitiveHasRequiredAttribs = <Attribs extends readonly Gltf2AttributeWithoutPosition[]>(
    primitive: ParsedGltf2PrimitiveNonInterleaved,
    attribs: Attribs,
): primitive is ParsedGltf2PrimitiveNonInterleavedWithAttribs<Attribs> =>
    attribs.every((key) => !!primitive.attributes[key]);

export const primitiveHasIndices = <Primitive extends ParsedGltf2Primitive>(
    primitive: Primitive,
): primitive is ParsedGltf2PrimitiveWithIndices<Primitive> => !!primitive.indices;
