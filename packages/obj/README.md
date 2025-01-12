# @timefold/obj
Fast and efficient, zero dependency `.obj` loader and parser.

## Installation

- `npm i @timefold/obj`

## Quick start

```ts
import { ObjLoader, ObjParser } from '@timefold/obj';

const loadObj = ObjLoader.createLoader();
const result = await loadObj('/assets/file.obj'); // fetch and parse a .obj file

const parse = ObjParser.createParser();
const objFileContent = '...';
const result = parse(objFileContent); // parse from a .obj string
```

## Options

There are some options available that will influence the behaviour and result of loader and parser.

```ts
// Same options can be passed to `ObjParser.createParser`
const loadObj = ObjLoader.createLoader({
    mode: 'interleaved-typed-array-indexed',
    splitObjectMode: 'object',
    flipUvX: false,
    flipUvY: false,
});
```

The full type of available options:

```ts
// The return type is inferred automatically based on the `mode` option.
type Mode = 
    | "interleaved-number-array"
    | "interleaved-typed-array"
    | "interleaved-number-array-indexed"
    | "interleaved-typed-array-indexed" // default
    | "non-interleaved-number-array"
    | "non-interleaved-typed-array"
    | "non-interleaved-number-array-indexed"
    | "non-interleaved-typed-array-indexed"

type ParserOptions = {
    mode: Mode;
    splitObjectMode: 'object' | 'group';
    flipUvX: boolean;
    flipUvY: boolean;
};
```

## Return type based on `mode` option


| Mode                                   | Primitive type                                                                                               |
|----------------------------------------|--------------------------------------------------------------------------------------------------------------|
| "interleaved-number-array"             | `{ vertices: number[] }`                                                                                     |
| "interleaved-typed-array"              | `{ vertices: Float32Array }`                                                                                 |
| "interleaved-number-array-indexed"     | `{ vertices: number[], indices: number[] }`                                                                  |
| "interleaved-typed-array-indexed"      | `{ vertices: Float32Array, indices: Uint16Array \| Uint32Array }`                                            |
| "non-interleaved-number-array"         | `{ positions: number[], uvs: number[], normals: number[] }`                                                  |
| "non-interleaved-typed-array"          | `{ positions: Float32Array, uvs: Float32Array, normals: Float32Array }`                                      |
| "non-interleaved-number-array-indexed" | `{ positions: number[], uvs: number[], normals: number[], indices: number[] }`                               |
| "non-interleaved-typed-array-indexed"  | `{ positions: Float32Array, uvs: Float32Array, normals: Float32Array, indices: Uint16Array \| Uint32Array }` |

For `interleaved` results, the following additional info will be available on the result: `stride`, `positionOffset`, `uvOffset` and `normalOffset`.