import { Component, createWorld, defineComponentTypes } from '@timefold/ecs';
import {
    DomUtils,
    EngineComponent,
    EngineComponentTypeNames,
    MainCameraTag,
    OrthographicCamera,
    Renderable,
    Transform2D,
    Transform3D,
} from '@timefold/engine';
import { EntityRenderPass } from './entity-render-pass';
import { createPipeline } from '@timefold/webgpu';
import { Vec3, Vec3Type } from '@timefold/math';

const { T } = defineComponentTypes([...EngineComponentTypeNames, 'Color']);
type ColorComponent = Component<typeof T.Color, Vec3Type>;
type WorldComponent = EngineComponent | ColorComponent;
const world = createWorld<WorldComponent>();

function color(r: number, g: number, b: number): ColorComponent {
    return { type: T.Color, data: Vec3.create(r, g, b) };
}

const canvas = DomUtils.getCanvasById('canvas');
const aspect = canvas.width / canvas.height;
const pipeline = await createPipeline({ canvas, msaa: 1 }).withPass(EntityRenderPass).build();

const camera = world.createEntity();

DomUtils.onResize({
    canvas,
    fn: (width, height) => {
        pipeline.passes.EntityRenderPass.resize(width, height);
        const cam = world.getComponent(camera, T.OrthographicCamera);
        if (cam) {
            const newAspect = width / height;
            OrthographicCamera.update(cam.data, {
                left: -10 * newAspect,
                right: 10 * newAspect,
                bottom: -10,
                top: 10,
                near: 0,
                far: 10,
            });

            pipeline.passes.EntityRenderPass.setCamera({ viewProjectionMatrix: cam.data.viewProjectionMatrix });
            pipeline.update();
        }
    },
});

const cameras = world.createQuery({
    query: { tuple: [T.Transform3D, T.OrthographicCamera, T.MainCameraTag] },
    map: ([transform, camera]) => ({ transform: transform.data, camera: camera.data }),
});

world.createQuery({
    query: { tuple: [T.Transform2D, T.Color, T.Renderable] },
    map: ([t, c]) => ({ transform: t.data, color: c.data }),
    onAdd: (entity, { transform, color }) => {
        pipeline.passes.EntityRenderPass.addEntity({
            id: entity,
            modelMatrix: transform.modelMatrix,
            color,
        });
    },
    onRemove: (entity) => {
        pipeline.passes.EntityRenderPass.removeEntity(entity);
    },
});

world.createQuery({
    query: { tuple: [T.Transform3D, T.Color, T.Renderable] },
    map: ([t, c]) => ({ transform: t.data, color: c.data }),
    onAdd: (entity, { transform, color }) => {
        pipeline.passes.EntityRenderPass.addEntity({
            id: entity,
            modelMatrix: transform.modelMatrix,
            color,
        });
    },
    onRemove: (entity) => {
        pipeline.passes.EntityRenderPass.removeEntity(entity);
    },
});

function startup() {
    world.spawn(camera, [
        Transform3D.createFromTRS({ translation: [0, 0, 5] }),
        OrthographicCamera.create({ left: -10 * aspect, right: 10 * aspect, bottom: -10, top: 10, near: 0, far: 10 }),
        MainCameraTag.create(),
    ]);

    const entity2D_1 = world.createEntity();
    const entity2D_2 = world.createEntity();
    world.spawn(entity2D_1, [Transform2D.createFromTRS({ translation: [-5, 0] }), color(1, 0, 0), Renderable.create()]);
    world.spawn(entity2D_2, [Transform2D.createFromTRS({ translation: [5, 0] }), color(0, 1, 0), Renderable.create()]);
    const entity3D_1 = world.createEntity();
    const entity3D_2 = world.createEntity();
    world.spawn(entity3D_1, [
        Transform3D.createFromTRS({ translation: [0, -5, 0] }),
        color(0, 0, 1),
        Renderable.create(),
    ]);
    world.spawn(entity3D_2, [
        Transform3D.createFromTRS({ translation: [0, 5, 0] }),
        color(1, 1, 0),
        Renderable.create(),
    ]);
}

function updateCameraFromTransform() {
    for (const item of cameras) {
        OrthographicCamera.updateFromModelMatrix(item.camera, item.transform.modelMatrix);
        pipeline.passes.EntityRenderPass.setCamera({ viewProjectionMatrix: item.camera.viewProjectionMatrix });
    }
}

function update() {
    console.log('update');
    updateCameraFromTransform();
    pipeline.update();
    // window.requestAnimationFrame(update);
}

startup();
window.requestAnimationFrame(update);
