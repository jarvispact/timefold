import {
    convertInterleavedToIndexed as _convertInterleavedToIndexed,
    convertNonInterleavedToIndexed as _convertNonInterleavedToIndexed,
    convertInterleavedToTypedArray as _convertInterleavedToTypedArray,
    convertNonInterleavedToTypedArray as _convertNonInterleavedToTypedArray,
    modeMap,
    parseInfo,
} from './internal-utils';
import { ObjParserResult, InterleavedInfo, ParserOptions } from './types';

const splitObjectMap = {
    object: 'o',
    group: 'g',
} as const;

const defaultOptions = {
    mode: 'interleaved-typed-array-indexed',
    splitObjectMode: 'object',
    flipUvX: false,
    flipUvY: false,
} as const;

export const createParser = <Options extends Partial<ParserOptions>>(options?: Options) => {
    const opts = { ...defaultOptions, ...options };

    const parse = (source: string) => {
        const lines = source.trim().split('\n');

        const positions: number[] = [];
        const uvs: number[] = [];
        const normals: number[] = [];

        const objects: Record<string, { name: string; primitives: Record<string, unknown> }> = {};
        let currentObjectName = 'default';
        let currentPrimitiveName = 'default';

        let info: InterleavedInfo | undefined = undefined;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine.startsWith('#')) continue;

            if (trimmedLine.startsWith(`${splitObjectMap[opts.splitObjectMode]} `)) {
                const name = trimmedLine.substring(2);
                objects[name] = { name, primitives: {} };
                currentObjectName = name;
                currentPrimitiveName = 'default';
            }

            if (trimmedLine.startsWith('v ')) {
                const vec3 = trimmedLine.substring(2).split(' ').map(Number.parseFloat);
                positions.push(...vec3);
            }

            if (trimmedLine.startsWith('vt ')) {
                const vec2 = trimmedLine.substring(3).split(' ').map(Number.parseFloat);
                uvs.push(...vec2);
            }

            if (trimmedLine.startsWith('vn ')) {
                const vec3 = trimmedLine.substring(3).split(' ').map(Number.parseFloat);
                normals.push(...vec3);
            }

            if (trimmedLine.startsWith('usemtl ')) {
                const name = trimmedLine.substring(7);
                objects[currentObjectName].primitives[name] = modeMap[opts.mode].createPrimitive(name);
                currentPrimitiveName = name;
            }

            if (trimmedLine.startsWith('f ')) {
                // For interleaved parsing we provide some additional info
                if (!info && opts.mode.startsWith('interleaved')) {
                    info = parseInfo(trimmedLine);
                }

                // Export does not contain usemtl line - create a default primitive
                if (!objects[currentObjectName].primitives[currentPrimitiveName]) {
                    objects[currentObjectName].primitives.default = modeMap[opts.mode].createPrimitive('default');
                    currentPrimitiveName = 'default';
                }

                modeMap[opts.mode].handleFace({
                    trimmedLine,
                    primitive: objects[currentObjectName].primitives[currentPrimitiveName],
                    positions,
                    uvs,
                    normals,
                    opts,
                });
            }
        }

        const objectKeys = Object.keys(objects);

        for (let oi = 0; oi < objectKeys.length; oi++) {
            const objectKey = objectKeys[oi];
            const object = objects[objectKey];
            const primitiveKeys = Object.keys(object.primitives);
            for (let pi = 0; pi < primitiveKeys.length; pi++) {
                const primitiveKey = primitiveKeys[pi];
                const primitive = object.primitives[primitiveKey];
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                objects[objectKey].primitives[primitiveKey] = modeMap[opts.mode].convertPrimitive(
                    primitive,
                    info as InterleavedInfo,
                );
            }
        }

        return { objects, ...(info ? { info } : {}) } as ObjParserResult<Options>;
    };

    return parse;
};

export const convertInterleavedToIndexed = _convertInterleavedToIndexed;
export const convertNonInterleavedToIndexed = _convertNonInterleavedToIndexed;
export const convertInterleavedToTypedArray = _convertInterleavedToTypedArray;
export const convertNonInterleavedToTypedArray = _convertNonInterleavedToTypedArray;
