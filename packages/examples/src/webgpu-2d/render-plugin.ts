import { createPlugin, defineQueries, defineSystem, defineSystemGraph, queryBuilder } from '@timefold/ecs';
import { T, WorldComponent } from './components';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Mat4x4, Mat4x4Type, Quat, Vec3, Vec3Type } from '@timefold/math';

type Entity = {
    data: ArrayBuffer;
    modelMatrix: Mat4x4Type;
    color: Vec3Type;
    buffer: GPUBuffer;
    bindgroup: GPUBindGroup;
};

/* eslint-disable prettier/prettier */
const quad = new Float32Array([
    // first tri
    0.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 1.0, 0.0,
    // second tri
    0.0, 0.0, 0.0,
    1.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
]);
/* eslint-enable prettier/prettier */

export async function createRenderPlugin(canvas: HTMLCanvasElement) {
    const aspect = canvas.width / canvas.height;

    const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });
    const EntityStruct = Wgsl.struct('Entity', {
        model_matrix: Wgsl.type('mat4x4<f32>'),
        color: Wgsl.type('vec3<f32>'),
    });
    const SceneUniformGroup = Uniform.group(0, { scene: Uniform.buffer(0, SceneStruct) });
    const EntityUniformGroup = Uniform.group(1, { entity: Uniform.buffer(0, EntityStruct) });
    const Vertex = WebgpuUtils.createVertexBufferLayout('non-interleaved', { position: { format: 'float32x3' } });

    const shaderCode = /* wgsl */ `
        ${Vertex.wgsl}
        
        ${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}
        
        @vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
            return scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
        }
        
        @fragment fn fs() -> @location(0) vec4f {
            return vec4f(entity.color, 1.0);
        }
    `.trim();

    const createEntity = (bindgroup: GPUBindGroup, buffer: GPUBuffer, position: Vec3Type, color: Vec3Type): Entity => {
        const { buffer: data, views } = EntityStruct.create();

        Mat4x4.fromRotationTranslationScale(views.model_matrix, Quat.createIdentity(), position, Vec3.fromScalar(0.1));
        Vec3.copy(views.color, color);

        return {
            data,
            modelMatrix: views.model_matrix,
            color: views.color,
            buffer,
            bindgroup,
        };
    };

    // adapter, device, context, module

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    // pipeline layout

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.layout,
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
    });

    // render pass

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    // scene

    const { buffer: sceneData, views } = SceneStruct.create();
    const view = Mat4x4.createLookAt([0, 0, 5], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createOrtho(-5 * aspect, 5 * aspect, -5, 5, 0.1, 10);
    Mat4x4.multiplication(views.view_projection_matrix, proj, view);
    const Scene = PipelineLayout.createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });

    // geometry

    const P = Vertex.createBuffers(device, { position: quad });

    const plugin = createPlugin({
        queries: defineQueries({
            renderable: queryBuilder<WorldComponent>()
                .with(T.Position2D)
                .with(T.Color)
                .map(([pos, color]) => {
                    const E = PipelineLayout.createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });
                    return createEntity(E.bindGroup, E.buffers.entity, Vec3.fromVec2(pos.data, 0), color.data);
                })
                .compile(),
        }),
        systemGraph: defineSystemGraph({
            systems: {
                render: defineSystem({ stage: 'render' }),
            },
        }),
        build(world) {
            const qry = world.getQueryResults('renderable');

            const render = () => {
                renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);
                pass.setPipeline(pipeline);
                pass.setVertexBuffer(P.attribs.position.slot, P.attribs.position.buffer);

                pass.setBindGroup(0, Scene.bindGroup);
                device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

                for (const entity of qry) {
                    pass.setBindGroup(1, entity.bindgroup);
                    device.queue.writeBuffer(entity.buffer, 0, entity.data);
                    pass.draw(P.attribs.position.count);
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            };

            world.insertSystems({ render });
        },
    });

    return plugin;
}
