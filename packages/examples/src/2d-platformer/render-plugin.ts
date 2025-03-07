import { createPlugin, createSystem } from '@timefold/ecs';
import { PerspectiveCamera, SceneStruct, UnlitEntityStruct } from '@timefold/engine';
import { RenderPassDescriptor, Uniform, WebgpuUtils } from '@timefold/webgpu';
import { World } from './world';

const debounce = <T extends unknown[]>(callback: (...args: T) => void, delay: number) => {
    let timeoutTimer: number;

    return (...args: T) => {
        clearTimeout(timeoutTimer);

        timeoutTimer = setTimeout(() => {
            callback(...args);
        }, delay);
    };
};

export const createRenderPlugin = (canvas: HTMLCanvasElement) => {
    const RenderPlugin = createPlugin<World>({
        fn: async (world) => {
            const { vertices, info } = world.getResource('planeGeometry');

            const SceneUniformGroup = Uniform.group(0, {
                scene: Uniform.buffer(0, SceneStruct),
            });

            const EntityUniformGroup = Uniform.group(1, {
                entity: Uniform.buffer(0, UnlitEntityStruct),
            });

            const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
                position: { format: 'float32x3', offset: info.positionOffset },
                uv: { format: 'float32x2', offset: info.uvOffset },
                normal: { format: 'float32x3', offset: info.normalOffset },
            });

            const shaderCode = /* wgsl */ `
                ${Vertex.wgsl}
                
                struct VSOutput {
                    @builtin(position) position: vec4f,
                    @location(0) uv: vec2f,
                };

                ${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

                @vertex fn vs(vert: Vertex) -> VSOutput {
                    var vsOut: VSOutput;
                    let world_pos = entity.transform.model_matrix * vec4f(vert.position, 1.0);
                    vsOut.position = scene.camera.view_projection_matrix * world_pos;
                    vsOut.uv = vert.uv;
                    return vsOut;
                }

                @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
                    return vec4f(entity.material.color, entity.material.opacity);
                }
            `.trim();

            const { context, device, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
            const module = device.createShaderModule({ code: shaderCode });

            const { layout, createBindGroups } = WebgpuUtils.createPipelineLayout({
                device,
                uniformGroups: [SceneUniformGroup, EntityUniformGroup],
            });

            const Scene = createBindGroups(0, {
                scene: WebgpuUtils.createBufferDescriptor(),
            });

            const vertexBuffer = device.createBuffer({
                label: 'vertex buffer vertices',
                size: vertices.buffer.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });

            const vertexCount = vertices.length / info.stride;
            device.queue.writeBuffer(vertexBuffer, 0, vertices.buffer);

            const renderPassDescriptor: RenderPassDescriptor = {
                label: 'canvas renderPass',
                colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
            };

            const pipeline = device.createRenderPipeline({
                label: 'pipeline',
                layout,
                primitive: { cullMode: 'back' }, // TODO: fix
                vertex: { module: module, buffers: Vertex.layout },
                fragment: { module: module, targets: [{ format }] },
            });

            const cameraQuery = world.createQuery({
                query: { tuple: [{ or: ['@tf/PerspectiveCamera', '@tf/OrthographicCamera'] }] },
                map: ([camera]) => camera,
            });

            const onResize = debounce(() => {
                const dpr = window.devicePixelRatio || 1;
                canvas.width = canvas.clientWidth * dpr;
                canvas.height = canvas.clientHeight * dpr;
                const camera = cameraQuery[0];
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (!camera) return;
                if (PerspectiveCamera.isPerspective(camera)) {
                    PerspectiveCamera.updateFromAspect(camera, canvas.width / canvas.height);
                } else {
                    // TODO
                }
            }, 100);

            const resizeObserver = new ResizeObserver(onResize);
            resizeObserver.observe(canvas);

            const entityQuery = world.createQuery({
                query: {
                    tuple: [
                        { has: '@tf/Data' },
                        { has: '@tf/Transform', include: false },
                        { has: '@tf/UnlitMaterial', include: false },
                    ],
                },
                map: ([data]) => {
                    const { bindGroup, buffers } = createBindGroups(1, {
                        entity: WebgpuUtils.createBufferDescriptor(),
                    });

                    return {
                        bindGroup,
                        buffer: buffers.entity,
                        data: data.data,
                    };
                },
            });

            const sceneCreateResult = world.getResource('scene').data;

            const render = () => {
                renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);

                pass.setPipeline(pipeline);
                pass.setVertexBuffer(0, vertexBuffer);

                pass.setBindGroup(0, Scene.bindGroup);
                device.queue.writeBuffer(Scene.buffers.scene, 0, sceneCreateResult.buffer);

                for (const item of entityQuery) {
                    pass.setBindGroup(1, item.bindGroup);
                    device.queue.writeBuffer(item.buffer, 0, item.data);
                    pass.draw(vertexCount);
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            };

            const RenderSystem = createSystem({ stage: 'render', fn: render });
            world.registerSystems(RenderSystem);
        },
    });

    return RenderPlugin;
};
