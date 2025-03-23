import { createGlbParser, createGltfParser } from './gltf2-parser';
import { Gltf2ParserOptions } from './types';

export type Gltf2LoaderOptions = {
    parserOptions?: Gltf2ParserOptions;
};

export const createLoader = (options: Gltf2LoaderOptions = {}) => {
    return {
        load: async (url: string, isBinary?: boolean) => {
            const fileExtension = url.substring(url.lastIndexOf('.') + 1);
            const useBinary = fileExtension === 'glb' || isBinary || false;

            if (useBinary) {
                const arrayBuffer = await fetch(url).then((response) => response.arrayBuffer());
                const parser = createGlbParser(options.parserOptions);
                return parser.parse(arrayBuffer);
            }

            const jsonString = await fetch(url).then((response) => response.text());
            const parser = createGltfParser(options.parserOptions);
            return parser.parse(jsonString);
        },
    };
};

export const load = (url: string, isBinary?: boolean) => createLoader().load(url, isBinary);
