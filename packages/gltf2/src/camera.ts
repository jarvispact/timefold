import { Vec3 } from './internal';
import {
    ParsedGltf2Camera,
    UnparsedGltf2Camera,
    UnparsedGltf2CameraNode,
    UnparsedGltf2Node,
    UnparsedGltf2Result,
} from './types';

export const isCameraNode = (node: UnparsedGltf2Node): node is UnparsedGltf2CameraNode => 'camera' in node;

const isOrthographicCamera = (
    camera: UnparsedGltf2Camera,
): camera is Extract<UnparsedGltf2Camera, { type: 'orthographic' }> => 'orthographic' in camera;

export const parseCameraNode = (
    unparsedGltf: UnparsedGltf2Result,
    cameraNode: UnparsedGltf2CameraNode,
): ParsedGltf2Camera | undefined => {
    const camera = unparsedGltf.cameras?.[cameraNode.camera];
    if (!camera) return undefined;

    const translation: Vec3 = cameraNode.translation ?? [0, 0, 1];

    if (isOrthographicCamera(camera)) {
        return {
            type: 'orthographic',
            name: camera.name,
            translation,
            projection: camera.orthographic,
        };
    }

    return {
        type: 'perspective',
        name: camera.name,
        translation,
        projection: camera.perspective,
    };
};
