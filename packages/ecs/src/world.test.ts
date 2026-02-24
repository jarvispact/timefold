import { expect, it, describe } from 'vitest';
import { createWorld } from './world';

describe('world', () => {
    describe('createEntity', () => {
        it('should return a sequence of entity ids', () => {
            const world = createWorld({ components: [], plugins: [], queries: [] });
            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
        });

        it('should reuse entity ids from the recycle bin', () => {
            const world = createWorld({ components: [], plugins: [], queries: [] });
            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
            world.despawn(e0, e2);
            const e3 = world.createEntity();
            expect(e3).toEqual(e2); // reused last despawned entity (e2)
            const e4 = world.createEntity();
            expect(e4).toEqual(e0); // reused last despawned entity (e0)
            const e5 = world.createEntity();
            expect(e5).toEqual(3); // continues the sequence as recycle bin is empty
        });
    });

    describe('spawn', () => {
        it('should return a sequence of entity ids', () => {
            const world = createWorld({ components: [], plugins: [], queries: [] });
            const e0 = world.spawn([]);
            const e1 = world.spawn([]);
            const e2 = world.spawn([]);
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
        });

        it('should reuse entity ids from the recycle bin', () => {
            const world = createWorld({ components: [], plugins: [], queries: [] });
            const e0 = world.spawn([]);
            const e1 = world.spawn([]);
            const e2 = world.spawn([]);
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
            world.despawn(e0, e2);
            const e3 = world.spawn([]);
            expect(e3).toEqual(e2); // reused last despawned entity (e2)
            const e4 = world.spawn([]);
            expect(e4).toEqual(e0); // reused last despawned entity (e0)
            const e5 = world.spawn([]);
            expect(e5).toEqual(3); // continues the sequence as recycle bin is empty
        });
    });
});
