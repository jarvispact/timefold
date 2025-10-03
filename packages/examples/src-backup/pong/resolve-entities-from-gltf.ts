import { Gltf2Utils, ParsedGltf2Result } from '@timefold/gltf2';

export const resolveEntitiesFromGltf = (gltf2Result: ParsedGltf2Result) => {
    const primitiveLayout = gltf2Result.primitiveLayouts[0];
    const primitive = gltf2Result.primitives[0];
    const camera = gltf2Result.cameras[0];
    const walls = gltf2Result.meshes.filter((m) => m.name.startsWith('Wall'));
    const player1 = gltf2Result.meshes.find((m) => m.name === 'Player1');
    const player2 = gltf2Result.meshes.find((m) => m.name === 'Player2');
    const ball = gltf2Result.meshes.find((m) => m.name === 'Ball');

    if (
        !Gltf2Utils.isInterleavedPrimitive(primitive) ||
        !Gltf2Utils.isOrthographicCamera(camera) ||
        !Gltf2Utils.primitiveLayoutHasRequiredAttribs(primitiveLayout, ['TEXCOORD_0']) ||
        Gltf2Utils.primitiveIsNonInterleaved(primitive) ||
        !Gltf2Utils.primitiveHasIndices(primitive) ||
        !player1 ||
        !player2 ||
        !ball
    ) {
        throw new Error('Provided glb file did not meet the requirements');
    }

    return {
        primitiveLayout,
        primitive,
        camera,
        walls,
        player1,
        player2,
        ball,
    };
};
