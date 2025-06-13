# timefold
A blazingly fast, ecs powered game engine for the web

## Notice

This project is still in active development and the API might change with upcoming releases!

## Modules

The following modules are available and can be used independantly from each other, but they unlock their full potential when used together. All modules have 0 dependencies and are heavily optimized for bundle size and runtime performance.

- [@timefold/ecs](./packages/ecs/README.md)
- [@timefold/math](./packages/math/README.md)
- [@timefold/obj](./packages/obj/README.md)
- [@timefold/gltf2](./packages/gltf2/README.md)
- [@timefold/webgpu](./packages/webgpu/README.md)
- [@timefold/engine](./packages/engine/README.md)

I want to provide the best DX possible, thats why all the packages are not only stringly typed, but also infer the correct types wherever possible. **If it compiles, it runs!**

## Hello Static World

A simple static scene with a camera, light and the beloved Phong shaded Suzanne model. [Check it out live with Stackblitz](https://stackblitz.com/edit/vitejs-vite-sryl6fna?file=src%2Fmain.ts)

```ts
import { createSystem } from '@timefold/ecs';
import { ObjLoader } from '@timefold/obj';
import { Vec3 } from '@timefold/math';
import {
    CameraBundle, createRenderPlugin, createWorld, DirLight, DirLightBundle,
    DomUtils, InterleavedPrimitive, Mesh, MeshBundle, PerspectiveCamera,
    PhongMaterial, Transform, UpdateCameraFromTransformPlugin,
} from '@timefold/engine';

const world = createWorld();
const canvas = DomUtils.getCanvasById('canvas');
const RenderPlugin = createRenderPlugin({ canvas });

const Startup = createSystem({
    stage: 'startup',
    fn: async () => {
        const { info, objects } = await ObjLoader.load('./suzanne.obj');

        world.spawnBundle({
            id: 'camera',
            bundle: CameraBundle.create({
                transform: Transform.createAndLookAt({ translation: Vec3.create(1, 2, 3), target: Vec3.zero() }),
                camera: PerspectiveCamera.create({ aspect: canvas.width / canvas.height }),
            }),
        });

        world.spawnBundle({
            id: 'sun',
            bundle: DirLightBundle.create({
                dirLight: DirLight.create({ direction: Vec3.normalize(Vec3.negate(Vec3.create(-3, 5, 10))) }),
            }),
        });

        world.spawnBundle({
            id: 'suzanne',
            bundle: MeshBundle.create({
                transform: Transform.createFromTRS({ translation: Vec3.create(0, 0, 0) }),
                mesh: Mesh.create({
                    material: PhongMaterial.create({ diffuseColor: Vec3.create(0.42, 0.42, 0.42) }),
                    primitive: InterleavedPrimitive.fromObjPrimitive(objects.Suzanne.primitives.default, info),
                }),
            }),
        });
    },
});

const main = async () => {
    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin])
        .registerSystems([Startup])
        .run();
};

void main();

```

## Hello Animated World

In a ECS architecture, we usually dont animate a single entity but a set of entities that hold certain components. So, we define a query and a new system:

```ts
const updateQuery = world.createQuery({
    query: { tuple: [{ has: '@tf/Transform' }, { has: '@tf/Mesh', include: false }] },
});

const RotationSystem = createSystem({
    stage: 'update',
    fn: (delta) => {
        for (const [transform] of updateQuery) {
            Transform.rotateY(transform, MathUtils.degreesToRadians(45) * delta);
        }
    },
});
```

... and add it to the world:

```diff
const main = async () => {
    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin])
-        .registerSystems([Startup])
+        .registerSystems([Startup, RotationSystem])
        .run();
};
```

and now the suzanne model rotates at a speed of 45 degrees per second around the Y axis. [Check it out live with Stackblitz](https://stackblitz.com/edit/vitejs-vite-q6cma8ln?file=src%2Fmain.ts)