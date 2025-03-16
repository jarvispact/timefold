import { samplerMagFilterMapping, samplerMinFilterMapping, samplerWrapMapping } from './mappings';
import { ParsedGltf2Sampler, ParsedGltf2Texture, UnparsedGltf2Result, UnparsedGltf2Texture } from './types';

const defaultSampler: ParsedGltf2Sampler = {
    magFilter: 'LINEAR',
    minFilter: 'LINEAR',
    wrapS: 'CLAMP_TO_EDGE',
    wrapT: 'CLAMP_TO_EDGE',
};

export const parseTexture = (
    unparsedGltf: UnparsedGltf2Result,
    images: ImageBitmap[],
    texture: UnparsedGltf2Texture,
): ParsedGltf2Texture => {
    const name = unparsedGltf.images ? unparsedGltf.images[texture.source].name : `Texture${texture.source}`;

    if (texture.sampler === undefined) {
        return {
            name,
            image: images[texture.source],
            sampler: defaultSampler,
        };
    }

    const sampler = unparsedGltf.samplers?.[texture.sampler];
    if (!sampler) {
        return {
            name,
            image: images[texture.source],
            sampler: defaultSampler,
        };
    }

    return {
        name,
        image: images[texture.source],
        sampler: {
            magFilter: samplerMagFilterMapping[sampler.magFilter],
            minFilter: samplerMinFilterMapping[sampler.minFilter],
            wrapS: sampler.wrapS ? samplerWrapMapping[sampler.wrapS] : 'CLAMP_TO_EDGE',
            wrapT: sampler.wrapT ? samplerWrapMapping[sampler.wrapT] : 'CLAMP_TO_EDGE',
        },
    };
};

export const getTextureIndex = (unparsedGltf: UnparsedGltf2Result, texture?: { index: number }): number | undefined => {
    return unparsedGltf.textures && unparsedGltf.images && texture
        ? unparsedGltf.textures[texture.index].source
        : undefined;
};
