import { BoxShape, CircleShape, Shape } from './components';
import { Vec2Type } from '@timefold/math';

type Renderable = {
    position: Vec2Type;
    shape: BoxShape | CircleShape;
};

const END_ANGLE = 2 * Math.PI;

export function createRenderer(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const renderables: Renderable[] = [];

    function addEntity(renderable: Renderable) {
        renderables.push(renderable);
    }

    function render() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < renderables.length; i++) {
            const renderable = renderables[i];
            ctx.fillStyle = 'white';

            if (renderable.shape.type === Shape.Box) {
                ctx.fillRect(
                    renderable.position[0] - renderable.shape.halfExtends[0],
                    renderable.position[1] - renderable.shape.halfExtends[1],
                    renderable.shape.halfExtends[0] * 2,
                    renderable.shape.halfExtends[1] * 2,
                );
            } else {
                ctx.beginPath();
                ctx.arc(renderable.position[0], renderable.position[1], renderable.shape.radius, 0, END_ANGLE);
                ctx.fill();
            }
        }
    }

    return {
        addEntity,
        render,
    };
}
