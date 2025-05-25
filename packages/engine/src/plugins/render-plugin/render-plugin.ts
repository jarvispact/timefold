import { createPlugin, createSystem } from '@timefold/ecs';
import { createRenderPipeline } from '@timefold/webgpu';
import { EngineWorld } from '../../types';
import { DepthPass } from './depth-pass';
import { ColorPass } from './color-pass';

type Args = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
};

export const createRenderPlugin = ({ canvas }: Args) => {
    const Plugin = createPlugin<EngineWorld>({
        fn: async (world) => {
            const pipeline = await createRenderPipeline({ canvas, msaa: 4 })
                .addRenderPass(DepthPass)
                .addRenderPass(ColorPass)
                .build();

            world.createQuery({
                query: { tuple: [{ has: '@tf/DirLight' }] },
            });

            world.createQuery({
                query: {
                    tuple: [
                        { has: '@tf/Data' },
                        { has: '@tf/Transform', include: false },
                        { or: ['@tf/PerspectiveCamera', '@tf/OrthographicCamera'], include: false },
                    ],
                },
                onAdd: ([data]) => {
                    pipeline.passes.DepthPass.setCamera(data.data);
                    pipeline.passes.ColorPass.setCamera(data.data);
                },
            });

            world.createQuery({
                query: { tuple: [{ has: '@tf/MeshData' }, { has: '@tf/Mesh' }] },
                onAdd: ([data, mesh]) => {
                    for (let i = 0; i < mesh.data.length; i++) {
                        const meshEntry = mesh.data[i];
                        pipeline.passes.DepthPass.addEntity(meshEntry.primitive, data.data.transform);
                        if (meshEntry.material.type === '@tf/UnlitMaterial') {
                            pipeline.passes.ColorPass.addEntity(
                                meshEntry.material,
                                data.data.materials[i],
                                meshEntry.primitive,
                                data.data.transform,
                            );
                        }
                    }
                },
            });

            const Render = createSystem({
                stage: 'render',
                fn: pipeline.render,
            });

            world.registerSystems([Render]);
        },
    });

    return Plugin;
};
