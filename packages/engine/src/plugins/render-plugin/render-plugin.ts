import { createPlugin, createSystem } from '@timefold/ecs';
import { createRenderPipeline, MSAA } from '@timefold/webgpu';
import { EngineWorld } from '../../types';
import { MultiMaterialPass } from './multi-material-pass';
import { DepthPass, NoOpDepthPass } from './depth-pass';

type Args = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    msaa?: MSAA;
    enableDepthPrePass?: boolean;
};

export const createRenderPlugin = ({ canvas, msaa, enableDepthPrePass }: Args) => {
    const Plugin = createPlugin<EngineWorld>({
        fn: async (world) => {
            const { frame } = world.getResource('engine');

            const pipeline = await createRenderPipeline({ canvas, msaa: msaa ?? 1 })
                .addRenderPass(enableDepthPrePass ? DepthPass : NoOpDepthPass)
                .addRenderPass(MultiMaterialPass)
                .build();

            world.createQuery({
                query: { tuple: [{ has: '@tf/DirLight', include: false }] },
                onAdd: () => {
                    pipeline.passes.MultiMaterialPass.setDirLights(frame.dirLightData.buffer);
                },
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
                    pipeline.passes.MultiMaterialPass.setCamera(data.data);
                },
            });

            world.createQuery({
                query: { includeId: true, tuple: [{ has: '@tf/MeshData' }, { has: '@tf/Mesh' }] },
                onAdd: ([id, data, mesh]) => {
                    for (let i = 0; i < mesh.data.length; i++) {
                        const meshEntry = mesh.data[i];

                        pipeline.passes.DepthPass.addEntity({
                            id,
                            primitive: meshEntry.primitive,
                            transformData: data.data.transform,
                        });

                        pipeline.passes.MultiMaterialPass.addEntity({
                            id,
                            material: meshEntry.material,
                            materialData: data.data.materials[i],
                            primitive: meshEntry.primitive,
                            transformData: data.data.transform,
                        });
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
