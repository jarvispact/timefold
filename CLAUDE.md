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

## Commands

### Testing
- `npm test` - Run tests across all packages
- `npm run test -w @timefold/ecs` - Run tests for a specific package

### Building
- `npm run build` - Build all packages (outputs to `dist/` in each package)
- `npm run build -w @timefold/ecs` - Build a specific package

### Linting
- `npm run lint` - Lint all TypeScript files using ESLint with strict type-checking

### Examples
- `npm run dev:hello-ecs -w @timefold/examples` - Run the hello-ecs example with hot reload on port 9093
- `npm run preview -w @timefold/examples` - Preview built examples on port 9191

### Publishing
- `npm run publish-to-npm` - Build and publish all packages to npm

## Development Notes

- All packages use TypeScript with strict type-checking enabled
- Each package has its own `tsconfig.json` extending `tsconfig.base.json`
- Package builds clean `dist/` directories before building
- Use workspace dependencies (`*`) when referencing other timefold packages (npm workspaces use `*`, not `workspace:*`)
- Examples use a template-based approach: `index.html.template` is processed with `sed` to generate `index.html`
