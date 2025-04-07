import { createPlugin, createSystem } from '@timefold/ecs';
import { RenderPassDescriptor, Uniform, WebgpuUtils } from '@timefold/webgpu';
import {
    ParsedGltf2PrimitiveLayoutWithAttribs,
    ParsedGltf2PrimitiveWithIndices,
    ParsedGltf2PrimitiveInterleaved,
} from '@timefold/gltf2';
import { EngineWorld, SceneUniformGroup, UnlitEntityUniformGroup } from '@timefold/engine';

type Args = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    primitiveLayout: ParsedGltf2PrimitiveLayoutWithAttribs<['TEXCOORD_0']>;
    primitive: ParsedGltf2PrimitiveWithIndices<ParsedGltf2PrimitiveInterleaved>;
};

export const createSimpleUnlitRenderPlugin = ({ canvas, primitiveLayout, primitive }: Args) => {
    const RenderPlugin = createPlugin<EngineWorld>({
        fn: async (world) => {
            const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

            const PipelineLayout = WebgpuUtils.createPipelineLayout({
                device,
                uniformGroups: [SceneUniformGroup, UnlitEntityUniformGroup],
            });

            const renderPassDescriptor: RenderPassDescriptor = {
                label: 'canvas renderPass',
                colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
            };

            const VertexLayout = WebgpuUtils.createVertexBufferLayout('interleaved', {
                position: primitiveLayout.attributes.POSITION,
                uv: primitiveLayout.attributes.TEXCOORD_0,
            });

            const Vertex = VertexLayout.createBuffer(device, primitive.vertices);
            const Index = WebgpuUtils.createIndexBuffer(device, primitive.indices);

            const code = /* wgsl */ `
${VertexLayout.wgsl}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

${Uniform.getWgslFromGroups([SceneUniformGroup, UnlitEntityUniformGroup])}

@vertex fn vs(vert: Vertex) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = scene.camera.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let texture_sample = textureSample(color_texture, color_sampler, vsOut.uv);

    var alpha: f32 = entity.material.opacity;
    if (entity.material.use_colormap_alpha >= 1) {
        alpha = texture_sample.a;
    }

    return vec4f(entity.material.color + texture_sample.rgb, alpha);
}
            `;

            const module = device.createShaderModule({ code });

            const pipeline = device.createRenderPipeline({
                layout: PipelineLayout.layout,
                primitive: { cullMode: 'back', topology: primitiveLayout.mode },
                vertex: { module: module, buffers: VertexLayout.layout },
                fragment: {
                    module: module,
                    targets: [{ format, blend: WebgpuUtils.getBlendState('transparent') }],
                },
            });

            const scene = world.getResource('scene');

            const Scene = PipelineLayout.createBindGroups(0, {
                scene: WebgpuUtils.createBufferDescriptor(),
            });

            const entityQuery = world.createQuery({
                query: {
                    tuple: [{ has: '@tf/Data' }, { has: '@tf/UnlitMaterial' }, { has: '@tf/Transform' }],
                },
                map: ([data, material]) => {
                    const { group, bindGroup, buffers } = PipelineLayout.createBindGroups(1, {
                        entity: WebgpuUtils.createBufferDescriptor(),
                        color_sampler: WebgpuUtils.createSampler(device),
                        color_texture: material.data.colorMap
                            ? WebgpuUtils.createImageBitmapTexture(device, material.data.colorMap)
                            : WebgpuUtils.createDataTexture(device, new Uint8Array([0, 0, 0, 255]), 1, 1),
                    });

                    return {
                        group,
                        bindGroup,
                        buffer: buffers.entity,
                        data: data.data,
                    };
                },
            });

            const RenderSystem = createSystem({
                stage: 'render',
                fn: () => {
                    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
                    const encoder = device.createCommandEncoder();
                    const pass = encoder.beginRenderPass(renderPassDescriptor);

                    pass.setPipeline(pipeline);
                    pass.setBindGroup(Scene.group, Scene.bindGroup);
                    device.queue.writeBuffer(Scene.buffers.scene, 0, scene.data.buffer);

                    pass.setVertexBuffer(Vertex.slot, Vertex.buffer);
                    pass.setIndexBuffer(Index.buffer, Index.format);

                    for (const entity of entityQuery) {
                        pass.setBindGroup(entity.group, entity.bindGroup);
                        device.queue.writeBuffer(entity.buffer, 0, entity.data);
                        pass.drawIndexed(Index.count);
                    }

                    pass.end();
                    device.queue.submit([encoder.finish()]);
                },
            });

            world.registerSystems(RenderSystem);
        },
    });

    return RenderPlugin;
};
