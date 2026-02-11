# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Timefold is a modular, ECS-powered game engine for the web. The codebase is organized as an npm workspace monorepo with independent packages at different abstraction levels:

**Core packages** (low-level building blocks):
- `@timefold/ecs` - Entity/Component/System implementation
- `@timefold/math` - Math utilities
- `@timefold/obj` - OBJ file loader
- `@timefold/gltf2` - GLTF2 loader
- `@timefold/webgpu` - WebGPU renderer

**Engine package** (high-level):
- `@timefold/engine` - Ready-to-use ECS plugins, components, and abstractions built on core packages

**Examples**:
- `@timefold/examples` - Example implementations (private package)

Each package is designed to be used independently with 0 dependencies, ESM-only, and fully tree-shakeable. TypeScript paths are configured in `tsconfig.base.json` to import packages via `@timefold/*`.

## Development Notes

- All packages use TypeScript with strict type-checking enabled
- Each package has its own `tsconfig.json` extending `tsconfig.base.json`
- Package builds clean `dist/` directories before building. The build uses `tsc` to generate `.js`, `.d.ts` and sourcemap files. No bundling via vite!
- Examples use a template-based approach: `index.html.template` is processed with `sed` to generate `index.html`

## Documentation

Technical specifications are available in `docs/` for reference. Read these **on-demand** when working on related areas:

- **`docs/webgpu-spec.md`** - Read when working on `@timefold/webgpu` renderer implementation, debugging GPU pipeline issues, implementing render passes, or understanding WebGPU resource lifecycle (buffers, textures, bind groups, command encoding).

- **`docs/wgsl-spec.md`** - Read when writing or modifying shader code, implementing custom materials, debugging shader compilation errors, or understanding WGSL type system and built-in functions.

- **`docs/gltf2-spec.md`** - Read when working on `@timefold/gltf2` loader/parser, implementing support for glTF extensions, debugging asset loading issues, or understanding glTF binary data layout (accessors, bufferViews).

- **`docs/v8-internals.md`** - Read when optimizing performance-critical code (ECS systems, math operations, rendering loops, ...), investigating deoptimization issues, or implementing data structures that need to be JIT-friendly (avoid hidden class mutations).

## Coding Style

- Never use classes. Use plain objects, functions, and closures instead.
- Prefer regular `for` loops over `.forEach`, `.map`, `.filter`, etc. in all code.
