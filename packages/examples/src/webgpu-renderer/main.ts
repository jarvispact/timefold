import { createWorld, defineComponentTypes } from '@timefold/ecs';
import {
    DomUtils,
    EngineComponent,
    EngineComponentTypeNames,
    InterleavedPrimitive,
    InterleavedPrimitiveComponent,
    MainCameraTag,
    NonInterleavedPrimitive,
    NonInterleavedPrimitiveComponent,
    OrthographicCamera,
    PhongMaterial,
    PhongMaterialComponent,
    Renderable,
    Transform2D,
    Transform3D,
    UnlitMaterial,
    UnlitMaterialComponent,
} from '@timefold/engine';
import { createPipeline, Uniform, WebgpuUtils } from '@timefold/webgpu';
import { Mat4x4, Quat, Vec3 } from '@timefold/math';
import { getUnlitShaderCode, UnlitPipelineLayout, UnlitMaterialStruct } from './unlit-material';
import { quadIndices, quadInterleavedIndexed, quadNormals, quadPositions, quadUvs } from './quad-geometry';
import { FrameStruct, TransformStruct } from './common';
import { createColorRenderPass } from './color-render-pass';
import { getPhongShaderCode, PhongMaterialStruct, PhongPipelineLayout } from './phong-material';

const { T } = defineComponentTypes([...EngineComponentTypeNames]);
type WorldComponent = EngineComponent;
const world = createWorld<WorldComponent>();

const canvas = DomUtils.getCanvasById('canvas');
const aspect = canvas.width / canvas.height;

const VertexInterleaved = WebgpuUtils.createVertexBufferLayout({
    label: 'Simple Quad Layout',
    mode: 'interleaved',
    definition: {
        position: { format: 'float32x3', stride: 0 },
        uv: { format: 'float32x2', stride: 3 },
        normal: { format: 'float32x3', stride: 5 },
    },
});

const VertexNonInterleaved = WebgpuUtils.createVertexBufferLayout({
    label: 'Simple Quad Layout',
    mode: 'non-interleaved',
    definition: {
        position: { format: 'float32x3' },
        uv: { format: 'float32x2' },
        normal: { format: 'float32x3' },
    },
});

const frameStruct = FrameStruct.create();

const ColorPass = createColorRenderPass<
    UnlitMaterialComponent | PhongMaterialComponent,
    InterleavedPrimitiveComponent | NonInterleavedPrimitiveComponent
>({
    onNewMaterialType: ({ device, material }) => {
        switch (material.type) {
            case UnlitMaterial.type: {
                const layout = UnlitPipelineLayout.createLayout(device);

                const frameBg = UnlitPipelineLayout.createBindGroups({
                    device,
                    group: 0,
                    bindings: {
                        frame: WebgpuUtils.createUniformBufferDescriptor({ label: 'Frame Uniform Buffer' }),
                    },
                });

                return {
                    layout,
                    frameBindgroup: {
                        group: frameBg.group,
                        bindGroup: frameBg.bindGroup,
                        entries: [{ buffer: frameBg.buffers.frame, data: frameStruct.buffer }],
                    },
                    getShaderCode: ({ vertexWgsl }) => {
                        return getUnlitShaderCode({
                            vertexWgsl,
                            uniformsWgsl: Uniform.getWgslFromGroups(UnlitPipelineLayout.uniformGroups),
                        });
                    },
                };
            }
            case PhongMaterial.type: {
                const layout = PhongPipelineLayout.createLayout(device);

                const frameBg = PhongPipelineLayout.createBindGroups({
                    device,
                    group: 0,
                    bindings: {
                        frame: WebgpuUtils.createUniformBufferDescriptor({ label: 'Frame Uniform Buffer' }),
                    },
                });

                return {
                    layout,
                    frameBindgroup: {
                        group: frameBg.group,
                        bindGroup: frameBg.bindGroup,
                        entries: [{ buffer: frameBg.buffers.frame, data: frameStruct.buffer }],
                    },
                    getShaderCode: ({ vertexWgsl }) => {
                        return getPhongShaderCode({
                            vertexWgsl,
                            uniformsWgsl: Uniform.getWgslFromGroups(PhongPipelineLayout.uniformGroups),
                        });
                    },
                };
            }
        }
    },
    onNewGeometryType: ({ geometry }) => {
        switch (geometry.type) {
            case InterleavedPrimitive.type: {
                return {
                    primitive: { topology: 'triangle-list' },
                    layout: VertexInterleaved.layout,
                    vertexWgsl: VertexInterleaved.wgsl,
                };
            }
            case NonInterleavedPrimitive.type: {
                return {
                    primitive: { topology: 'triangle-list' },
                    layout: VertexNonInterleaved.layout,
                    vertexWgsl: VertexNonInterleaved.wgsl,
                };
            }
        }
    },
    onNewMaterialInstance: ({ device, material, data }) => {
        switch (material.type) {
            case UnlitMaterial.type: {
                const bindGroup = UnlitPipelineLayout.createBindGroups({
                    device,
                    group: 1,
                    bindings: {
                        material: WebgpuUtils.createUniformBufferDescriptor({ label: 'Material Uniform Buffer' }),
                    },
                });

                return {
                    bindGroup: {
                        group: bindGroup.group,
                        bindGroup: bindGroup.bindGroup,
                        entries: [{ buffer: bindGroup.buffers.material, data }],
                    },
                };
            }
            case PhongMaterial.type: {
                const bindGroup = PhongPipelineLayout.createBindGroups({
                    device,
                    group: 1,
                    bindings: {
                        material: WebgpuUtils.createUniformBufferDescriptor({ label: 'Material Uniform Buffer' }),
                    },
                });

                return {
                    bindGroup: {
                        group: bindGroup.group,
                        bindGroup: bindGroup.bindGroup,
                        entries: [{ buffer: bindGroup.buffers.material, data }],
                    },
                };
            }
        }
    },
    onNewGeometryInstance: ({ device, geometry }) => {
        switch (geometry.type) {
            case InterleavedPrimitive.type: {
                const P = VertexInterleaved.createBuffer(device, quadInterleavedIndexed);
                const I = WebgpuUtils.createIndexBuffer({
                    device,
                    format: 'uint16',
                    data: quadIndices,
                    label: 'Simple Quad Index Buffer',
                });
                return { primitive: { type: 'interleaved', vertex: P, index: I } };
            }
            case NonInterleavedPrimitive.type: {
                const P = VertexNonInterleaved.createBuffers(device, {
                    position: quadPositions,
                    uv: quadUvs,
                    normal: quadNormals,
                });
                const I = WebgpuUtils.createIndexBuffer({
                    device,
                    format: 'uint16',
                    data: quadIndices,
                    label: 'Simple Quad Index Buffer',
                });
                return {
                    primitive: {
                        type: 'non-interleaved',
                        positionsCount: P.attribs.position.count,
                        buffers: Object.values(P.attribs),
                        index: I,
                    },
                };
            }
        }
    },
    onNewTransform: ({ device, material, data }) => {
        switch (material.type) {
            case UnlitMaterial.type: {
                const bindGroup = UnlitPipelineLayout.createBindGroups({
                    device,
                    group: 2,
                    bindings: {
                        transform: WebgpuUtils.createUniformBufferDescriptor({ label: 'Transform Uniform Buffer' }),
                    },
                });

                return {
                    bindGroup: {
                        group: bindGroup.group,
                        bindGroup: bindGroup.bindGroup,
                        entries: [{ buffer: bindGroup.buffers.transform, data }],
                    },
                };
            }
            case PhongMaterial.type: {
                const bindGroup = PhongPipelineLayout.createBindGroups({
                    device,
                    group: 2,
                    bindings: {
                        transform: WebgpuUtils.createUniformBufferDescriptor({ label: 'Transform Uniform Buffer' }),
                    },
                });

                return {
                    bindGroup: {
                        group: bindGroup.group,
                        bindGroup: bindGroup.bindGroup,
                        entries: [{ buffer: bindGroup.buffers.transform, data }],
                    },
                };
            }
        }
    },
});

const pipeline = await createPipeline({ canvas, msaa: 1 }).withPass(ColorPass).build();

const camera = world.createEntity();

DomUtils.onResize({
    canvas,
    fn: (width, height) => {
        pipeline.passes.ColorRenderPass.resize(width, height);
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

            Mat4x4.copy(frameStruct.views.camera.view_projection_matrix, cam.data.viewProjectionMatrix);
            pipeline.update();
        }
    },
});

const cameras = world.createQuery({
    query: { tuple: [T.Transform3D, T.OrthographicCamera, T.MainCameraTag] },
    map: ([transform, camera]) => ({ transform: transform.data, camera: camera.data }),
});

world.createQuery({
    query: { tuple: [T.Transform2D, T.UnlitMaterial, T.InterleavedPrimitive, T.Renderable] },
    map: ([t, m, p]) => ({ transform: t.data, material: m, primitive: p }),
    onAdd: (entity, { transform, material, primitive }) => {
        const t = TransformStruct.create();
        Mat4x4.copy(t.views.model_matrix, transform.modelMatrix);

        const m = UnlitMaterialStruct.create();
        Vec3.copy(m.views.color, material.data.color);

        pipeline.passes.ColorRenderPass.addEntity({
            id: entity,
            material: material,
            geometry: primitive,
            materialData: m.buffer,
            transformData: t.buffer,
        });
    },
    onRemove: (entity) => {
        pipeline.passes.ColorRenderPass.removeEntity(entity);
    },
});

world.createQuery({
    query: { tuple: [T.Transform2D, T.UnlitMaterial, T.NonInterleavedPrimitive, T.Renderable] },
    map: ([t, m, p]) => ({ transform: t.data, material: m, primitive: p }),
    onAdd: (entity, { transform, material, primitive }) => {
        const t = TransformStruct.create();
        Mat4x4.copy(t.views.model_matrix, transform.modelMatrix);

        const m = UnlitMaterialStruct.create();
        Vec3.copy(m.views.color, material.data.color);

        pipeline.passes.ColorRenderPass.addEntity({
            id: entity,
            material: material,
            geometry: primitive,
            materialData: m.buffer,
            transformData: t.buffer,
        });
    },
    onRemove: (entity) => {
        pipeline.passes.ColorRenderPass.removeEntity(entity);
    },
});

world.createQuery({
    query: { tuple: [T.Transform3D, T.PhongMaterial, T.InterleavedPrimitive, T.Renderable] },
    map: ([t, m, p]) => ({ transform: t.data, material: m, primitive: p }),
    onAdd: (entity, { transform, material, primitive }) => {
        const t = TransformStruct.create();
        Mat4x4.copy(t.views.model_matrix, transform.modelMatrix);

        const m = PhongMaterialStruct.create();
        Vec3.copy(m.views.diffuse_color, material.data.diffuseColor);

        pipeline.passes.ColorRenderPass.addEntity({
            id: entity,
            material: material,
            geometry: primitive,
            materialData: m.buffer,
            transformData: t.buffer,
        });
    },
    onRemove: (entity) => {
        pipeline.passes.ColorRenderPass.removeEntity(entity);
    },
});

world.createQuery({
    query: { tuple: [T.Transform3D, T.PhongMaterial, T.NonInterleavedPrimitive, T.Renderable] },
    map: ([t, m, p]) => ({ transform: t.data, material: m, primitive: p }),
    onAdd: (entity, { transform, material, primitive }) => {
        const t = TransformStruct.create();
        Mat4x4.copy(t.views.model_matrix, transform.modelMatrix);

        const m = PhongMaterialStruct.create();
        Vec3.copy(m.views.diffuse_color, material.data.diffuseColor);

        pipeline.passes.ColorRenderPass.addEntity({
            id: entity,
            material: material,
            geometry: primitive,
            materialData: m.buffer,
            transformData: t.buffer,
        });
    },
    onRemove: (entity) => {
        pipeline.passes.ColorRenderPass.removeEntity(entity);
    },
});

function startup() {
    world.spawn(camera, [
        Transform3D.createFromTRS({ translation: [0, 0, 5] }),
        OrthographicCamera.create({ left: -10 * aspect, right: 10 * aspect, bottom: -10, top: 10, near: 0, far: 10 }),
        MainCameraTag.create(),
    ]);

    const redUnlitMaterial = UnlitMaterial.create({ color: Vec3.create(1, 0, 0) });
    const redPhongMaterial = PhongMaterial.create({ diffuseColor: Vec3.create(1, 0, 0) });

    const interleavedPrimitive = InterleavedPrimitive.create({
        layout: {
            position: { format: 'float32x3', stride: 0 },
            uv: { format: 'float32x2', stride: 3 },
            normal: { format: 'float32x3', stride: 5 },
        },
        vertices: quadInterleavedIndexed,
        indices: quadIndices,
    });

    const nonInterleavedPrimitive = NonInterleavedPrimitive.create({
        attributes: {
            position: { format: 'float32x3', data: quadPositions },
            uv: { format: 'float32x2', data: quadUvs },
            normal: { format: 'float32x3', data: quadNormals },
        },
        indices: quadIndices,
    });

    for (let i = 0; i < 4; i++) {
        const x = i * 4 - 6;
        world.spawn(world.createEntity(), [
            Transform2D.createFromTRS({ translation: [x, 6] }),
            redUnlitMaterial,
            interleavedPrimitive,
            Renderable.create(),
        ]);
    }

    for (let i = 0; i < 4; i++) {
        const x = i * 4 - 6;
        world.spawn(world.createEntity(), [
            Transform2D.createFromTRS({ translation: [x, 2] }),
            redUnlitMaterial,
            nonInterleavedPrimitive,
            Renderable.create(),
        ]);
    }

    for (let i = 0; i < 4; i++) {
        const x = i * 4 - 6;
        world.spawn(world.createEntity(), [
            Transform3D.createFromTRS({ translation: [x, -2, 0], rotation: Quat.createFromEuler(0, 45, 45) }),
            redPhongMaterial,
            interleavedPrimitive,
            Renderable.create(),
        ]);
    }

    for (let i = 0; i < 4; i++) {
        const x = i * 4 - 6;
        world.spawn(world.createEntity(), [
            Transform3D.createFromTRS({ translation: [x, -6, 0], rotation: Quat.createFromEuler(0, -45, -45) }),
            redPhongMaterial,
            nonInterleavedPrimitive,
            Renderable.create(),
        ]);
    }
}

function updateCameraFromTransform() {
    for (const item of cameras) {
        OrthographicCamera.updateFromModelMatrix(item.camera, item.transform.modelMatrix);
        Mat4x4.copy(frameStruct.views.camera.view_projection_matrix, item.camera.viewProjectionMatrix);
    }
}

function update() {
    updateCameraFromTransform();
    pipeline.update();
    // window.requestAnimationFrame(update);
}

startup();
window.requestAnimationFrame(update);
