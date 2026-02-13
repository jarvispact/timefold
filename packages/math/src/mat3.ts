import { Mat3ArrayType, Mat3Type, Vec3Type } from './types';

export const create = (...args: Mat3ArrayType | [Vec3Type, Vec3Type, Vec3Type] | []): Mat3Type =>
    args.length === 9
        ? args
        : args.length === 3
          ? [args[0][0], args[0][1], args[0][2], args[1][0], args[1][1], args[1][2], args[2][0], args[2][1], args[2][2]]
          : // eslint-disable-next-line prettier/prettier
            [
                1.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 0.0, 1.0
            ]
