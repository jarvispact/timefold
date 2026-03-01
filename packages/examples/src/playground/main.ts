/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { worldBuilder, query } from '@timefold/ecs';
import {
    DirLight,
    DomUtils,
    EngineComponent,
    engineComponents,
    ImageLoader,
    PerspectiveCamera,
    PhongMaterial,
    Transform,
} from '@timefold/engine';
import { Quat, Vec3 } from '@timefold/math';
import { createWebGPURenderer } from './webgpu-renderer';
import { ObjLoader } from '@timefold/obj';

const canvas = DomUtils.getCanvasById('canvas');
const aspect = canvas.width / canvas.height;

const q1 = query<EngineComponent>()
    .name('query1')
    .with('Transform')
    .with('PerspectiveCamera', { include: false })
    .without('DirLight')
    .compile();

const q2 = query<EngineComponent>().name('query2').with('PhongMaterial').with('PerspectiveCamera').compile();

const q3 = query<EngineComponent>().name('query3').includeEntity().compile();

const q4 = query<EngineComponent>()
    .name('query4')
    .includeEntity()
    .with('Transform')
    .with('DirLight', { include: false })
    .without('PhongMaterial')
    .compile();

const world = worldBuilder().withComponents(engineComponents).withQueries(q1, q2, q3, q4).compile();

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
    const cameraTransform = world.getComponent(camera, 'Transform')!.data;
    const cameraData = world.getComponent(camera, 'PerspectiveCamera')!.data;
    const lightData = world.getComponent(light, 'DirLight')!.data;
    const cubeTransform = world.getComponent(cube, 'Transform')!.data;
    const cubeMaterial = world.getComponent(cube, 'PhongMaterial')!.data;
    const lightTransform = world.getComponent(light, 'Transform')!.data;

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
