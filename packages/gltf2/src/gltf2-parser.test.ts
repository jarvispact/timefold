import { it, describe, vi, expect } from 'vitest';
import { createParser } from './gltf2-parser';
import {
    ParsedGltf2Material,
    ParsedGltf2Mesh,
    ParsedGltf2Primitive,
    ParsedGltf2PrimitiveLayout,
    ParsedGltf2Result,
    ParsedGltf2Sampler,
    ParsedGltf2Texture,
} from './types';
import singlePlaneNoTextures from '../gltf2-test-files/single-plane-no-textures.gltf?raw';
import singlePlaneWithTextures from '../gltf2-test-files/single-plane-with-textures.gltf?raw';
import multiplePlanesWithAndWithoutInstances from '../gltf2-test-files/multiple-planes-with-and-without-instances.gltf?raw';

const close = vi.fn();

const createImageBitmapMock = vi.fn(() => ({
    width: 1024,
    height: 1024,
    close,
}));

vi.stubGlobal('createImageBitmap', createImageBitmapMock);

describe('gltf2-parser', () => {
    it('should parse a single plane with material, without textures', async () => {
        const parser = createParser();

        const { textures, materialTypes, materials, primitiveLayouts, primitives } =
            await parser.parse(singlePlaneNoTextures);

        expect(textures.length).toEqual(0);

        expect(materialTypes).toEqual(['pbr-metallic-roughness-opaque-ds']);

        const expectedMaterials: ParsedGltf2Material[] = [
            {
                type: 'pbr-metallic-roughness-opaque-ds',
                name: 'Material',
                baseColor: [0.8000000715255737, 0, 0.005676119588315487],
                baseColorTexture: undefined,
                metallic: 0,
                metallicTexture: undefined,
                roughness: 0.5,
                roughnessTexture: undefined,
                emissive: undefined,
                emissiveTexture: undefined,
                normalTexture: undefined,
            },
        ];

        expect(materials).toEqual(expectedMaterials);

        const expectedPrimitiveLayouts: ParsedGltf2PrimitiveLayout[] = [
            {
                mode: 'triangle-list',
                attributes: {
                    POSITION: 'float32x3',
                    TEXCOORD_0: 'float32x2',
                    NORMAL: 'float32x3',
                },
            },
        ];

        expect(primitiveLayouts).toEqual(expectedPrimitiveLayouts);

        const expectedPrimitives: ParsedGltf2Primitive[] = [
            {
                primitiveLayout: 0,
                mesh: 0,
                material: 0,
                mode: 'triangle-list',
                attributes: {
                    POSITION: new Float32Array([-1, 0, 1, 1, 0, 1, -1, 0, -1, 1, 0, -1]),
                    NORMAL: new Float32Array([0, 1, -0, 0, 1, -0, 0, 1, -0, 0, 1, -0]),
                    TEXCOORD_0: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
                },
                indices: { format: 'uint16', data: new Uint16Array([0, 1, 3, 0, 3, 2]) },
            },
        ];

        expect(primitives).toEqual(expectedPrimitives);
    });

    it('should parse a single plane with material, with textures', async () => {
        const parser = createParser();

        const { textures, materialTypes, materials, primitiveLayouts, primitives } =
            await parser.parse(singlePlaneWithTextures);

        const expectedImage = { width: 1024, height: 1024, close };

        const expectedSampler: ParsedGltf2Sampler = {
            magFilter: 'LINEAR',
            minFilter: 'LINEAR_MIPMAP_LINEAR',
            wrapS: 'CLAMP_TO_EDGE',
            wrapT: 'CLAMP_TO_EDGE',
        };

        const expectedTextures: ParsedGltf2Texture[] = [
            {
                name: 'bricks-normal-map',
                image: expectedImage,
                sampler: expectedSampler,
            },
            {
                name: 'bricks-color-map',
                image: expectedImage,
                sampler: expectedSampler,
            },
            {
                name: 'bricks-roughness-map',
                image: expectedImage,
                sampler: expectedSampler,
            },
        ];

        expect(textures).toEqual(expectedTextures);

        expect(materialTypes).toEqual(['pbr-metallic-roughness-opaque-ds']);

        const expectedMaterials: ParsedGltf2Material[] = [
            {
                type: 'pbr-metallic-roughness-opaque-ds',
                name: 'Material',
                baseColor: [0, 0, 0],
                baseColorTexture: 1,
                metallic: 0,
                metallicTexture: 2,
                roughness: 0.5,
                roughnessTexture: 2,
                emissive: undefined,
                emissiveTexture: undefined,
                normalTexture: 0,
            },
        ];

        expect(materials).toEqual(expectedMaterials);

        const expectedPrimitiveLayouts: ParsedGltf2PrimitiveLayout[] = [
            {
                mode: 'triangle-list',
                attributes: {
                    POSITION: 'float32x3',
                    TEXCOORD_0: 'float32x2',
                    NORMAL: 'float32x3',
                },
            },
        ];

        expect(primitiveLayouts).toEqual(expectedPrimitiveLayouts);

        const expectedPrimitives: ParsedGltf2Primitive[] = [
            {
                primitiveLayout: 0,
                mesh: 0,
                material: 0,
                mode: 'triangle-list',
                attributes: {
                    POSITION: new Float32Array([-1, 0, 1, 1, 0, 1, -1, 0, -1, 1, 0, -1]),
                    NORMAL: new Float32Array([0, 1, -0, 0, 1, -0, 0, 1, -0, 0, 1, -0]),
                    TEXCOORD_0: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
                },
                indices: { format: 'uint16', data: new Uint16Array([0, 1, 3, 0, 3, 2]) },
            },
        ];

        expect(primitives).toEqual(expectedPrimitives);
    });

    it('should parse multiple planes with and without instances', async () => {
        const parser = createParser();

        const { textures, materialTypes, materials, primitiveLayouts, primitives, meshes, primitiveToMeshes } =
            await parser.parse(multiplePlanesWithAndWithoutInstances);

        expect(textures.length).toEqual(0);
        expect(materials.map((m) => m.name)).toEqual(['Red', 'Green1', 'Green2', 'Blue', 'Yellow']);
        expect(materialTypes).toEqual(['pbr-metallic-roughness-opaque-ds']);

        const expectedPrimitiveLayouts: ParsedGltf2PrimitiveLayout[] = [
            {
                mode: 'triangle-list',
                attributes: {
                    POSITION: 'float32x3',
                    TEXCOORD_0: 'float32x2',
                    NORMAL: 'float32x3',
                },
            },
        ];

        expect(primitiveLayouts).toEqual(expectedPrimitiveLayouts);

        // unique primitives

        const expectedPrimitives: ParsedGltf2Primitive[] = [
            {
                primitiveLayout: 0,
                mesh: 0,
                material: 0,
                mode: 'triangle-list',
                attributes: {
                    POSITION: new Float32Array([-1, 0, 1, 1, 0, 1, -1, 0, -1, 1, 0, -1]),
                    NORMAL: new Float32Array([0, 1, -0, 0, 1, -0, 0, 1, -0, 0, 1, -0]),
                    TEXCOORD_0: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
                },
                indices: { format: 'uint16', data: new Uint16Array([0, 1, 3, 0, 3, 2]) },
            },
            {
                primitiveLayout: 0,
                mesh: 1,
                material: 1,
                mode: 'triangle-list',
                attributes: {
                    POSITION: new Float32Array([-1, 0, 1, 1, 0, 1, -1, 0, -1, 1, 0, -1]),
                    NORMAL: new Float32Array([0, 1, -0, 0, 1, -0, 0, 1, -0, 0, 1, -0]),
                    TEXCOORD_0: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
                },
                indices: { format: 'uint16', data: new Uint16Array([0, 1, 3, 0, 3, 2]) },
            },
            {
                primitiveLayout: 0,
                mesh: 2,
                material: 2,
                mode: 'triangle-list',
                attributes: {
                    POSITION: new Float32Array([-1, 0, 1, 1, 0, 1, -1, 0, -1, 1, 0, -1]),
                    NORMAL: new Float32Array([0, 1, -0, 0, 1, -0, 0, 1, -0, 0, 1, -0]),
                    TEXCOORD_0: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
                },
                indices: { format: 'uint16', data: new Uint16Array([0, 1, 3, 0, 3, 2]) },
            },
            {
                primitiveLayout: 0,
                mesh: 3,
                material: 3,
                mode: 'triangle-list',
                attributes: {
                    POSITION: new Float32Array([1, 0, 1, -1, 0, -1, 1, 0, -1]),
                    NORMAL: new Float32Array([0, 1, -0, 0, 1, -0, 0, 1, -0]),
                    TEXCOORD_0: new Float32Array([1, 1, 0, 0, 1, 0]),
                },
                indices: { format: 'uint16', data: new Uint16Array([0, 2, 1]) },
            },
            {
                primitiveLayout: 0,
                mesh: 3,
                material: 4,
                mode: 'triangle-list',
                attributes: {
                    POSITION: new Float32Array([-1, 0, 1, 1, 0, 1, -1, 0, -1]),
                    NORMAL: new Float32Array([0, 1, -0, 0, 1, -0, 0, 1, -0]),
                    TEXCOORD_0: new Float32Array([0, 1, 1, 1, 0, 0]),
                },
                indices: { format: 'uint16', data: new Uint16Array([1, 2, 0]) },
            },
        ];

        expect(primitives).toEqual(expectedPrimitives);

        // unique meshes - a mesh can contain a list of primitives

        const expectedMeshes: ParsedGltf2Mesh[] = [
            {
                name: 'Instance0',
                translation: [0, 0, 0],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
                primitives: [{ material: 0, primitive: 0 }],
            },
            {
                name: 'Green1',
                translation: [3, 0, 0],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
                primitives: [{ material: 1, primitive: 1 }],
            },
            {
                name: 'Instance1',
                translation: [0, 0, -3],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
                primitives: [{ material: 0, primitive: 0 }],
            },
            {
                name: 'Instance2',
                translation: [0, 0, 3],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
                primitives: [{ material: 0, primitive: 0 }],
            },
            {
                name: 'Green2',
                translation: [-3, 0, 0],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
                primitives: [{ material: 2, primitive: 2 }],
            },
            {
                name: 'MultiMaterial',
                translation: [3, 0, -3],
                rotation: [0, 0, 0, 1],
                scale: [1, 1, 1],
                primitives: [
                    {
                        material: 3,
                        primitive: 3,
                    },
                    {
                        material: 4,
                        primitive: 4,
                    },
                ],
            },
        ];

        expect(meshes).toEqual(expectedMeshes);

        const expectedPrimitiveToMeshes: ParsedGltf2Result['primitiveToMeshes'] = {
            0: [0, 2, 3],
            1: [1],
            2: [4],
            3: [5],
            4: [5],
        };

        expect(primitiveToMeshes).toEqual(expectedPrimitiveToMeshes);
    });
});
