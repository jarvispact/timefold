import { getTextureIndex } from './texture';
import {
    ParsedGltf2Material,
    ParsedGltf2PbrMetallicRoughnessMaterialBase,
    ParsedGltf2PbrMetallicRoughnessMaterialOpaque,
    ParsedGltf2PbrMetallicRoughnessMaterialOpaqueDoubleSided,
    ParsedGltf2PbrMetallicRoughnessMaterialTransparent,
    ParsedGltf2PbrMetallicRoughnessMaterialTransparentDoubleSided,
    UnparsedGltf2Material,
    UnparsedGltf2PbrMetallicRoughnessMaterial,
    UnparsedGltf2Result,
} from './types';

const materialIsPbrMetallicRoughnessMaterial = (
    material: UnparsedGltf2Material,
): material is UnparsedGltf2PbrMetallicRoughnessMaterial => 'pbrMetallicRoughness' in material;

export const parseMaterial = (
    unparsedGltf: UnparsedGltf2Result,
    material: UnparsedGltf2Material,
): ParsedGltf2Material => {
    if (materialIsPbrMetallicRoughnessMaterial(material)) {
        const base: ParsedGltf2PbrMetallicRoughnessMaterialBase = {
            name: material.name,
            baseColor: material.pbrMetallicRoughness.baseColorFactor
                ? [
                      material.pbrMetallicRoughness.baseColorFactor[0],
                      material.pbrMetallicRoughness.baseColorFactor[1],
                      material.pbrMetallicRoughness.baseColorFactor[2],
                  ]
                : [0, 0, 0],
            baseColorTexture: getTextureIndex(unparsedGltf, material.pbrMetallicRoughness.baseColorTexture),
            metallic: material.pbrMetallicRoughness.metallicFactor ?? 0.5,
            metallicTexture: getTextureIndex(unparsedGltf, material.pbrMetallicRoughness.metallicRoughnessTexture),
            roughness: material.pbrMetallicRoughness.roughnessFactor ?? 0.5,
            roughnessTexture: getTextureIndex(unparsedGltf, material.pbrMetallicRoughness.metallicRoughnessTexture),
            emissive: material.emissiveFactor,
            emissiveTexture: getTextureIndex(unparsedGltf, material.emissiveTexture),
            normalTexture: getTextureIndex(unparsedGltf, material.normalTexture),
        };

        if (material.alphaMode === 'BLEND' || material.alphaMode === 'MASK') {
            const parsedMaterial:
                | ParsedGltf2PbrMetallicRoughnessMaterialTransparent
                | ParsedGltf2PbrMetallicRoughnessMaterialTransparentDoubleSided = {
                type: material.doubleSided
                    ? 'pbr-metallic-roughness-transparent-ds'
                    : 'pbr-metallic-roughness-transparent',
                ...base,
                opacity:
                    material.alphaMode === 'MASK' && material.alphaCutoff !== undefined
                        ? (material.pbrMetallicRoughness.baseColorFactor?.[3] ?? 1) >= material.alphaCutoff
                            ? 1
                            : 0
                        : 1,
            };
            return parsedMaterial;
        } else {
            const parsedMaterial:
                | ParsedGltf2PbrMetallicRoughnessMaterialOpaque
                | ParsedGltf2PbrMetallicRoughnessMaterialOpaqueDoubleSided = {
                type: material.doubleSided ? 'pbr-metallic-roughness-opaque-ds' : 'pbr-metallic-roughness-opaque',
                ...base,
            };
            return parsedMaterial;
        }
    }

    return { type: 'unknown', name: material.name };
};
