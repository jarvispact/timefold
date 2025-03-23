import { parseMaterial, parseMaterialType } from './material';
import { isMeshNode, parseMeshNode } from './mesh';
import { parsePrimitive, parsePrimitiveLayout } from './primitive';
import { parseTexture } from './texture';
import {
    Gltf2ParserOptions,
    ParsedGltf2Material,
    ParsedGltf2MaterialType,
    ParsedGltf2Mesh,
    ParsedGltf2Primitive,
    ParsedGltf2PrimitiveLayout,
    ParsedGltf2Result,
    ParsedGltf2Texture,
    UnparsedGltf2Image,
    UnparsedGltf2ImageWithBufferView,
    UnparsedGltf2Result,
} from './types';

const defaultGltfParserOptions = {
    resolveBufferUrl: (uri) => uri,
    resolveImageUrl: (uri) => uri,
} satisfies Gltf2ParserOptions;

const isImageWithBufferView = (image: UnparsedGltf2Image): image is UnparsedGltf2ImageWithBufferView =>
    'bufferView' in image && typeof image.bufferView === 'number';

export const createParser = (options: Gltf2ParserOptions = {}) => {
    const opts = { ...defaultGltfParserOptions, ...options };

    const parse = async (jsonString: string): Promise<ParsedGltf2Result> => {
        const unparsedGltf = JSON.parse(jsonString) as UnparsedGltf2Result;

        const bufferPromises: Promise<ArrayBuffer>[] = [];

        if (Array.isArray(unparsedGltf.buffers) && unparsedGltf.buffers.length > 0) {
            for (const buffer of unparsedGltf.buffers) {
                const url = buffer.uri.startsWith('data:') ? buffer.uri : opts.resolveBufferUrl(buffer.uri);
                bufferPromises.push(fetch(url).then((response) => response.arrayBuffer()));
            }
        }

        const buffers = await Promise.all(bufferPromises);

        const imagePromises: Promise<ImageBitmap>[] = [];

        if (Array.isArray(unparsedGltf.images) && unparsedGltf.images.length > 0) {
            for (const image of unparsedGltf.images) {
                if (isImageWithBufferView(image)) {
                    const bufferView = unparsedGltf.bufferViews[image.bufferView];

                    const imageData = new Uint8Array(
                        buffers[bufferView.buffer],
                        bufferView.byteOffset,
                        bufferView.byteLength,
                    );

                    const blob = new Blob([imageData], { type: image.mimeType });
                    imagePromises.push(createImageBitmap(blob));
                } else {
                    const url = opts.resolveImageUrl(image.uri);
                    imagePromises.push(
                        fetch(url)
                            .then((res) => res.blob())
                            .then((blob) => createImageBitmap(blob)),
                    );
                }
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
        const materialTypes: ParsedGltf2MaterialType[] = [];
        const materialTypeToIdx: Record<string, number> = {};

        if (Array.isArray(unparsedGltf.materials) && unparsedGltf.materials.length > 0) {
            for (const material of unparsedGltf.materials) {
                const materialType = parseMaterialType(material);
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (materialTypeToIdx[materialType.type] === undefined) {
                    materialTypes.push(materialType);
                    materialTypeToIdx[materialType.type] = materialTypes.length - 1;
                }

                materials.push(parseMaterial(unparsedGltf, materialTypeToIdx[materialType.type], material));
            }
        }

        const primitiveLayouts: ParsedGltf2PrimitiveLayout[] = [];
        const keyToLayoutIdx: Record<string, number> = {};
        const primitives: ParsedGltf2Primitive[] = [];

        for (let mi = 0; mi < unparsedGltf.meshes.length; mi++) {
            const mesh = unparsedGltf.meshes[mi];

            for (let pi = 0; pi < mesh.primitives.length; pi++) {
                const primitive = mesh.primitives[pi];
                const layout = parsePrimitiveLayout(unparsedGltf, primitive);

                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (keyToLayoutIdx[layout.key] === undefined) {
                    primitiveLayouts.push(layout.primitiveLayout);
                    keyToLayoutIdx[layout.key] = primitiveLayouts.length - 1;
                }

                primitives.push(
                    parsePrimitive(
                        unparsedGltf,
                        buffers,
                        layout.primitiveLayout,
                        keyToLayoutIdx[layout.key],
                        mi,
                        primitive,
                    ),
                );
            }
        }

        const meshes: ParsedGltf2Mesh[] = [];
        const meshesForPrimitive: Record<number, number[]> = {};

        for (const node of unparsedGltf.nodes) {
            if (isMeshNode(node)) {
                const parsedMesh = parseMeshNode(unparsedGltf, primitives, node);
                meshes.push(parsedMesh);

                for (const primitive of parsedMesh.primitives) {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (!meshesForPrimitive[primitive.primitive]) {
                        meshesForPrimitive[primitive.primitive] = [];
                    }

                    meshesForPrimitive[primitive.primitive].push(meshes.length - 1);
                }
            }
        }

        return {
            textures,
            materialTypes,
            materials,
            primitiveLayouts,
            primitives,
            meshes,
            meshesForPrimitive,
            // TODO: since we dont return nodes, we should provide `meshNodes` and `cameraNodes`, ... instead
            scenes: unparsedGltf.scenes,
            activeScene: unparsedGltf.scene,
        };
    };

    return { parse };
};
