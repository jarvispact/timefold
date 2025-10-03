import { createPlugin, createSystem } from '@timefold/ecs';
import { EngineWorld, PhongMaterialComponent, UnlitMaterialComponent } from '@timefold/engine';
import { createRenderer, definePrimitiveTemplate, RenderPassDescriptor, WebgpuUtils } from '@timefold/webgpu';
import { definePhongMaterialTemplate } from './phong-material-template';
import { defineUnlitMaterialTemplate } from './unlit-material-template';

export const createRenderPlugin = ({ canvas }: { canvas: HTMLCanvasElement | OffscreenCanvas }) => {
    const RenderPlugin = createPlugin({
        fn: async (world: EngineWorld) => {
            const { context, device, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

            const sampler = WebgpuUtils.createSampler(device);

            const VertexInterleaved = WebgpuUtils.createVertexBufferLayout('interleaved', {
                position: { format: 'float32x3', stride: 0 },
                uv: { format: 'float32x2', stride: 3 },
                normal: { format: 'float32x3', stride: 5 },
            });

            const VertexNonInterleaved = WebgpuUtils.createVertexBufferLayout('non-interleaved', {
                position: { format: 'float32x3' },
                uv: { format: 'float32x2' },
                normal: { format: 'float32x3' },
            });

            const renderPassDescriptor: RenderPassDescriptor = {
                colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
                depthStencilAttachment: WebgpuUtils.createDepthAttachmentFromView(device, canvas.width, canvas.height),
            };

            const Unlit = defineUnlitMaterialTemplate({
                device,
                uniforms: { camera: new ArrayBuffer(0) },
                vertexWgsl: VertexInterleaved.wgsl,
            });

            const Phong = definePhongMaterialTemplate({
                device,
                uniforms: { lights: new ArrayBuffer(0), camera: new ArrayBuffer(0) },
                vertexWgsl: VertexInterleaved.wgsl,
            });

            const renderer = createRenderer({
                canvas,
                context,
                device,
                format,
                renderPassDescriptor,
                materialTemplates: {
                    unlit: Unlit.MaterialTemplate,
                    phong: Phong.MaterialTemplate,
                },
                primitiveTemplates: {
                    interleaved: definePrimitiveTemplate(VertexInterleaved),
                    'non-interleaved': definePrimitiveTemplate(VertexNonInterleaved),
                },
            });

            world.createQuery({
                query: {
                    tuple: [{ has: '@tf/Data' }, { has: '@tf/DirLight', include: false }],
                },
                map: ([dirLight]) => ({ dirLight: dirLight.data }),
                onAdd: ({ dirLight }) => {
                    renderer.setUniform('phong', 'lightsGroup', 'dir_lights', dirLight);
                },
            });

            world.createQuery({
                query: {
                    tuple: [
                        { has: '@tf/Data' },
                        { has: '@tf/Transform', include: false },
                        { has: '@tf/PerspectiveCamera', include: false },
                    ],
                },
                map: ([camera]) => ({ camera: camera.data }),
                onAdd: ({ camera }) => {
                    renderer.setUniform('unlit', 'cameraGroup', 'camera', camera);
                    renderer.setUniform('phong', 'cameraGroup', 'camera', camera);
                },
            });

            // TODO: Provide `is` type guards for each component and pass them to queries to further narrow type
            world.createQuery({
                query: {
                    includeId: true,
                    tuple: [{ has: '@tf/MeshData' }, { has: '@tf/Mesh' }, { has: '@tf/Transform', include: false }],
                },
                map: ([id, data, mesh]) => {
                    return {
                        id,
                        data: data.data,
                        mesh,
                    };
                },
                onAdd: ({ id, data, mesh }) => {
                    for (let i = 0; i < mesh.data.length; i++) {
                        const meshPrimitive = mesh.data[i];
                        const material = meshPrimitive.material as UnlitMaterialComponent | PhongMaterialComponent;
                        const primitive = meshPrimitive.primitive.data;

                        renderer.addEntity({
                            id,
                            bindGroups: {
                                entityGroup:
                                    material.type === '@tf/UnlitMaterial'
                                        ? Unlit.PipelineLayout.createBindGroups(1, {
                                              entity: WebgpuUtils.createBufferDescriptor(),
                                              color_sampler: sampler,
                                              color_map: WebgpuUtils.createDataTexture(device, {
                                                  data: new Uint8Array([255, 255, 255, 255]),
                                                  width: 1,
                                                  height: 1,
                                              }),
                                          })
                                        : Phong.PipelineLayout.createBindGroups(2, {
                                              entity: WebgpuUtils.createBufferDescriptor(),
                                          }),
                            },
                            uniforms: { entityGroup: { entity: data[i] } },
                            mesh: {
                                material: {
                                    template: material.type === '@tf/UnlitMaterial' ? 'unlit' : 'phong',
                                },
                                primitive: {
                                    template: primitive.mode,
                                    vertex:
                                        primitive.mode === 'interleaved'
                                            ? VertexInterleaved.createBuffer(device, primitive.vertices)
                                            : VertexNonInterleaved.createBuffers(device, {
                                                  position: primitive.attributes.position,
                                                  uv: primitive.attributes.uv as Float32Array,
                                                  normal: primitive.attributes.normal as Float32Array,
                                              }),
                                    index: primitive.indices
                                        ? WebgpuUtils.createIndexBuffer(device, {
                                              format: primitive.indices instanceof Uint16Array ? 'uint16' : 'uint32',
                                              data: primitive.indices,
                                          })
                                        : undefined,
                                },
                            },
                        });
                    }
                },
            });

            const Render = createSystem({
                stage: 'render',
                fn: renderer.render,
            });

            world.registerSystems(Render);
        },
    });

    return RenderPlugin;
};
