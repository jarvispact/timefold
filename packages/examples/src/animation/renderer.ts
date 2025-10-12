import { Vec2Type } from '@timefold/math';

export const Shape = { Box: 0, Circle: 1 } as const;

export type BoxShape = {
    type: typeof Shape.Box;
    halfExtends: Vec2Type;
};

export type CircleShape = {
    type: typeof Shape.Circle;
    radius: number;
};

export type Shape = BoxShape | CircleShape;

export type Renderable = {
    position: Vec2Type;
    color: string;
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
            ctx.fillStyle = renderable.color;

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
