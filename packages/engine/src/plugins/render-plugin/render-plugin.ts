import { defineQueries, defineSystem, defineSystemGraph, queryBuilder, pluginBuilder } from '@timefold/ecs';
import { EngineComponent, EngineComponentType } from '../../components';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { DomUtils } from '../../utils';

type Args = {
    canvas: HTMLCanvasElement;
};

const T = EngineComponentType;

/* eslint-disable prettier/prettier */
export const quadInterleavedIndexed = new Float32Array([
  -1.0,  1.0, 0.0,   0.0, 0.0,  // top-left
   1.0,  1.0, 0.0,   1.0, 0.0,  // top-right
  -1.0, -1.0, 0.0,   0.0, 1.0,  // bottom-left
   1.0, -1.0, 0.0,   1.0, 1.0,  // bottom-right
]);

export const quadIndices = new Uint16Array([
  0, 2, 1,  // first triangle: top-left → bottom-left → top-right
  1, 2, 3,  // second triangle: top-right → bottom-left → bottom-right
]);
/* eslint-enable prettier/prettier */

export async function createRenderPlugin({ canvas }: Args) {
    const SceneStruct = Wgsl.struct('Scene', {
        view_projection_matrix: Wgsl.type('mat4x4<f32>'),
    });

    const EntityStruct = Wgsl.struct('Entity', {
        model_matrix: Wgsl.type('mat4x4<f32>'),
    });

    const SceneUniformGroup = Uniform.group(0, {
        scene: Uniform.uniformBuffer(0, SceneStruct),
    });

    const EntityUniformGroup = Uniform.group(1, {
        entity: Uniform.uniformBuffer(0, EntityStruct),
        color_map_sampler: Uniform.sampler(1),
        color_map_texture: Uniform.texture(2),
    });

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        bindGroupLayoutLabel: 'Default pipeline BGL',
        pipelineLayoutLabel: 'Default pipeline PL',
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const VertexInterleaved = WebgpuUtils.createVertexBufferLayout({
        label: 'Simple Quad Layout',
        mode: 'interleaved',
        definition: {
            position: { format: 'float32x3', stride: 0 },
            uv: { format: 'float32x2', stride: 3 },
        },
    });

    const shaderCode = /* wgsl */ `
        ${VertexInterleaved.wgsl}

        struct VsOut {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
        }

        ${Uniform.getWgslFromGroups(PipelineLayout.uniformGroups)}

        @vertex fn vs(vert: Vertex) -> VsOut {
            var vsOut: VsOut;
            vsOut.position = scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
            vsOut.uv = vert.uv;
            return vsOut;
        }

        @fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
            return textureSample(color_map_texture, color_map_sampler, fsIn.uv);
        }
    `.trim();

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.createLayout(device),
        vertex: { module: module, buffers: VertexInterleaved.layout },
        fragment: { module: module, targets: [{ format }] },
        multisample: { count: 4 },
    });

    const queries = defineQueries({
        mainCamera: queryBuilder<EngineComponent>()
            .with(T.Transform)
            .withAny([T.PerspectiveCamera, T.OrthographicCamera])
            .with(T.MainCameraTag)
            .compile(),
        unlitPrimitives: queryBuilder<EngineComponent>()
            .with(T.Transform)
            .with(T.UnlitMaterial)
            .withAny([T.InterleavedPrimitive, T.NonInterleavedPrimitive])
            .map(([transform, unlitMaterial]) => {
                const { buffer: data, views } = EntityStruct.create();
                Mat4x4.fromTranslation(views.model_matrix, transform.data.translation);

                const defaultColorMap = WebgpuUtils.createDataTexture({
                    device,
                    data: new Uint8Array([255, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),
                    width: 2,
                    height: 2,
                    label: 'simple data texture',
                });

                const { bindGroup, buffers } = PipelineLayout.createBindGroups({
                    device,
                    group: 1,
                    bindings: {
                        entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 1 Uniform Buffer' }),
                        color_map_sampler: WebgpuUtils.createSampler({ device, label: 'Entity 1 Sampler' }),
                        color_map_texture: unlitMaterial.data.colorMap
                            ? WebgpuUtils.createImageBitmapTexture({
                                  device,
                                  image: unlitMaterial.data.colorMap,
                                  label: 'Entity 1 Texture',
                              })
                            : defaultColorMap,
                    },
                });

                const buffer = buffers.entity;

                return {
                    data,
                    modelMatrix: views.model_matrix,
                    buffer,
                    bindgroup: bindGroup,
                };
            })
            .compile(),
        phongPrimitives: queryBuilder<EngineComponent>()
            .with(T.Transform)
            .with(T.PhongMaterial)
            .withAny([T.InterleavedPrimitive, T.NonInterleavedPrimitive])
            .map(([transform, phongMaterial]) => {
                const { buffer: data, views } = EntityStruct.create();
                Mat4x4.fromTranslation(views.model_matrix, transform.data.translation);

                const defaultColorMap = WebgpuUtils.createDataTexture({
                    device,
                    data: new Uint8Array([0, 255, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),
                    width: 2,
                    height: 2,
                    label: 'simple data texture',
                });

                const { bindGroup, buffers } = PipelineLayout.createBindGroups({
                    device,
                    group: 1,
                    bindings: {
                        entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 1 Uniform Buffer' }),
                        color_map_sampler: WebgpuUtils.createSampler({ device, label: 'Entity 1 Sampler' }),
                        color_map_texture: phongMaterial.data.diffuseMap
                            ? WebgpuUtils.createImageBitmapTexture({
                                  device,
                                  image: phongMaterial.data.diffuseMap,
                                  label: 'Entity 1 Texture',
                              })
                            : defaultColorMap,
                    },
                });

                const buffer = buffers.entity;

                return {
                    data,
                    modelMatrix: views.model_matrix,
                    buffer,
                    bindgroup: bindGroup,
                };
            })
            .compile(),
    });

    const systemGraph = defineSystemGraph({
        systems: {
            updateBuffers: defineSystem({ stage: 'render' }),
            entityPass: defineSystem({ stage: 'render' }),
        },
        orderByStage: {
            render: ['updateBuffers', 'entityPass'],
        },
    });

    return pluginBuilder<EngineComponent>()
        .withQueries(queries)
        .withSystemGraph(systemGraph)
        .compile((world) => {
            const mainCameraQuery = world.getQueryResults('mainCamera');
            const unlitQuery = world.getQueryResults('unlitPrimitives');
            const phongQuery = world.getQueryResults('phongPrimitives');

            const createColorTexture = () =>
                device.createTexture({
                    format,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                    size: [canvas.width, canvas.height],
                    sampleCount: 4,
                });

            let colorTexture = createColorTexture();

            // render pass

            const renderPassDescriptor = {
                colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
            };

            const { buffer: sceneData, views } = SceneStruct.create();
            const view = Mat4x4.createLookAt([0, 0, 10], Vec3.zero(), Vec3.up());
            const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
            Mat4x4.multiplication(views.view_projection_matrix, proj, view);
            const Scene = PipelineLayout.createBindGroups({
                device,
                group: 0,
                bindings: {
                    scene: WebgpuUtils.createUniformBufferDescriptor({ label: 'Scene Uniform Buffer' }),
                },
            });

            DomUtils.onResize({
                canvas,
                fn: (width, height) => {
                    colorTexture.destroy();
                    colorTexture = createColorTexture();
                    renderPassDescriptor.colorAttachments[0] = WebgpuUtils.createColorAttachmentFromView(
                        colorTexture.createView(),
                    );

                    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), width / height, 0);
                    Mat4x4.multiplication(views.view_projection_matrix, proj, view);
                },
            });

            // geometry

            const P = VertexInterleaved.createBuffer(device, quadInterleavedIndexed);
            const I = WebgpuUtils.createIndexBuffer({
                device,
                format: 'uint16',
                data: quadIndices,
                label: 'Simple Quad Index Buffer',
            });

            let then = 0;
            function getDelta(now: number) {
                now *= 0.001;
                const delta = now - then;
                then = now;
                return delta;
            }

            function updateBuffers() {
                console.log('update buffers', { canvas, mainCameraQuery, unlitQuery, phongQuery });
            }

            function entityPass(time: number) {
                const delta = getDelta(time);
                renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);

                pass.setBindGroup(0, Scene.bindGroup);
                device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

                pass.setPipeline(pipeline);
                pass.setVertexBuffer(P.slot, P.buffer);
                pass.setIndexBuffer(I.buffer, I.format);

                for (const entity of unlitQuery) {
                    Mat4x4.rotateY(entity.modelMatrix, MathUtils.degreesToRadians(90) * delta);
                    pass.setBindGroup(1, entity.bindgroup);
                    device.queue.writeBuffer(entity.buffer, 0, entity.data);
                    pass.drawIndexed(I.count);
                }

                for (const entity of phongQuery) {
                    Mat4x4.rotateY(entity.modelMatrix, MathUtils.degreesToRadians(90) * delta);
                    pass.setBindGroup(1, entity.bindgroup);
                    device.queue.writeBuffer(entity.buffer, 0, entity.data);
                    pass.drawIndexed(I.count);
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            }

            world.insertSystems({
                updateBuffers,
                entityPass,
            });
        });
}
