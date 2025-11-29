import { createWorld } from '@timefold/ecs';
import {
    DomUtils,
    EngineComponent,
    EngineComponentType,
    MainCameraTag,
    OrthographicCamera,
    Renderable,
    Transform2D,
    Transform3D,
} from '@timefold/engine';
import { EntityRenderPass } from './entity-render-pass';
import { createPipeline } from '@timefold/webgpu';

const T = EngineComponentType;
const world = createWorld<EngineComponent>();

const canvas = DomUtils.getCanvasById('canvas');
const pipeline = await createPipeline({ canvas, msaa: 1 }).withPass(EntityRenderPass).build();

DomUtils.onResize({
    canvas,
    fn: (width, height) => {
        pipeline.passes.EntityRenderPass.resize(width, height);
    },
});

const cameras = world.createQuery({
    query: { tuple: [T.Transform3D, T.OrthographicCamera, T.MainCameraTag] },
    map: ([transform, camera]) => ({ transform: transform.data, camera: camera.data }),
    onAdd: (entity, data) => {
        console.log(entity, data);
    },
});

const renderable2D = world.createQuery({
    query: { tuple: [T.Transform2D, T.Renderable] },
    map: ([t]) => t.data,
    onAdd: (entity, transform) => {
        console.log(entity, transform.translation);
    },
});

const renderable3D = world.createQuery({
    query: { tuple: [T.Transform3D, T.Renderable] },
    map: ([t]) => t.data,
    onAdd: (entity, transform) => {
        console.log(entity, transform.translation);
    },
});

function startup() {
    const camera = world.createEntity();
    world.spawn(camera, [
        Transform3D.createFromTRS({ translation: [0, 0, 10] }),
        OrthographicCamera.create({ left: -10, right: 10, bottom: -10, top: 10, near: 0.1, far: 1000 }),
        MainCameraTag.create(),
    ]);

    const entity2D_1 = world.createEntity();
    const entity2D_2 = world.createEntity();
    world.spawn(entity2D_1, [Transform2D.createFromTRS({ translation: [-5, 0] }), Renderable.create()]);
    world.spawn(entity2D_2, [Transform2D.createFromTRS({ translation: [5, 0] }), Renderable.create()]);

    const entity3D_1 = world.createEntity();
    const entity3D_2 = world.createEntity();
    world.spawn(entity3D_1, [Transform3D.createFromTRS({ translation: [0, -5, 0] }), Renderable.create()]);
    world.spawn(entity3D_2, [Transform3D.createFromTRS({ translation: [0, 5, 0] }), Renderable.create()]);

    console.log({ cameras, renderable2D, renderable3D });
}

function updateCameraFromTransform() {
    for (const item of cameras) {
        OrthographicCamera.updateFromModelMatrix(item.camera, item.transform.modelMatrix);
    }
}

function update() {
    updateCameraFromTransform();
    pipeline.update();
    // window.requestAnimationFrame(update);
}

startup();
window.requestAnimationFrame(update);
