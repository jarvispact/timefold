import { createComponent } from '@timefold/ecs';
import { MeshDataComponent, MeshDataType } from './types';

export const type: MeshDataType = '@tf/MeshData';

export const create = <
    Transform extends ArrayBufferLike = ArrayBuffer,
    Materials extends ArrayBufferLike[] = ArrayBuffer[],
>(data: {
    transform: Transform;
    materials: Materials;
}): MeshDataComponent<Transform, Materials> => {
    return createComponent(type, data);
};
