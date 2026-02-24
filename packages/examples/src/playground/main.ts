/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { createWorld, plugin, query } from '@timefold/ecs';
import {
    DirLight,
    DomUtils,
    EngineComponent,
    engineComponents,
    ImageLoader,
    PerspectiveCamera,
    PhongMaterial,
    T,
    Transform,
} from '@timefold/engine';
import { Quat, Vec3 } from '@timefold/math';
import { createWebGPURenderer } from './webgpu-renderer';
import { ObjLoader } from '@timefold/obj';

const canvas = DomUtils.getCanvasById('canvas');
const aspect = canvas.width / canvas.height;

// type Test = Exclude<EngineComponent, { type: typeof T.Transform }>;
// type Test2 = EngineComponent | { type: 8 };

const q1 = query<EngineComponent>()
    .name('query1')
    .with(T.Transform)
    .with(T.PerspectiveCamera, { include: false })
    .without(T.DirLight)
    .compile();

const q2 = query<EngineComponent>()
    .name('query2')
    .with(T.PhongMaterial)
    .with(T.PerspectiveCamera, { include: false })
    .compile();

const p1 = plugin<EngineComponent>().name('plugin1').withQueries(q1).compile();

const world = createWorld({
    components: engineComponents,
    plugins: [p1],
    queries: [q2],
});

const main = async () => {
    const camera = world.spawn([
        Transform.createAndLookAt({ translation: Vec3.create(0, 3, 8), target: Vec3.zero() }),
        PerspectiveCamera.create({ aspect }),
    ]);

    const lightTransformComponent = Transform.createAndLookAt({
        translation: Vec3.create(1, 3, 3),
        target: Vec3.zero(),
    });

    const light = world.spawn([
        lightTransformComponent,
        DirLight.create({
            direction: Transform.extractForward(Vec3.create(), lightTransformComponent.data),
            color: Vec3.create(1, 1, 1),
            intensity: 1,
        }),
    ]);

    const cube = world.spawn([
        Transform.create({ translation: Vec3.zero() }),
        PhongMaterial.create({ diffuseColor: Vec3.create(0.2, 0.5, 0.8) }),
    ]);

    // Extract component data for the renderer
    const cameraTransform = world.getComponent(camera, T.Transform)!.data;
    const cameraData = world.getComponent(camera, T.PerspectiveCamera)!.data;
    const lightData = world.getComponent(light, T.DirLight)!.data;
    const cubeTransform = world.getComponent(cube, T.Transform)!.data;
    const cubeMaterial = world.getComponent(cube, T.PhongMaterial)!.data;
    const lightTransform = world.getComponent(light, T.Transform)!.data;

    const result = await ObjLoader.load('./cube-blender-default-settings.obj', {
        mode: 'non-interleaved-typed-array-indexed',
    });

    console.log(result);

    const cubePrimitive = result.objects[0].primitives[0];

    const texture = await ImageLoader.loadImage('./cube-uv-debug-map.png');

    const renderer = createWebGPURenderer(canvas, {
        cameraTransform,
        cameraData,
        lightData,
        lightTransform,
        cubeGeometry: {
            posiitions: cubePrimitive.positions,
            normals: cubePrimitive.normals,
            uvs: cubePrimitive.uvs,
            indices: cubePrimitive.indices,
        },
        cubeTransform,
        cubeMaterial,
        texture,
    });

    let lastTime = 0;
    const rotationSpeed = 0.8; // radians per second

    const tick = (time: number) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        if (dt > 0 && dt < 0.5) {
            Quat.rotationY(cubeTransform.rotation, cubeTransform.rotation, rotationSpeed * dt);
        }

        renderer.frame();
        requestAnimationFrame(tick);
    };

    await renderer.init();
    requestAnimationFrame(tick);
};

void main();
