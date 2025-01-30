import { createComponent } from '@timefold/ecs';
import { DataComponent, DataType } from './types';

export const type: DataType = '@tf/Data';

export const create = <B extends ArrayBufferLike = ArrayBuffer>(buffer: B): DataComponent<B> => {
    return createComponent(type, buffer);
};
