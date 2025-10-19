import {
    createWorld,
    defineQueries,
    defineResources,
    defineSystem,
    defineSystemGraph,
    queryBuilder,
} from '@timefold/ecs';
import { Vec2 } from '@timefold/math';
import { createColor, createPosition2D, T, WorldComponent } from './components';
import './renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const RECT_SIZE = 10;
const COUNT = Math.floor(canvas.height / RECT_SIZE);

async function main() {
    const resources = defineResources({ gravity: Vec2.down() });

    const queries = defineQueries({
        movable: queryBuilder<WorldComponent>()
            .with(T.Position2D)
            .map(([pos]) => ({ position: pos.data }))
            .compile(),
    });

    const systemGraph = defineSystemGraph({
        systems: {
            spawn: defineSystem({ stage: 'startup' }),
            move: defineSystem({ stage: 'update' }),
        },
    });

    const world = createWorld<WorldComponent>()
        .withResources(resources)
        .withQueries(queries)
        .withSystemGraph(systemGraph);

    let entity = 0;

    function rnd() {
        return Math.round(Math.random() * 255);
    }

    function spawn() {
        for (let i = 0; i < COUNT; i++) {
            const position = Vec2.create(0, i * RECT_SIZE);
            const color = `rgb(${rnd()}, ${rnd()}, ${rnd()})`;
            world.spawn(entity++, [createPosition2D(position), createColor(color)]);
        }
    }

    const movable = world.getQueryResults('movable');
    const movement = Vec2.create(10, 0);

    function move(delta: number) {
        for (const item of movable) {
            Vec2.add(item.position, movement, delta);
        }
    }

    world.insertSystems({
        spawn,
        move,
    });

    await world.debugStart();
}

void main();
