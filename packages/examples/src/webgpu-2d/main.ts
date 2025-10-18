import {
    createComponent,
    createWorld,
    defineComponentTypes,
    defineQueries,
    defineSystem,
    defineSystemGraph,
    queryBuilder,
} from '@timefold/ecs';
import { EngineComponent, EngineComponentTypeNames } from '@timefold/engine';
import { Vec2, Vec2Type } from '@timefold/math';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const RECT_SIZE = 10;
const COUNT = Math.floor(canvas.height / RECT_SIZE);

const { T } = defineComponentTypes([...EngineComponentTypeNames, 'Color']);

const createPosition2D = (vec2: Vec2Type) => createComponent(T.Position2D, vec2);
const createColor = (color: string) => createComponent(T.Color, color);
type ColorComponent = ReturnType<typeof createColor>;

type WorldComponent = EngineComponent | ColorComponent;

async function main() {
    const queries = defineQueries({
        movable: queryBuilder<WorldComponent>()
            .with(T.Position2D)
            .map(([pos]) => ({ position: pos.data }))
            .compile(),
        renderable: queryBuilder<WorldComponent>()
            .with(T.Position2D)
            .with(T.Color)
            .map(([pos, color]) => ({ position: pos.data, color: color.data }))
            .compile(),
    });

    const systemGraph = defineSystemGraph({
        systems: {
            spawn: defineSystem({ stage: 'startup' }),
            move: defineSystem({ stage: 'update' }),
            render: defineSystem({ stage: 'render' }),
        },
    });

    const world = createWorld<WorldComponent>()
        .withResources({ gravity: Vec2.down() })
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

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const renderable = world.getQueryResults('renderable');

    function render() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const item of renderable) {
            ctx.fillStyle = item.color;
            ctx.fillRect(item.position[0], item.position[1], RECT_SIZE, RECT_SIZE);
        }
    }

    world.insertSystems({
        spawn,
        move,
        render,
    });

    await world.debugStart();
}

void main();
