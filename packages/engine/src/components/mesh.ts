import { createComponent } from '@timefold/ecs';
import { MeshComponent, MeshData, MeshPart, MeshType } from './types';

export const type: MeshType = '@tf/Mesh';

type CreateArgs = MeshPart | MeshData;

export const create = (args: CreateArgs): MeshComponent => {
    const data = Array.isArray(args) ? args : [args];
    return createComponent(type, data);
};
