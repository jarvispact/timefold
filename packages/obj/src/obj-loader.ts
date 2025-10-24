import { createParser } from './obj-parser';
import { ParserOptions } from './types';

export function createLoader<Options extends Partial<ParserOptions>>(options: Options = {} as Options) {
    const { parse } = createParser<Options>(options);

    async function load(objUrl: string) {
        const objSource = await fetch(objUrl).then((response) => response.text());
        return parse(objSource);
    }

    return { load };
}

export function load(objUrl: string) {
    return createLoader().load(objUrl);
}
