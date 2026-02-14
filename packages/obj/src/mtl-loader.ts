import { createParser } from './mtl-parser';

export const load = async (mtlUrl: string) => {
    const parse = createParser();
    const mtlSource = await fetch(mtlUrl).then((response) => response.text());
    return parse(mtlSource);
};
