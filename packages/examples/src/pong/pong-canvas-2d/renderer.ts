import { Vec2, Vec2Type } from '@timefold/math';
import { Shape } from './components';

export type RenderEntity = {
    id: number;
    position: Vec2Type;
    color: string;
    shape: Shape;
};

const END_ANGLE = 2 * Math.PI;

function arraySwapDelete<Item>(arr: Item[], idx: number) {
    arr[idx] = arr[arr.length - 1];
    return arr.pop();
}

export function createRenderer(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const entities: RenderEntity[] = [];
    const idToIdx: Map<number, number> = new Map();

    function addEntity(entity: RenderEntity) {
        entities.push(entity);
        idToIdx.set(entity.id, entities.length - 1);
    }

    function removeEntity(id: number) {
        const idx = idToIdx.get(id);
        if (idx === undefined) return;

        const lastEntity = entities[entities.length - 1];

        arraySwapDelete(entities, idx);
        idToIdx.delete(id);

        if (idx < entities.length) {
            idToIdx.set(lastEntity.id, idx);
        }

        console.log({ entities, idToIdx });
    }

    function updatePosition(id: number, pos: Vec2Type) {
        const idx = idToIdx.get(id);
        if (idx === undefined) return;

        const entity = entities[idx];
        Vec2.copy(entity.position, pos);
    }

    function render() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            ctx.fillStyle = entity.color;

            if (entity.shape.type === Shape.Box) {
                ctx.fillRect(
                    entity.position[0],
                    entity.position[1],
                    entity.shape.halfExtends[0],
                    entity.shape.halfExtends[1],
                );
            } else {
                ctx.arc(entity.position[0], entity.position[1], entity.shape.radius, 0, END_ANGLE);
                ctx.fill();
            }
        }
    }

    return {
        addEntity,
        removeEntity,
        updatePosition,
        render,
    };
}
