# timefold
A blazingly fast, modular and bundle size friendly ecs powered game engine for the web.

## Info

Each `@timefold/*` package is designed to do just one thing, and to do it well. The specific design goals for each module are:

- Leverage Typescript to offer the best DX possible and to catch bugs at compile time.
- Write high performance code by optimizing for the CPU cache, reducing memory allocations and respecting V8 best practices.
- ESM only. All code is tree shakeable.
- 0 Dependencies

## Modules

Every module can be used independantly from each other, but they unlock their full potential when used together. They live on different levels of abstraction to serve a wide variety of consumers.

#### Core

Create your own Ecs Plugins, WebgpuRenderers, Asset pipelines and so much more by leveraging low level building blocks. These modules provide everything from a thin type-safe layer on top of browser APIs, up to a full blown `ObjLoader`, `Gltf2Loader` and `WebgpuRenderer`.

- [@timefold/ecs](./packages/ecs/README.md)
- [@timefold/math](./packages/math/README.md)
- [@timefold/obj](./packages/obj/README.md)
- [@timefold/gltf2](./packages/gltf2/README.md)
- [@timefold/webgpu](./packages/webgpu/README.md)

#### Engine

Dont want to deal with a `WebgpuRenderer` yourself, but just include a ready-to-ue ECS RenderPlugin into your world? If you are a programmer, familiar with Typescript, then you will feel at home on the engine level abstraction. 

- [@timefold/engine](./packages/engine/README.md)

#### Editor

There are plans to create a editor as well sometime in the future. It will not only support a scene graph, but also a node based material, animation and scripting system. This abstraction level targets users who cannot code.
