import { type } from './wgsl-type';

// TODO: currently not exported!!!
// TODO: array of f32 is allowed for vertex structs
// TODO: bool not yet supported

const builtinMap = {
    vertex_index: () => ({ stage: 'vertex' as const, type: type('u32') }),
    instance_index: () => ({ stage: 'vertex' as const, type: type('u32') }),
    // clip_distances: () => ({ stage: 'vertex' as const, type: array(type('f32'), 8) }),

    // front_facing: () => ({ stage: 'fragment' as const, type: type('bool') }),
    frag_depth: () => ({ stage: 'fragment' as const, type: type('f32') }),
    sample_index: () => ({ stage: 'fragment' as const, type: type('u32') }),
    sample_mask: () => ({ stage: 'fragment' as const, type: type('u32') }),

    position: () => ({ stage: 'vertex-and-fragment' as const, type: type('vec4<f32>') }),
} as const;

type BuiltinMap = typeof builtinMap;
export type BuiltinName = keyof BuiltinMap;
type BuiltinForName<Name extends BuiltinName> = ReturnType<BuiltinMap[Name]>;

export type Builtin<Name extends BuiltinName> = BuiltinForName<Name> & {
    name: Name;
};

export const builtin = <Name extends BuiltinName>(name: Name): Builtin<Name> => {
    const result = builtinMap[name]() as BuiltinForName<Name>;
    return {
        name,
        ...result,
    };
};

const builtInNames = Object.keys(builtinMap);

export const isBuiltin = (value: unknown): value is Builtin<BuiltinName> =>
    typeof value === 'object' &&
    !!value &&
    'name' in value &&
    typeof value.name === 'string' &&
    builtInNames.includes(value.name);
