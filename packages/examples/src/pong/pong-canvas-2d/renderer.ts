import { Vec2Type } from '@timefold/math';
import { Shape } from './components';

export type RenderEntity = {
    position: Vec2Type;
    color: string;
    shape: Shape;
};

const END_ANGLE = 2 * Math.PI;

export function createRenderer(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    function render(entities: RenderEntity[]) {
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
                ctx.beginPath();
                ctx.arc(entity.position[0], entity.position[1], entity.shape.radius, 0, END_ANGLE);
                ctx.fill();
            }
        }
    }

    return {
        render,
    };
}
