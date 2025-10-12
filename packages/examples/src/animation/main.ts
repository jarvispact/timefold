import { Animation } from '@timefold/engine';
import { Vec2, Vec3 } from '@timefold/math';
import { createRenderer, Renderable, Shape } from './renderer';

export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const renderer = createRenderer(canvas);

const entity: Renderable = {
    position: Vec2.create(100, 100),
    color: 'white',
    shape: { type: Shape.Circle, radius: 50 },
};

renderer.addEntity(entity);

const animation = Animation.create({
    duration: 6,
    loop: true,
    tracks: {
        position: {
            type: 'vec2',
            initialValue: [100, 100],
            keyframes: [
                { easing: 'easeOutBounce', value: [100, 100], time: 0 },
                { easing: 'easeOutBounce', value: [canvas.width - 100, 100], time: 0.25 },
                { easing: 'easeOutBounce', value: [canvas.width - 100, canvas.height - 100], time: 0.5 },
                { easing: 'easeOutBounce', value: [100, canvas.height - 100], time: 0.75 },
                { easing: 'easeOutBounce', value: [100, 100], time: 1 },
            ],
        },
        color: {
            type: 'vec3',
            initialValue: [255, 255, 255],
            keyframes: [
                { easing: 'easeOutBounce', value: [255, 255, 255], time: 0 },
                { easing: 'easeOutBounce', value: [255, 0, 0], time: 0.25 },
                { easing: 'easeOutBounce', value: [0, 255, 0], time: 0.5 },
                { easing: 'easeOutBounce', value: [0, 0, 255], time: 0.75 },
                { easing: 'easeOutBounce', value: [255, 255, 255], time: 1 },
            ],
        },
    },
});

setTimeout(() => {
    Animation.start(animation.data);
}, 1000);

const result = { position: entity.position, color: Vec3.create(0, 0, 0) };

let then = 0;

const getDelta = (now: number) => {
    now *= 0.001;
    const delta = now - then;
    then = now;
    return delta;
};

const tick = (time: number) => {
    const delta = getDelta(time);
    Animation.update(animation.data, result, delta);
    entity.color = `rgb(${result.color[0]}, ${result.color[1]}, ${result.color[2]})`;
    renderer.render();
    window.requestAnimationFrame(tick);
};

window.requestAnimationFrame(tick);
