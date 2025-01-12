import { modeMap, parseInfo } from './internal-utils';
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

        const objects: { name: string; primitives: unknown[] }[] = [];
        let currentObjectIndex = 0;
        let currentPrimitiveIndex = 0;

        let info: InterleavedInfo | undefined = undefined;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine.startsWith('#')) continue;

            if (trimmedLine.startsWith(`${splitObjectMap[opts.splitObjectMode]} `)) {
                const name = trimmedLine.substring(2);
                objects.push({ name, primitives: [] });
                currentObjectIndex = objects.length - 1;
                currentPrimitiveIndex = 0;
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
                objects[currentObjectIndex].primitives.push(modeMap[opts.mode].createPrimitive(name));
                currentPrimitiveIndex = objects[currentObjectIndex].primitives.length - 1;
            }

            if (trimmedLine.startsWith('f ')) {
                // For interleaved parsing we provide some additional info
                if (!info && opts.mode.startsWith('interleaved')) {
                    info = parseInfo(trimmedLine);
                }

                // Export does not contain usemtl line - create a default primitive
                if (!objects[currentObjectIndex].primitives[currentPrimitiveIndex]) {
                    objects[currentObjectIndex].primitives.push(modeMap[opts.mode].createPrimitive('default'));
                    currentPrimitiveIndex = objects[currentObjectIndex].primitives.length - 1;
                }

                modeMap[opts.mode].handleFace({
                    trimmedLine,
                    primitive: objects[currentObjectIndex].primitives[currentPrimitiveIndex],
                    positions,
                    uvs,
                    normals,
                    opts,
                });
            }
        }

        for (let oi = 0; oi < objects.length; oi++) {
            const object = objects[oi];
            for (let pi = 0; pi < object.primitives.length; pi++) {
                const primitive = object.primitives[pi] as never;
                objects[oi].primitives[pi] = modeMap[opts.mode].convertPrimitive(primitive, info as InterleavedInfo);
            }
        }

        return { objects, ...(info ? { info } : {}) } as ObjParserResult<Options>;
    };

    return parse;
};
