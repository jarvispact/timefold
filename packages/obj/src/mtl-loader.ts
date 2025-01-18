import { createParser } from './mtl-parser';

export const createLoader = () => {
    const parse = createParser();
    return {
        load: async (mtlUrl: string) => {
            const mtlSource = await fetch(mtlUrl).then((response) => response.text());
            return parse(mtlSource);
        },
    };
};

export const load = (mtlUrl: string) => createLoader().load(mtlUrl);
