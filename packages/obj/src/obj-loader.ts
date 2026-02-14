import { createParser } from './obj-parser';
import { ParserOptions } from './types';

export const load = async <Options extends Partial<ParserOptions>>(
    objUrl: string,
    options: Options = {} as Options,
) => {
    const parse = createParser<Options>(options);
    const objSource = await fetch(objUrl).then((response) => response.text());
    return parse(objSource);
};
