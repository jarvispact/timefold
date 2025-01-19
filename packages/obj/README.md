# @timefold/obj
Fast and efficient, zero dependency `.obj` and `.mtl` loader and parser.

## Overview

- 🔥 Fast and efficient.
- 🪶 The whole package is only 2.3 kB (minified and gzipped).
- 🌳 Tree-shakeable. Only pay for what you need.
- 🚀 Awesome DX and type safety. Everything is inferred automatically.
- 🔨 Lots of options and conversions. Flexible and optimized for WebGL and WebGPU

## Installation

- `npm i @timefold/obj`

## Quick start

```ts
import { ObjLoader, ObjParser, MtlLoader, MtlParser } from '@timefold/obj';

// fetch and parse a .obj file
const objResult1 = await ObjLoader.load('/assets/file.obj');
// or parse from a string
const objResult2 = ObjParser.parse('...');

// ---

// fetch and parse a .mtl file
const mtlResult1 = await MtlLoader.load('/assets/file.mtl');
// or parse from a string
const mtlResult2 = MtlParser.parse('...');
```

## Options

You can also create a instance of the loader or parser yourself and pass some options:

```ts
import { ObjLoader, ObjParser } from '@timefold/obj';

const Loader = ObjLoader.createLoader({
    mode: 'interleaved-typed-array-indexed',
    splitObjectMode: 'object',
    flipUvX: false,
    flipUvY: false,
});

const objResult1 = await Loader.load('/assets/file.obj');

// ---

const parse = ObjParser.createParser({
    mode: 'interleaved-typed-array-indexed',
    splitObjectMode: 'object',
    flipUvX: false,
    flipUvY: false,
});

const objResult2 = parse('...');
```

Here is the full type of available options:

```ts
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

The result will depend on the `mode` and looks like that

```ts
// This will be automatically inferred for you from the `mode` option
type Primitive =
    | InterleavedObjPrimitive
    | InterleavedObjPrimitiveIndexed
    | NonInterleavedObjPrimitive
    | NonInterleavedObjPrimitiveIndexed;

type ObjResult = {
    objects: Record<string, {
        name: string;
        primitives: Record<string, Primitive>;
    }>;
};
```

## API

Types are abbreviated for a short and concise overview.

- `obj`
    - `ObjLoader.load(path: string) => ObjResult`
    - `ObjParser.parse(source: string) => ObjResult`
    - `ObjLoader.createLoader(options?: Options) => Loader`
    - `ObjParser.createParser(options?: Options) => ParseFn`
    - `ObjParser.convertInterleavedToIndexed(primitive: Primitive) => ConvertedPrimitive`
    - `ObjParser.convertNonInterleavedToIndexed(primitive: Primitive) => ConvertedPrimitive`
    - `ObjParser.convertInterleavedToTypedArray(primitive: Primitive) => ConvertedPrimitive`
    - `ObjParser.convertNonInterleavedToTypedArray(primitive: Primitive) => ConvertedPrimitive`
- `mtl`
    - `MtlLoader.load(path: string) => MtlResult`
    - `MtlParser.parse(source: string) => MtlResult`