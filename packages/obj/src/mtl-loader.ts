import { createParser } from './mtl-parser';
import { MtlParserOptions } from './types';

export function createLoader(options?: MtlParserOptions) {
    const { parse } = createParser(options);

    async function load(mtlUrl: string) {
        const mtlSource = await fetch(mtlUrl).then((response) => response.text());
        return parse(mtlSource);
    }

    return { load };
}

export function load(mtlUrl: string) {
    return createLoader().load(mtlUrl);
}
