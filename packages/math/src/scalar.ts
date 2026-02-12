import { TypedArray } from './internal';
import { ScalarType } from './types';

export const create = (): ScalarType => [0];

export const add = (out: TypedArray, a: ScalarType, b: ScalarType): ScalarType => {
    out[0] = a[0] + b[0];
    return out;
};
