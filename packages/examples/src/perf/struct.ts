import {
    createEntitySequence,
    defineQueries,
    defineSystem,
    defineSystemGraph,
    queryBuilder,
    worldBuilder,
} from '@timefold/ecs';
import { DomUtils } from '@timefold/engine';
import { Mat4x4, MathUtils, Vec3, Vec3Type } from '@timefold/math';
import { WebgpuUtils } from '@timefold/webgpu';
import {
    canvas,
    Entity,
    ENTITY_COUNT,
    PipelineLayout,
    quadIndices,
    quadVertices,
    rp,
    sceneData,
    shaderCode,
    T,
    VertexInterleaved,
    view,
    views,
    WorldComponent,
} from './common';

const createStructEntity = (args: { position: Vec3Type; color: Vec3Type }) => {
    const entity = Entity.create();
    Vec3.copy(entity.views.transform.position, args.position);
    Mat4x4.fromTranslation(entity.views.transform.model_matrix, args.position);
    Vec3.copy(entity.views.material.color, args.color);
    return { buffer: entity.buffer, entity: entity.views };
};

const run = async () => {
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const createColorTexture = () =>
        device.createTexture({
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            size: [canvas.width, canvas.height],
            sampleCount: 4,
        });

    let colorTexture = createColorTexture();

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.createLayout(device),
        vertex: { module: module, buffers: VertexInterleaved.layout },
        fragment: { module: module, targets: [{ format }] },
        multisample: { count: 4 },
    });

    // render pass

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
    };

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

    const P = VertexInterleaved.createBuffer(device, quadVertices);
    const I = WebgpuUtils.createIndexBuffer({
        device,
        format: 'uint16',
        data: quadIndices,
        label: 'Simple Quad Index Buffer',
    });

    const world = worldBuilder<WorldComponent>()
        .withQueries(
            defineQueries({
                renderableStruct: queryBuilder<WorldComponent>()
                    .with(T.TransformStruct)
                    .with(T.MaterialStruct)
                    .map(([t, m]) => {
                        const E = PipelineLayout.createBindGroups({
                            device,
                            group: 1,
                            bindings: {
                                entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 1 Uniform Buffer' }),
                            },
                        });
                        const e = createStructEntity({ position: t.data.position, color: m.data.color });
                        return { ...e, ...E };
                    })
                    .compile(),
            }),
        )
        .withSystemGraph(
            defineSystemGraph({
                systems: {
                    spawn: defineSystem({ stage: 'startup' }),
                    render: defineSystem({ stage: 'render' }),
                },
            }),
        )
        .compile();

    const renderableStructQuery = world.getQueryResults('renderableStruct');
    const { nextId } = createEntitySequence();

    const spawn = () => {
        for (let i = 0; i < ENTITY_COUNT; i++) {
            world.spawn(nextId(), [
                {
                    type: T.TransformStruct,
                    data: {
                        model_matrix: Mat4x4.create(),
                        position: Vec3.create(rp(), rp(), rp()),
                    },
                },
                {
                    type: T.MaterialStruct,
                    data: { color: Vec3.create(Math.random(), Math.random(), Math.random()) },
                },
            ]);
        }
    };

    const render = (delta: number) => {
        renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(Scene.group, Scene.bindGroup);
        device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(P.slot, P.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        for (const entity of renderableStructQuery) {
            Mat4x4.rotateY(
                entity.entity.transform.model_matrix,
                MathUtils.degreesToRadians(Math.random() * 180) * delta,
            );
            pass.setBindGroup(entity.group, entity.bindGroup);
            device.queue.writeBuffer(entity.buffers.entity, 0, entity.buffer);
            pass.drawIndexed(I.count);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    world.insertSystems({ spawn, render });

    await world.start();
};

void run();
