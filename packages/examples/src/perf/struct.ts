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
    Entities,
    ENTITY_COUNT,
    EntityType,
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

const entityData = Entities.create();

let i = 0;

const createStructEntity = (args: { position: Vec3Type; color: Vec3Type }): { entity: EntityType['views'] } => {
    Vec3.copy(entityData.views[i].transform.position, args.position);
    Mat4x4.fromTranslation(entityData.views[i].transform.model_matrix, args.position);
    Vec3.copy(entityData.views[i].material.color, args.color);
    const entity = entityData.views[i];
    i++;
    return { entity };
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

    const E = PipelineLayout.createBindGroups({
        device,
        group: 1,
        bindings: {
            instance_data: WebgpuUtils.createStorageBufferDescriptor({ label: 'Entity 1 Uniform Buffer' }),
        },
    });

    const world = worldBuilder<WorldComponent>()
        .withQueries(
            defineQueries({
                renderableStruct: queryBuilder<WorldComponent>()
                    .with(T.TransformStruct)
                    .with(T.MaterialStruct)
                    .map(([t, m]) => {
                        const e = createStructEntity({ position: t.data.position, color: m.data.color });
                        return { data: e.entity };
                    })
                    .compile(),
            }),
        )
        .withSystemGraph(
            defineSystemGraph({
                systems: {
                    spawn: defineSystem({ stage: 'startup' }),
                    rotate: defineSystem({ stage: 'update' }),
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

    const rotate = (delta: number) => {
        for (const e of renderableStructQuery) {
            Mat4x4.rotateY(e.data.transform.model_matrix, MathUtils.degreesToRadians(Math.random() * 180) * delta);
        }
    };

    const render = () => {
        renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(Scene.group, Scene.bindGroup);
        device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

        pass.setBindGroup(E.group, E.bindGroup);
        device.queue.writeBuffer(E.buffers.instance_data, 0, entityData.buffer);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(P.slot, P.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        pass.drawIndexed(I.count, ENTITY_COUNT);

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    world.insertSystems({ spawn, rotate, render });

    await world.startup();

    let fps = 0;
    let timeToPrintFps = performance.now() + 1000;

    const tick = async (time: number) => {
        fps++;

        if (performance.now() >= timeToPrintFps) {
            console.log(`FPS: ${fps}`);
            fps = 0;
            timeToPrintFps = performance.now() + 1000;
        }

        await world.update(time);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.requestAnimationFrame(tick);
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    window.requestAnimationFrame(tick);
};

void run();
