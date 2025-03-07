/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createPlugin, createSystem } from '@timefold/ecs';
import { Aabb, AabbComponent, Transform, TransformComponent } from '@timefold/engine';
import { MathUtils, Vec3 } from '@timefold/math';
import { setupInputListeners } from './input';
import { TargetPosition, World } from './world';

const input = setupInputListeners(window, {
    keydown: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' },
    keypressed: { jump: ' ' },
});

type Player = {
    targetPosition: TargetPosition;
    transform: TransformComponent;
    aabb: AabbComponent;
};

// @ts-expect-error - initialized later
let player: Player = undefined;
export const playerEntityId = 'player';

export const PlayerControllerPlugin = createPlugin<World>({
    fn: (world) => {
        world.on('ecs/spawn-entity', (event) => {
            const isPlayer = event.payload.id === playerEntityId;
            if (isPlayer) {
                const targetPosition = event.payload.components.find((c) => c.type === 'TargetPosition')!;
                const transform = event.payload.components.find((c) => c.type === Transform.type)!;
                const aabb = event.payload.components.find((c) => c.type === Aabb.type)!;
                player = { targetPosition, transform, aabb };
                targetPosition.data.position[0] = transform.data.translation[0];
                targetPosition.data.position[1] = transform.data.translation[1];
            }
        });

        const movementSpeed = 10;

        const InputSystem = createSystem({
            stage: 'before-update',
            fn: (delta) => {
                if (!player) return;

                const lkd = input.keyDown('left');
                const rkd = input.keyDown('right');
                const ukd = input.keyDown('up');
                const dkd = input.keyDown('down');

                // set direction for left/right movement
                if (lkd && !rkd) {
                    player.targetPosition.data.position[0] -= movementSpeed * delta;
                } else if (rkd && !lkd) {
                    player.targetPosition.data.position[0] += movementSpeed * delta;
                }

                // set direction for up/down movement
                if (ukd && !dkd) {
                    player.targetPosition.data.position[1] += movementSpeed * delta;
                } else if (dkd && !ukd) {
                    player.targetPosition.data.position[1] -= movementSpeed * delta;
                }
            },
        });

        // const collisionQuery = world.createQuery({ query: { includeId: true, tuple: [{ has: '@tf/Aabb' }] } });

        const UpdateSystem = createSystem({
            stage: 'update',
            order: 11,
            fn: (delta) => {
                if (!player) return;

                const targetPlayerPos = player.targetPosition.data.position;
                const playerPos = player.transform.data.translation;

                // Update player position via lerp
                const x = MathUtils.lerp(playerPos[0], targetPlayerPos[0], 6 * delta);
                const y = MathUtils.lerp(playerPos[1], targetPlayerPos[1], 6 * delta);
                Vec3.set(playerPos, x, y, 0);

                // for (const [id, aabb] of collisionQuery) {
                //     // TODO
                // }
            },
        });

        world.registerSystems([InputSystem, UpdateSystem]);
    },
});
