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

type ObjByNameValue = { name: string; primitivesByName: Record<string, unknown>; primitives: unknown[] };

export const createParser = <Options extends Partial<ParserOptions>>(options?: Options) => {
    const opts = { ...defaultOptions, ...options };

    const parse = (source: string) => {
        const lines = source.trim().split('\n');

        const positions: number[] = [];
        const uvs: number[] = [];
        const normals: number[] = [];

        const objectsByName: Record<string, ObjByNameValue> = {};
        let currentObjectName = 'default';
        let currentPrimitiveName = 'default';

        let info: InterleavedInfo | undefined = undefined;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine.startsWith('#')) continue;

            if (trimmedLine.startsWith(`${splitObjectMap[opts.splitObjectMode]} `)) {
                const name = trimmedLine.substring(2);
                objectsByName[name] = { name, primitivesByName: {}, primitives: [] };
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
                objectsByName[currentObjectName].primitivesByName[name] = modeMap[opts.mode].createPrimitive(name);
                currentPrimitiveName = name;
            }

            if (trimmedLine.startsWith('f ')) {
                // For interleaved parsing we provide some additional info
                if (!info && opts.mode.startsWith('interleaved')) {
                    info = parseInfo(trimmedLine);
                }

                // Export does not contain usemtl line - create a default primitive
                if (!objectsByName[currentObjectName].primitivesByName[currentPrimitiveName]) {
                    objectsByName[currentObjectName].primitivesByName.default =
                        modeMap[opts.mode].createPrimitive('default');
                    currentPrimitiveName = 'default';
                }

                modeMap[opts.mode].handleFace({
                    trimmedLine,
                    primitive: objectsByName[currentObjectName].primitivesByName[currentPrimitiveName],
                    positions,
                    uvs,
                    normals,
                    opts,
                });
            }
        }

        const objectKeys = Object.keys(objectsByName);

        for (let oi = 0; oi < objectKeys.length; oi++) {
            const objectKey = objectKeys[oi];
            const object = objectsByName[objectKey];
            const primitiveKeys = Object.keys(object.primitivesByName);
            for (let pi = 0; pi < primitiveKeys.length; pi++) {
                const primitiveKey = primitiveKeys[pi];
                const primitive = object.primitivesByName[primitiveKey];
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                objectsByName[objectKey].primitivesByName[primitiveKey] = modeMap[opts.mode].convertPrimitive(
                    primitive,
                    info as InterleavedInfo,
                );
            }

            object.primitives = Object.values(object.primitivesByName);
        }

        const objects = Object.values(objectsByName);
        return { objectsByName, objects, ...(info ? { info } : {}) } as ObjParserResult<Options>;
    };

    return parse;
};

export const parse = (source: string) => createParser()(source);

export const convertInterleavedToIndexed = _convertInterleavedToIndexed;
export const convertNonInterleavedToIndexed = _convertNonInterleavedToIndexed;
export const convertInterleavedToTypedArray = _convertInterleavedToTypedArray;
export const convertNonInterleavedToTypedArray = _convertNonInterleavedToTypedArray;
