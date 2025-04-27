import { Mat4x4, Vec3 } from '@timefold/math';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import { RenderPassDescriptor, WebgpuUtils } from '@timefold/webgpu';
import { defineRenderPass, RenderPipelineContext } from './render-pipeline';
import { createUnlitMaterialTemplate } from './unlit-material-template';
import { createRenderer, definePrimitiveTemplate } from './webgpu-renderer';

type AdditionalContext = {
    info: InterleavedInfo;
    planePrimitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array>;
};

export const MultiMaterialRenderPass = defineRenderPass({
    name: 'MultiMaterialRenderPass',
    fn: (ctx: RenderPipelineContext<[], AdditionalContext>) => {
        const { device, canvas, info, planePrimitive } = ctx.args;

        const renderTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'bgra8unorm',
            dimension: '2d',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });

        const renderPassDescriptor: RenderPassDescriptor = {
            colorAttachments: [
                WebgpuUtils.createColorAttachmentFromView(renderTexture.createView(), {
                    clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                }),
            ],
        };

        const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
            position: { format: 'float32x3', offset: info.positionOffset },
            uv: { format: 'float32x2', offset: info.uvOffset },
            normal: { format: 'float32x3', offset: info.normalOffset },
        });

        const Unlit = createUnlitMaterialTemplate({
            device,
            info,
            planePrimitive,
            renderTexture,
            vertexWgsl: Vertex.wgsl,
        });

        const entityBindGroups = Unlit.PipelineLayout.createBindGroups(1, {
            entity: WebgpuUtils.createBufferDescriptor(),
        });

        const unlitEntity = Unlit.UnlitEntityStruct.create();
        Mat4x4.fromTranslation(unlitEntity.views.model_matrix, [-2, 0, 0]);
        Vec3.copy(unlitEntity.views.color, [1, 0, 0]);

        const renderer = createRenderer({
            ...ctx.args,
            renderPassDescriptor,
            materialTemplates: {
                unlit: Unlit.materialTemplate,
            },
            primitiveTemplates: {
                default: definePrimitiveTemplate(Vertex),
            },
        });

        renderer.addEntity({
            id: 'test',
            entityBindGroups,
            uniforms: {
                entity: unlitEntity.buffer,
            },
            mesh: {
                material: { template: 'unlit' },
                primitive: {
                    template: 'default',
                    vertex: Vertex.createBuffer(device, planePrimitive.vertices),
                    index: WebgpuUtils.createIndexBuffer(device, { format: 'uint32', data: planePrimitive.indices }),
                },
            },
        });

        return {
            render: renderer.render,
            context: { renderTexture },
        };
    },
});
