import { Mat4x4, Vec4, Vec3 } from './internal';
import {
    ParsedComponentTypeType,
    ParsedGltf2PrimitiveMode,
    ParsedSamplerMagFilter,
    ParsedSamplerMinFilter,
    ParsedSamplerWrap,
    UnparsedAccessorType,
    UnparsedAnimationChannelPath,
    UnparsedBufferViewTarget,
    UnparsedComponentType,
    UnparsedGltf2PrimitiveMode,
    UnparsedSamplerMagFilter,
    UnparsedSamplerMinFilter,
    UnparsedSamplerWrap,
} from './mappings';

// ============================
// ============================
// Unparsed Gltf

export type UnparsedGltf2Scene = {
    name: string;
    nodes: number[];
};

export type UnparsedGltf2MeshNode = {
    mesh: number;
    name: string;
    translation?: Vec3;
    scale?: Vec3;
    rotation?: Vec4;
    matrix?: Mat4x4;
};

export type UnparseGltf2CameraNode = {
    camera: number;
    name: string;
};

export type UnparsedGltf2Node = UnparsedGltf2MeshNode | UnparseGltf2CameraNode;

export type UnparsedGltf2Camera =
    | {
          type: 'perspective';
          perspective: {
              aspectRatio: number;
              yfov: number;
              zfar: number;
              znear: number;
          };
          name: string;
      }
    | {
          type: 'orthographic';
          orthographic: { xmag: number; ymag: number; znear: number; zfar: number };
          name: string;
      };

type UnparsedGltf2PositionAttributeMap = {
    POSITION: Float32Array;
};

type UnparsedGltf2PositionAttribute = keyof UnparsedGltf2PositionAttributeMap;

type UnparsedGltf2AttributeWithoutPositionMap = {
    NORMAL: Float32Array;
    TANGENT: Float32Array;
    TEXCOORD_0: Float32Array;
    TEXCOORD_1: Float32Array;
    TEXCOORD_2: Float32Array;
    COLOR_0: Float32Array;
    COLOR_1: Float32Array;
    COLOR_2: Float32Array;
    JOINTS_0: Float32Array;
    JOINTS_1: Float32Array;
    JOINTS_2: Float32Array;
    WEIGHTS_0: Float32Array;
    WEIGHTS_1: Float32Array;
    WEIGHTS_2: Float32Array;
    // [`_${string}`]: Float32Array;
};

type UnparsedGltf2AttributeWithoutPosition = keyof UnparsedGltf2AttributeWithoutPositionMap;

export type UnparsedGltf2Attribute = UnparsedGltf2PositionAttribute | UnparsedGltf2AttributeWithoutPosition;

export type UnparsedGltf2Primitive = {
    mode?: UnparsedGltf2PrimitiveMode;
    attributes: {
        [Name in UnparsedGltf2PositionAttribute]: number;
    } & Partial<{
        [Name in UnparsedGltf2AttributeWithoutPosition]: number;
    }>;
    indices?: number;
    material?: number;
};

export type UnparsedGltf2Mesh = {
    name: string;
    primitives: UnparsedGltf2Primitive[];
};

export type UnparsedGltf2Accessor = {
    bufferView: number;
    byteOffset: number;
    componentType: UnparsedComponentType;
    count: number;
    type: UnparsedAccessorType;
    min?: number[];
    max?: number[];
};

export type UnparsedGltf2BufferView = {
    buffer: number;
    byteLength: number;
    byteOffset: number;
    target: UnparsedBufferViewTarget;
};

export type UnparsedGltf2Buffer = { byteLength: number; uri: string };

export type UnparsedGltf2Image = { bufferView: number; mimeType: string; name: string };

export type UnparsedGltf2Texture = { source: number; sampler?: number };

export type UnparsedGltf2Sampler = {
    magFilter: UnparsedSamplerMagFilter;
    minFilter: UnparsedSamplerMinFilter;
    wrapS?: UnparsedSamplerWrap;
    wrapT?: UnparsedSamplerWrap;
};

export type UnparsedGltf2PbrMetallicRoughnessMaterial = {
    name: string;
    doubleSided?: boolean;
    alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND';
    alphaCutoff?: number;
    pbrMetallicRoughness: {
        baseColorFactor?: Vec4;
        metallicFactor?: number;
        roughnessFactor?: number;
        baseColorTexture?: { index: number };
        metallicRoughnessTexture?: { index: number };
    };
    emissiveFactor?: Vec3;
    normalTexture?: { index: number };
    occlusionTexture?: { index: number };
    emissiveTexture?: { index: number };
};

export type UnparsedGltf2Material = UnparsedGltf2PbrMetallicRoughnessMaterial | { name: string }; // union of all the material types

export type UnparsedGltf2AnimationChannelTarget = {
    node: number;
    path: UnparsedAnimationChannelPath;
};

export type UnparsedGltf2AnimationChannel = {
    sampler: number;
    target: UnparsedGltf2AnimationChannelTarget;
};

export type UnparsedGltf2AnimationSampler = {
    input: number;
    output: number;
    interpolation: 'LINEAR' | 'STEP' | 'CUBICSPLINE';
};

export type UnparsedGltf2Animation = {
    name: string;
    channels: UnparsedGltf2AnimationChannel[];
    samplers: UnparsedGltf2AnimationSampler[];
};

export type UnparsedGltf2Result = {
    scenes: UnparsedGltf2Scene[];
    scene: number;
    cameras?: UnparsedGltf2Camera[];
    meshes: UnparsedGltf2Mesh[];
    materials: UnparsedGltf2Material[];
    nodes: UnparsedGltf2Node[];
    accessors: UnparsedGltf2Accessor[];
    bufferViews: UnparsedGltf2BufferView[];
    buffers: UnparsedGltf2Buffer[];
    images?: UnparsedGltf2Image[];
    textures?: UnparsedGltf2Texture[];
    samplers?: UnparsedGltf2Sampler[];
    animations?: UnparsedGltf2Animation[];
};

// ============================
// ============================
// Parser Options

export type Gltf2ParserOptions = {
    resolveBufferUrl?: (uri: string) => string;
};

// ============================
// ============================
// Parsed Gltf

export type ParsedGltf2Sampler = {
    magFilter: ParsedSamplerMagFilter;
    minFilter: ParsedSamplerMinFilter;
    wrapS: ParsedSamplerWrap;
    wrapT: ParsedSamplerWrap;
};

export type ParsedGltf2Texture = {
    name: string;
    image: ImageBitmap;
    sampler: ParsedGltf2Sampler;
};

export type ParsedGltf2PbrMetallicRoughnessMaterialBase = {
    name: string;
    baseColor: Vec3;
    baseColorTexture?: number;
    metallic: number;
    metallicTexture?: number;
    roughness: number;
    roughnessTexture?: number;
    emissive?: Vec3;
    emissiveTexture?: number;
    normalTexture?: number;
};

export type ParsedGltf2PbrMetallicRoughnessMaterialOpaque = ParsedGltf2PbrMetallicRoughnessMaterialBase & {
    type: 'pbr-metallic-roughness-opaque';
};

export type ParsedGltf2PbrMetallicRoughnessMaterialTransparent = ParsedGltf2PbrMetallicRoughnessMaterialBase & {
    type: 'pbr-metallic-roughness-transparent';
    opacity: number;
};

export type ParsedGltf2PbrMetallicRoughnessMaterialOpaqueDoubleSided = ParsedGltf2PbrMetallicRoughnessMaterialBase & {
    type: 'pbr-metallic-roughness-opaque-ds';
};

export type ParsedGltf2PbrMetallicRoughnessMaterialTransparentDoubleSided =
    ParsedGltf2PbrMetallicRoughnessMaterialBase & {
        type: 'pbr-metallic-roughness-transparent-ds';
        opacity: number;
    };

export type ParsedGltf2Material =
    | ParsedGltf2PbrMetallicRoughnessMaterialOpaque
    | ParsedGltf2PbrMetallicRoughnessMaterialTransparent
    | ParsedGltf2PbrMetallicRoughnessMaterialOpaqueDoubleSided
    | ParsedGltf2PbrMetallicRoughnessMaterialTransparentDoubleSided
    | { type: 'unknown'; name: string };

export type ParsedGltf2MaterialType = ParsedGltf2Material['type'];

export type ParsedGltf2PositionAttributeFormat = 'float32' | 'float32x2' | 'float32x3' | 'float32x4';

// TODO: others
export type ParsedGltf2AttributeFormat =
    | ParsedGltf2PositionAttributeFormat
    | 'sint32'
    | 'sint32x2'
    | 'sint32x3'
    | 'sint32x4';

export type ParsedGltf2Attributes = {
    [Name in keyof UnparsedGltf2PositionAttributeMap]: UnparsedGltf2PositionAttributeMap[Name];
} & Partial<{
    [Name in keyof UnparsedGltf2AttributeWithoutPositionMap]: UnparsedGltf2AttributeWithoutPositionMap[Name];
}>;

type TypedIndexArray = Uint16Array | Uint32Array;

export type ParsedGltf2Primitive = {
    mesh: number;
    material?: number;
    mode: ParsedGltf2PrimitiveMode;
    attributes: ParsedGltf2Attributes;
    indices?: { type: ParsedComponentTypeType; data: TypedIndexArray };
};

export type ParsedGltf2MeshPrimitive = {
    primitive: number;
    material?: number;
};

export type ParsedGltf2Mesh = {
    name: string;
    translation: Vec3;
    rotation: Vec4;
    scale: Vec3;
    primitives: ParsedGltf2MeshPrimitive[];
};

export type ParsedGltf2Scene = {
    name: string;
    nodes: number[];
};

export type ParsedGltf2Result = {
    textures: ParsedGltf2Texture[];
    materials: ParsedGltf2Material[];
    materialTypes: ParsedGltf2MaterialType[];
    primitives: ParsedGltf2Primitive[];
    meshes: ParsedGltf2Mesh[];
    scenes: ParsedGltf2Scene[];
    activeScene: number;
};
