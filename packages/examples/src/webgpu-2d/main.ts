import { createEntitySequence, defineResources, defineSystem, defineSystemGraph, worldBuilder } from '@timefold/ecs';
import { Mat4x4, MathUtils, Vec2, Vec3 } from '@timefold/math';
import { createColor, createPosition2D, WorldComponent } from './components';
import { createRenderPlugin } from './render-plugin';
import { DomUtils } from '@timefold/engine';

async function main() {
    const canvas = DomUtils.getCanvasById('canvas');
    const RenderPlugin = await createRenderPlugin(canvas);

    const resources = defineResources({ gravity: Vec2.down() });

    const systemGraph = defineSystemGraph({
        systems: {
            spawn: defineSystem({ stage: 'startup' }),
            move: defineSystem({ stage: 'update' }),
        },
    });

    const world = worldBuilder<WorldComponent>()
        .withResources(resources)
        .withSystemGraph(systemGraph)
        .withPlugin(RenderPlugin)
        .compile();

    const { nextId } = createEntitySequence();

    function spawn() {
        const minX = -4 * (canvas.width / canvas.height);
        const maxX = 4 * (canvas.width / canvas.height);
        const minY = -4;
        const maxY = 4;

        for (let i = 0; i < 100; i++) {
            const x = Math.random() * (maxX - minX) + minX;
            const y = Math.random() * (maxY - minY) + minY;

            world.spawn(nextId(), [
                createPosition2D(Vec2.create(x, y)),
                createColor(Vec3.create(Math.random(), Math.random(), Math.random())),
            ]);
        }
    }

    const renderable = world.getQueryResults('renderable');

    function move(delta: number) {
        for (const item of renderable) {
            Mat4x4.rotateZ(item.modelMatrix, MathUtils.degreesToRadians(360) * delta);
        }
    }

    world.insertSystems({
        spawn,
        move,
    });

    await world.start();
}

void main();
