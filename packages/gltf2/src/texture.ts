import { samplerMagFilterMapping, samplerMinFilterMapping, samplerWrapMapping } from './mappings';
import { ParsedGltf2Sampler, ParsedGltf2Texture, UnparsedGltf2Result, UnparsedGltf2Texture } from './types';

const defaultSampler: ParsedGltf2Sampler = {
    magFilter: 'linear',
    minFilter: 'linear',
    wrapS: 'clamp-to-edge',
    wrapT: 'clamp-to-edge',
};

export const parseTexture = (
    unparsedGltf: UnparsedGltf2Result,
    images: ImageBitmap[],
    texture: UnparsedGltf2Texture,
): ParsedGltf2Texture => {
    const name = unparsedGltf.images?.[texture.source].name ?? `Texture${texture.source}`;

    if (texture.sampler === undefined) {
        return {
            name,
            image: images[texture.source],
            sampler: defaultSampler,
        };
    }

    const sampler = unparsedGltf.samplers?.[texture.sampler] ?? {};
    return {
        name,
        image: images[texture.source],
        sampler: {
            magFilter: sampler.magFilter ? samplerMagFilterMapping[sampler.magFilter] : defaultSampler.magFilter,
            minFilter: sampler.minFilter ? samplerMinFilterMapping[sampler.minFilter] : defaultSampler.minFilter,
            wrapS: sampler.wrapS ? samplerWrapMapping[sampler.wrapS] : defaultSampler.wrapS,
            wrapT: sampler.wrapT ? samplerWrapMapping[sampler.wrapT] : defaultSampler.wrapT,
        },
    };
};

export const getTextureIndex = (unparsedGltf: UnparsedGltf2Result, texture?: { index: number }): number | undefined => {
    return unparsedGltf.textures && unparsedGltf.images && texture
        ? unparsedGltf.textures[texture.index].source
        : undefined;
};
