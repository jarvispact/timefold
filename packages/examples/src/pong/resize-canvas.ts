import { OrthographicCamera, OrthographicCameraComponent } from '@timefold/engine';
import { ParsedGltf2CameraOrthographic } from '@timefold/gltf2';

export const setupResizeHandler = (
    canvas: HTMLCanvasElement,
    cameraComponent: OrthographicCameraComponent,
    gltfCamera: ParsedGltf2CameraOrthographic,
) => {
    window.addEventListener('resize', () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        const aspect = canvas.width / canvas.height;
        OrthographicCamera.updateFromGltf2(cameraComponent, gltfCamera, aspect);
    });
};
