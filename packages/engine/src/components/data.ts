import { createComponent } from '@timefold/ecs';
import { DataComponent, T } from './types';

export const type = T.Data;

export const create = (buffer: ArrayBufferLike): DataComponent => {
    return createComponent(type, buffer);
};
