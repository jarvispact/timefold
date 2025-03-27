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

const isImageWithBufferView = (image: UnparsedGltf2Image): image is UnparsedGltf2ImageWithBufferView =>
    'bufferView' in image && typeof image.bufferView === 'number';

const loadImages = async (
    options: Required<Gltf2ParserOptions>,
    buffers: ArrayBuffer[],
    unparsedGltf: UnparsedGltf2Result,
): Promise<ImageBitmap[]> => {
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
                imagePromises.push(createImageBitmap(blob, options.createImageBitmapOptions));
            } else {
                const url = options.resolveImageUrl(image.uri);
                imagePromises.push(
                    fetch(url)
                        .then((res) => res.blob())
                        .then((blob) => createImageBitmap(blob, options.createImageBitmapOptions)),
                );
            }
        }
    }

    return Promise.all(imagePromises);
};

const parseWithBuffersAndImages = (
    buffers: ArrayBuffer[],
    images: ImageBitmap[],
    unparsedGltf: UnparsedGltf2Result,
): ParsedGltf2Result => {
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
    };
};

const defaultParserOptions = {
    createImageBitmapOptions: { imageOrientation: 'flipY' },
    resolveBufferUrl: (uri) => uri,
    resolveImageUrl: (uri) => uri,
} satisfies Gltf2ParserOptions;

export const createGltfParser = (options: Gltf2ParserOptions = {}) => {
    const opts = { ...defaultParserOptions, ...options };

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
        const images = await loadImages(opts, buffers, unparsedGltf);
        return parseWithBuffersAndImages(buffers, images, unparsedGltf);
    };

    return { parse };
};

const GLB_MAGIC_NUMBER = 0x46546c67;
const GLB_MAGIC_NUMBER_BYTE_INDEX = 0;

const GLB_VERSION = 2;
const GLB_VERSION_BYTE_INDEX = 4;

const GLB_JSON = 0x4e4f534a;
const GLB_JSON_TYPE_BYTE_INDEX = 16;

const GLB_JSON_LENGTH_BYTE_INDEX = 12;
const GLB_JSON_BYTE_INDEX = 20;

export const createGlbParser = (options: Gltf2ParserOptions = {}) => {
    const opts = { ...defaultParserOptions, ...options };

    const parse = async (arrayBuffer: ArrayBuffer): Promise<ParsedGltf2Result> => {
        const magicNumber = new Uint32Array(arrayBuffer, GLB_MAGIC_NUMBER_BYTE_INDEX, 1)[0];
        if (magicNumber !== GLB_MAGIC_NUMBER) {
            throw new Error('GLB magic number does not match');
        }

        const version = new Uint32Array(arrayBuffer, GLB_VERSION_BYTE_INDEX, 1)[0];
        if (version !== GLB_VERSION) {
            throw new Error('GLB version does not match');
        }

        const jsonStart = new Uint32Array(arrayBuffer, GLB_JSON_TYPE_BYTE_INDEX, 1)[0];
        if (jsonStart !== GLB_JSON) {
            throw new Error('GLB chunk 0 is not of type JSON');
        }

        const jsonByteLength = new Uint32Array(arrayBuffer, GLB_JSON_LENGTH_BYTE_INDEX, 1)[0];
        const binaryStart = GLB_JSON_BYTE_INDEX + jsonByteLength;
        const binaryByteLength = new Uint32Array(arrayBuffer, binaryStart, 1)[0];

        const jsonBytes = new Uint8Array(arrayBuffer, GLB_JSON_BYTE_INDEX, jsonByteLength);
        const jsonText = new TextDecoder('utf8').decode(jsonBytes);
        const unparsedGltf = JSON.parse(jsonText) as UnparsedGltf2Result;

        // binary chunk not required

        const correctedBinaryStart = binaryStart + 8; // Skip the 2 INT header values to get the byte index start of BIN
        const bin = arrayBuffer.slice(correctedBinaryStart);

        if (bin.byteLength !== binaryByteLength) {
            throw new Error('GLB Bin length does not match value in header.');
        }

        const buffers = [bin];
        const images = await loadImages(opts, buffers, unparsedGltf);
        return parseWithBuffersAndImages(buffers, images, unparsedGltf);
    };

    return { parse };
};

export const parseGltf = (jsonString: string) => createGltfParser().parse(jsonString);
export const parseGlb = (arrayBuffer: ArrayBuffer) => createGlbParser().parse(arrayBuffer);
