import { createParser } from './obj-parser';
import { ParserOptions } from './types';

export const createLoader = <Options extends Partial<ParserOptions>>(options: Options = {} as Options) => {
    const parse = createParser<Options>(options);
    return {
        load: async (objUrl: string) => {
            const objSource = await fetch(objUrl).then((response) => response.text());
            return parse(objSource);
        },
    };
};
