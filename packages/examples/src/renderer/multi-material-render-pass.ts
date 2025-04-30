import { CameraStruct, DirLightStructArray, PhongEntityStruct, UnlitEntityStruct } from '@timefold/engine';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { InterleavedInfo, InterleavedObjPrimitiveIndexed } from '@timefold/obj';
import {
    RenderPassDescriptor,
    WebgpuUtils,
    defineRenderPass,
    RenderPipelineContext,
    createRenderer,
    definePrimitiveTemplate,
} from '@timefold/webgpu';
import { definePhongMaterialTemplate } from './phong-material-template';
import { defineUnlitMaterialTemplate } from './unlit-material-template';

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

        const lights = DirLightStructArray.create();
        const camera = CameraStruct.create();

        Vec3.copy(lights.views[0].direction, Vec3.normalize([2, 3, 5]));
        Vec3.copy(lights.views[0].color, [1, 1, 1]);

        const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
        const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
        Mat4x4.multiplication(camera.views.view_projection_matrix, proj, view);

        const renderer = createRenderer({
            ...ctx.args,
            renderPassDescriptor,
            materialTemplates: {
                unlit: defineUnlitMaterialTemplate({
                    device,
                    uniforms: { camera: camera.buffer },
                    vertexWgsl: Vertex.wgsl,
                }),
                phong: definePhongMaterialTemplate({
                    device,
                    uniforms: { lights: lights.buffer, camera: camera.buffer },
                    vertexWgsl: Vertex.wgsl,
                }),
            },
            primitiveTemplates: {
                default: definePrimitiveTemplate(Vertex),
            },
        });

        const unlitEntity = UnlitEntityStruct.create();
        Mat4x4.fromTranslation(unlitEntity.views.transform.model_matrix, [-2, 0, 0]);
        Vec3.copy(unlitEntity.views.material.color, [1, 0, 0]);

        renderer.addEntity({
            id: 'unlit',
            mesh: {
                material: { template: 'unlit', uniforms: { entity: unlitEntity.buffer } },
                primitive: {
                    template: 'default',
                    vertex: Vertex.createBuffer(device, planePrimitive.vertices),
                    index: WebgpuUtils.createIndexBuffer(device, { format: 'uint32', data: planePrimitive.indices }),
                },
            },
        });

        const phongEntity = PhongEntityStruct.create();
        Mat4x4.fromTranslation(phongEntity.views.transform.model_matrix, [2, 0, 0]);
        Mat4x4.modelToNormal(phongEntity.views.transform.normal_matrix, phongEntity.views.transform.model_matrix);
        Vec3.copy(phongEntity.views.material.diffuse_color, [1, 0, 0]);

        renderer.addEntity({
            id: 'phong',
            mesh: {
                material: { template: 'phong', uniforms: { entity: phongEntity.buffer } },
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
