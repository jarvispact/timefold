import { Format, PositionFormat } from './format';
import { Mat4x4, Vec4, Vec3 } from './internal';
import {
    ParsedComponentTypeIndexFormat,
    ParsedComponentTypeView,
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

type Gltf2PositionAttributeMap = {
    POSITION: Float32Array;
};

type Gltf2AttributeWithoutPositionMap = {
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
};

export type Gltf2PositionAttribute = keyof Gltf2PositionAttributeMap;
export type Gltf2AttributeWithoutPosition = keyof Gltf2AttributeWithoutPositionMap;
export type Gltf2Attribute = Gltf2PositionAttribute | Gltf2AttributeWithoutPosition;

type Attributes<PositionValue, WithoutPositionValue, OtherValue> = {
    [Name in Gltf2PositionAttribute]: PositionValue;
} & Partial<{
    [Name in Gltf2AttributeWithoutPosition]: WithoutPositionValue;
}> & {
        [Name in `_${string}`]: OtherValue;
    };

export type UnparsedGltf2PrimitiveAttributes = Attributes<number, number, number>;

export type UnparsedGltf2Primitive = {
    mode?: UnparsedGltf2PrimitiveMode;
    attributes: UnparsedGltf2PrimitiveAttributes;
    indices?: number;
    material?: number;
};

export type UnparsedGltf2Mesh = {
    name: string;
    primitives: UnparsedGltf2Primitive[];
};

export type UnparsedGltf2Accessor = {
    bufferView: number;
    byteOffset?: number;
    componentType: UnparsedComponentType;
    count: number;
    type: UnparsedAccessorType;
    min?: number[];
    max?: number[];
    normalized?: boolean;
};

export type UnparsedGltf2BufferView = {
    buffer: number;
    byteLength: number;
    byteOffset: number;
    byteStride?: number;
    target: UnparsedBufferViewTarget;
};

export type UnparsedGltf2Buffer = { byteLength: number; uri: string };

type UnparsedGltf2ImageBase = { mimeType: string; name: string };
export type UnparsedGltf2ImageWithBufferView = UnparsedGltf2ImageBase & { bufferView: number };
export type UnparsedGltf2ImageWithUri = UnparsedGltf2ImageBase & { uri: string };
export type UnparsedGltf2Image = UnparsedGltf2ImageWithBufferView | UnparsedGltf2ImageWithUri;

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
    resolveImageUrl?: (uri: string) => string;
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

export type ParsedGltf2PbrMetallicRoughnessMaterial = {
    type: 'pbr-metallic-roughness';
    materialType: number;
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
    opacity: number;
};

export type ParsedGltf2Material = ParsedGltf2PbrMetallicRoughnessMaterial | { type: 'unknown'; name: string };

export type ParsedGltf2MaterialType = {
    type: 'pbr-metallic-roughness' | 'unknown';
    transparent: boolean;
    doubleSided: boolean;
};

export type ParsedGltf2PrimitiveLayoutAttributes = Attributes<
    { format: PositionFormat; offset: number },
    { format: Format; offset: number },
    { format: Format; offset: number }
>;

export type ParsedGltf2PrimitiveLayout = {
    type: 'interleaved' | 'non-interleaved';
    mode: ParsedGltf2PrimitiveMode;
    attributes: ParsedGltf2PrimitiveLayoutAttributes;
};

export type ParsedGltf2AttributesNonInterleaved = Attributes<
    Gltf2PositionAttributeMap[Gltf2PositionAttribute],
    Gltf2AttributeWithoutPositionMap[Gltf2AttributeWithoutPosition],
    ParsedComponentTypeView
>;

export type ParsedGltf2PrimitiveBase = {
    primitiveLayout: number;
    mesh: number;
    material?: number;
    mode: ParsedGltf2PrimitiveMode;
    indices?: { format: ParsedComponentTypeIndexFormat; data: Uint16Array | Uint32Array };
};

export type ParsedGltf2PrimitiveInterleaved = ParsedGltf2PrimitiveBase & {
    type: 'interleaved';
    vertices: Float32Array;
};

export type ParsedGltf2PrimitiveNonInterleaved = ParsedGltf2PrimitiveBase & {
    type: 'non-interleaved';
    attributes: ParsedGltf2AttributesNonInterleaved;
};

export type ParsedGltf2Primitive = ParsedGltf2PrimitiveInterleaved | ParsedGltf2PrimitiveNonInterleaved;

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
    materialTypes: ParsedGltf2MaterialType[];
    materials: ParsedGltf2Material[];
    primitiveLayouts: ParsedGltf2PrimitiveLayout[];
    primitives: ParsedGltf2Primitive[];
    meshes: ParsedGltf2Mesh[];
    meshesForPrimitive: Record<number, number[]>;
    scenes: ParsedGltf2Scene[];
    activeScene: number;
};
