import {
    ParsedGltf2Mesh,
    ParsedGltf2Primitive,
    UnparsedGltf2MeshNode,
    UnparsedGltf2Node,
    UnparsedGltf2Result,
} from './types';

export const isMeshNode = (node: UnparsedGltf2Node): node is UnparsedGltf2MeshNode => 'mesh' in node;

export const parseMeshNode = (
    unparsedGltf: UnparsedGltf2Result,
    primitives: ParsedGltf2Primitive[],
    meshNode: UnparsedGltf2MeshNode,
): ParsedGltf2Mesh => {
    const mesh = unparsedGltf.meshes[meshNode.mesh];

    return {
        name: meshNode.name,
        translation: meshNode.translation ?? [0, 0, 0],
        rotation: meshNode.rotation ?? [0, 0, 0, 1],
        scale: meshNode.scale ?? [1, 1, 1],
        primitives: mesh.primitives.map((p) => {
            const primitiveIndex = primitives.findIndex(
                (pp) => pp.mesh === meshNode.mesh && pp.material === p.material,
            );

            return {
                material: p.material,
                primitive: primitiveIndex,
            };
        }),
    };
};
