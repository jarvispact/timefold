import { createPlugin, createSystem } from '@timefold/ecs';
import { createRenderer, definePrimitiveTemplate, RenderPassDescriptor, WebgpuUtils } from '@timefold/webgpu';
import { World } from './constants';
import { defineUnlitMaterialTemplate } from './unlit-mterial-template';

/* eslint-disable prettier/prettier */
const quadVertices = new Float32Array([
    -1, -1, -0,     0, 0,
    1, -1, -0,     1, 0,
    1,  1,  0,     1, 1,
    -1, -1, -0,     0, 0,
    1,  1,  0,     1, 1,
    -1,  1,  0,     0, 1
]);
/* eslint-enable prettier/prettier */

export const createRenderPlugin = (canvas: HTMLCanvasElement | OffscreenCanvas) => {
    const Plugin = createPlugin<World>({
        fn: async (world) => {
            const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

            const renderPassDescriptor: RenderPassDescriptor = {
                colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
            };

            const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
                position: { format: 'float32x3', stride: 0 },
                uv: { format: 'float32x2', stride: 3 },
            });

            const sampler = WebgpuUtils.createSampler(device);

            const textures = new Map<ImageBitmap | undefined, GPUTexture>();
            textures.set(
                undefined,
                WebgpuUtils.createDataTexture(device, {
                    data: new Uint8Array([255, 255, 255, 255]),
                    width: 1,
                    height: 1,
                }),
            );

            // TODO: passing the vertexWgsl is not so nice
            const Unlit = defineUnlitMaterialTemplate({
                device,
                uniforms: { camera: new ArrayBuffer(0) },
                vertexWgsl: Vertex.wgsl,
            });

            const renderer = createRenderer({
                canvas,
                device,
                context,
                format,
                renderPassDescriptor,
                materialTemplates: {
                    unlit: Unlit.MaterialTemplate,
                },
                primitiveTemplates: {
                    quad: definePrimitiveTemplate(Vertex),
                },
            });

            world.createQuery({
                query: {
                    tuple: [
                        { has: '@tf/Data' },
                        { has: '@tf/Transform', include: false },
                        { has: '@tf/OrthographicCamera', include: false },
                    ],
                },
                map: ([camera]) => ({ camera: camera.data }),
                onAdd: ({ camera }) => {
                    renderer.setUniform('unlit', 'quad', 'cameraGroup', 'camera', camera);
                },
            });

            world.createQuery({
                query: {
                    includeId: true,
                    tuple: [
                        { has: '@tf/Data' },
                        { has: '@tf/UnlitMaterial' },
                        { has: '@tf/Transform', include: false },
                    ],
                },
                map: ([id, data, material]) => ({ id, entity: data.data, colorMap: material.data.colorMap }),
                onAdd: ({ id, entity, colorMap }) => {
                    if (colorMap && !textures.has(colorMap)) {
                        textures.set(colorMap, WebgpuUtils.createImageBitmapTexture(device, colorMap));
                    }

                    renderer.addEntity({
                        id,
                        bindGroups: {
                            entityGroup: Unlit.PipelineLayout.createBindGroups(1, {
                                entity: WebgpuUtils.createBufferDescriptor(),
                                color_sampler: sampler,
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                color_map: textures.get(colorMap)!,
                            }),
                        },
                        uniforms: { entityGroup: { entity } },
                        mesh: {
                            material: {
                                template: 'unlit',
                            },
                            primitive: {
                                template: 'quad',
                                vertex: Vertex.createBuffer(device, quadVertices),
                            },
                        },
                    });
                },
            });

            const Render = createSystem({
                stage: 'render',
                fn: () => {
                    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
                    renderer.render();
                },
            });

            world.registerSystems(Render);
        },
    });

    return Plugin;
};
