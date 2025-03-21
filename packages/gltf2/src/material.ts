import { getTextureIndex } from './texture';
import {
    ParsedGltf2Material,
    ParsedGltf2MaterialType,
    ParsedGltf2PbrMetallicRoughnessMaterial,
    UnparsedGltf2Material,
    UnparsedGltf2PbrMetallicRoughnessMaterial,
    UnparsedGltf2Result,
} from './types';

export const materialIsPbrMetallicRoughnessMaterial = (
    material: UnparsedGltf2Material,
): material is UnparsedGltf2PbrMetallicRoughnessMaterial => 'pbrMetallicRoughness' in material;

export const parseMaterialType = (material: UnparsedGltf2Material): ParsedGltf2MaterialType => {
    const pbrMaterial = materialIsPbrMetallicRoughnessMaterial(material) ? material : undefined;
    return {
        type: pbrMaterial ? 'pbr-metallic-roughness' : 'unknown',
        transparent: pbrMaterial ? pbrMaterial.alphaMode === 'MASK' || pbrMaterial.alphaMode === 'BLEND' : false,
        doubleSided: pbrMaterial?.doubleSided ?? false,
    };
};

export const parseMaterial = (
    unparsedGltf: UnparsedGltf2Result,
    materialType: number,
    material: UnparsedGltf2Material,
): ParsedGltf2Material => {
    if (materialIsPbrMetallicRoughnessMaterial(material)) {
        const pbrMaterial: ParsedGltf2PbrMetallicRoughnessMaterial = {
            type: 'pbr-metallic-roughness',
            materialType,
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
            opacity:
                material.alphaMode === 'MASK' && material.alphaCutoff !== undefined
                    ? (material.pbrMetallicRoughness.baseColorFactor?.[3] ?? 1) >= material.alphaCutoff
                        ? 1
                        : 0
                    : 1,
        };

        return pbrMaterial;
    }

    return { type: 'unknown', name: material.name };
};
