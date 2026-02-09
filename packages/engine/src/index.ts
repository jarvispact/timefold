import { gltf2 } from '@timefold/gltf2';
import { math } from '@timefold/math';
import { obj } from '@timefold/obj';
import { webgpu } from '@timefold/webgpu';

export const engine = (test: string) => {
    return {
        engine: test,
        m: math('Hello from math!'),
        g: gltf2('Hello from gltf2!'),
        o: obj('Hello from obj!'),
        w: webgpu('Hello from webgpu!'),
    };
};
