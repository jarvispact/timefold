import { defineQueries, defineSystem, defineSystemGraph, queryBuilder, pluginBuilder } from '@timefold/ecs';
import { EngineComponent, EngineComponentType } from '../../components';

type Args = {
    canvas: HTMLCanvasElement;
};

const T = EngineComponentType;

export function createRenderPlugin({ canvas }: Args) {
    const queries = defineQueries({
        mainCamera: queryBuilder<EngineComponent>()
            .with(T.Transform)
            .withAny([T.PerspectiveCamera, T.OrthographicCamera])
            .with(T.MainCameraTag)
            .compile(),
        unlitPrimitives: queryBuilder<EngineComponent>()
            .with(T.Transform)
            .with(T.UnlitMaterial)
            .withAny([T.InterleavedPrimitive, T.NonInterleavedPrimitive])
            .compile(),
        phongPrimitives: queryBuilder<EngineComponent>()
            .with(T.Transform)
            .with(T.PhongMaterial)
            .withAny([T.InterleavedPrimitive, T.NonInterleavedPrimitive])
            .compile(),
    });

    const systemGraph = defineSystemGraph({
        systems: {
            updateBuffers: defineSystem({ stage: 'render' }),
            unlitPass: defineSystem({ stage: 'render' }),
            phongPass: defineSystem({ stage: 'render' }),
        },
        orderByStage: {
            render: ['updateBuffers', 'unlitPass', 'phongPass'],
        },
    });

    return pluginBuilder<EngineComponent>()
        .withResources({})
        .withQueries(queries)
        .withSystemGraph(systemGraph)
        .compile((world) => {
            const mainCameraQuery = world.getQueryResults('mainCamera');
            const unlitQuery = world.getQueryResults('unlitPrimitives');
            const phongQuery = world.getQueryResults('phongPrimitives');

            function updateBuffers() {
                console.log('update buffers', { canvas, mainCameraQuery, unlitQuery, phongQuery });
            }

            function unlitPass() {
                console.log('unlit pass', { canvas, mainCameraQuery, unlitQuery, phongQuery });
            }

            function phongPass() {
                console.log('phong pass', { canvas, mainCameraQuery, unlitQuery, phongQuery });
            }

            world.insertSystems({
                updateBuffers,
                unlitPass,
                phongPass,
            });
        });
}
