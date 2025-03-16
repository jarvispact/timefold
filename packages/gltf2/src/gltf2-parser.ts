import { parseMaterial } from './material';
import { isMeshNode, parseMeshNode } from './mesh';
import { parsePrimitive } from './primitive';
import { parseTexture } from './texture';
import {
    Gltf2ParserOptions,
    ParsedGltf2Material,
    ParsedGltf2MaterialType,
    ParsedGltf2Mesh,
    ParsedGltf2Primitive,
    ParsedGltf2Result,
    ParsedGltf2Texture,
    UnparsedGltf2Result,
} from './types';

const defaultGltfParserOptions = {
    resolveBufferUrl: (uri) => uri,
} satisfies Gltf2ParserOptions;

export const createParser = (options: Gltf2ParserOptions = {}) => {
    const opts = { ...defaultGltfParserOptions, ...options };

    const parse = async (jsonString: string): Promise<ParsedGltf2Result> => {
        const unparsedGltf = JSON.parse(jsonString) as UnparsedGltf2Result;

        const bufferPromises: Promise<ArrayBuffer>[] = [];

        for (const buffer of unparsedGltf.buffers) {
            const url = buffer.uri.startsWith('data:') ? buffer.uri : opts.resolveBufferUrl(buffer.uri);
            bufferPromises.push(fetch(url).then((response) => response.arrayBuffer()));
        }

        const buffers = await Promise.all(bufferPromises);

        const imagePromises: Promise<ImageBitmap>[] = [];

        if (Array.isArray(unparsedGltf.images) && unparsedGltf.images.length > 0) {
            for (const image of unparsedGltf.images) {
                const bufferView = unparsedGltf.bufferViews[image.bufferView];

                // TODO: length !== byteLength ???
                const imageData = new Uint8Array(
                    buffers[bufferView.buffer],
                    bufferView.byteOffset,
                    bufferView.byteLength,
                );

                const blob = new Blob([imageData], { type: image.mimeType });
                imagePromises.push(createImageBitmap(blob));
            }
        }

        const images = await Promise.all(imagePromises);

        const textures: ParsedGltf2Texture[] = [];

        if (Array.isArray(unparsedGltf.textures) && unparsedGltf.textures.length > 0) {
            for (const texture of unparsedGltf.textures) {
                textures.push(parseTexture(unparsedGltf, images, texture));
            }
        }

        const materials: ParsedGltf2Material[] = [];
        const uniqueMaterialTypesSet = new Set<ParsedGltf2MaterialType>();

        if (Array.isArray(unparsedGltf.materials) && unparsedGltf.materials.length > 0) {
            for (const material of unparsedGltf.materials) {
                const parsedMaterial = parseMaterial(unparsedGltf, material);
                uniqueMaterialTypesSet.add(parsedMaterial.type);
                materials.push(parsedMaterial);
            }
        }

        const primitives: ParsedGltf2Primitive[] = [];

        for (let mi = 0; mi < unparsedGltf.meshes.length; mi++) {
            const mesh = unparsedGltf.meshes[mi];
            for (let pi = 0; pi < mesh.primitives.length; pi++) {
                const primitive = mesh.primitives[pi];
                const parsedPrimitive = parsePrimitive(unparsedGltf, buffers, mi, primitive);

                // const attributeKeys = objectKeys(parsedPrimitive.attributes)
                //     .sort()
                //     .map((key) => {
                //         const format = parsedPrimitive.attributes[key]?.format;
                //         return `${key}:${format}`;
                //     })
                //     .join('|');

                // const mode = parsedPrimitive.mode;
                // const key = `${mode}(${attributeKeys})`;

                primitives.push(parsedPrimitive);
            }
        }

        const meshes: ParsedGltf2Mesh[] = [];

        for (const node of unparsedGltf.nodes) {
            if (isMeshNode(node)) {
                meshes.push(parseMeshNode(unparsedGltf, primitives, node));
            }
        }

        return {
            textures,
            materials,
            materialTypes: [...uniqueMaterialTypesSet],
            primitives,
            meshes,
            scenes: unparsedGltf.scenes,
            activeScene: unparsedGltf.scene,
        };
    };

    return { parse };
};
