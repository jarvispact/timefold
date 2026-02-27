import { expect, it, describe, expectTypeOf } from 'vitest';
import { worldBuilder } from './world';
import { componentRegistry } from './component';
import { GenericCompiledQuery, query } from './query';
import * as s from './schema';

describe('world', () => {
    const newWorld = () => worldBuilder().withComponents([]).withQueries().compile();

    describe('createEntity', () => {
        it('should return a sequence of entity ids', () => {
            const world = newWorld();
            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
        });

        it('should reuse entity ids from the recycle bin', () => {
            const world = newWorld();
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

    describe('createEntities', () => {
        it('should return the correct type', () => {
            const world = newWorld();
            const result = world.createEntities(3);
            expectTypeOf(result).toExtend<[number, number, number]>();
        });

        it('should return a sequence of entity ids', () => {
            const world = newWorld();
            const [e0, e1, e2] = world.createEntities(3);
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
        });

        it('should reuse entity ids from the recycle bin', () => {
            const world = newWorld();
            const [e0, e1, e2] = world.createEntities(3);
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
            world.despawn(e0, e2);
            const [e3, e4] = world.createEntities(2);
            expect(e3).toEqual(e2); // reused last despawned entity (e2)
            expect(e4).toEqual(e0); // reused last despawned entity (e0)
            const [e5] = world.createEntities(1);
            expect(e5).toEqual(3); // continues the sequence as recycle bin is empty
        });
    });

    describe('spawn', () => {
        it('should return a sequence of entity ids', () => {
            const world = newWorld();
            const e0 = world.spawn([]);
            const e1 = world.spawn([]);
            const e2 = world.spawn([]);
            expect([e0, e1, e2]).toEqual([0, 1, 2]);
        });

        it('should reuse entity ids from the recycle bin', () => {
            const world = newWorld();
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

    describe('updateQueries', () => {
        const { T, components, registry } = componentRegistry([
            { name: 'Position', definition: s.struct('Position', { x: s.number, y: s.number }) },
            { name: 'Velocity', definition: s.struct('Velocity', { vx: s.number, vy: s.number }) },
            { name: 'Health', definition: s.struct('Health', { hp: s.number }) },
            { name: 'Tag' },
        ]);

        const newQueryWorld = <Q extends GenericCompiledQuery[]>(...queries: Q) =>
            worldBuilder()
                .withComponents(components)
                .withQueries(...queries)
                .compile();

        it('should add spawned entities with matching components to query results', () => {
            const q = query().name('movable').with(T.Position).with(T.Velocity).compile();
            const world = newQueryWorld(q);

            world.spawn([registry.Position.create({ x: 1, y: 2 }), registry.Velocity.create({ vx: 3, vy: 4 })]);

            world.updateQueries();

            const results = world.getQueryResults('movable');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual([
                { type: T.Position, data: { x: 1, y: 2 } },
                { type: T.Velocity, data: { vx: 3, vy: 4 } },
            ]);
        });

        it('should not add entities that do not match the query', () => {
            const q = query().name('movable').with(T.Position).with(T.Velocity).compile();
            const world = newQueryWorld(q);

            world.spawn([registry.Position.create({ x: 1, y: 2 })]);
            world.updateQueries();

            const results = world.getQueryResults('movable');
            expect(results).toHaveLength(0);
        });

        it('should add entity to query when a component is added that completes the match', () => {
            const q = query().name('movable').with(T.Position).with(T.Velocity).compile();
            const world = newQueryWorld(q);

            const e0 = world.spawn([registry.Position.create({ x: 1, y: 2 })]);
            world.updateQueries();
            expect(world.getQueryResults('movable')).toHaveLength(0);

            world.addComponent(e0, registry.Velocity.create({ vx: 5, vy: 6 }));
            world.updateQueries();

            const results = world.getQueryResults('movable');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual([
                { type: T.Position, data: { x: 1, y: 2 } },
                { type: T.Velocity, data: { vx: 5, vy: 6 } },
            ]);
        });

        it('should remove entity from query when a required component is removed', () => {
            const q = query().name('movable').with(T.Position).with(T.Velocity).compile();
            const world = newQueryWorld(q);

            const e0 = world.spawn([
                registry.Position.create({ x: 1, y: 2 }),
                registry.Velocity.create({ vx: 3, vy: 4 }),
            ]);
            world.updateQueries();
            expect(world.getQueryResults('movable')).toHaveLength(1);

            world.removeComponent(e0, T.Velocity);
            world.updateQueries();

            expect(world.getQueryResults('movable')).toHaveLength(0);
        });

        it('should remove despawned entities from query results', () => {
            const q = query().name('movable').with(T.Position).with(T.Velocity).compile();
            const world = newQueryWorld(q);

            const e0 = world.spawn([
                registry.Position.create({ x: 1, y: 2 }),
                registry.Velocity.create({ vx: 3, vy: 4 }),
            ]);

            world.spawn([registry.Position.create({ x: 10, y: 20 }), registry.Velocity.create({ vx: 30, vy: 40 })]);

            world.updateQueries();
            expect(world.getQueryResults('movable')).toHaveLength(2);

            world.despawn(e0);
            world.updateQueries();

            const results = world.getQueryResults('movable');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual([
                { type: T.Position, data: { x: 10, y: 20 } },
                { type: T.Velocity, data: { vx: 30, vy: 40 } },
            ]);
        });

        it('should support include: false — component required for match but excluded from result tuple', () => {
            const q = query().name('tagged-positions').with(T.Position).with(T.Tag, { include: false }).compile();
            const world = newQueryWorld(q);

            world.spawn([registry.Position.create({ x: 1, y: 2 }), registry.Tag.create()]);
            world.updateQueries();

            const results = world.getQueryResults('tagged-positions');
            expect(results).toHaveLength(1);
            // Only Position in the result, Tag is excluded
            expect(results[0]).toEqual([{ type: T.Position, data: { x: 1, y: 2 } }]);
        });

        it('should not match when include: false component is missing', () => {
            const q = query().name('tagged-positions').with(T.Position).with(T.Tag, { include: false }).compile();
            const world = newQueryWorld(q);

            world.spawn([registry.Position.create({ x: 1, y: 2 })]);
            world.updateQueries();

            expect(world.getQueryResults('tagged-positions')).toHaveLength(0);
        });

        it('should prepend entity ID when includeEntity is true', () => {
            const q = query().name('with-entity').includeEntity().with(T.Position).compile();
            const world = newQueryWorld(q);

            const e0 = world.spawn([registry.Position.create({ x: 5, y: 10 })]);
            world.updateQueries();

            const results = world.getQueryResults('with-entity');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual([e0, { type: T.Position, data: { x: 5, y: 10 } }]);
        });

        it('should exclude entities with forbidden components (without)', () => {
            const q = query().name('healthy-no-tag').with(T.Health).without(T.Tag).compile();
            const world = newQueryWorld(q);

            world.spawn([registry.Health.create({ hp: 100 })]);
            world.spawn([registry.Health.create({ hp: 50 }), registry.Tag.create()]);
            world.updateQueries();

            const results = world.getQueryResults('healthy-no-tag');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual([{ type: T.Health, data: { hp: 100 } }]);
        });

        it('should remove entity from query when a forbidden component is added', () => {
            const q = query().name('healthy-no-tag').with(T.Health).without(T.Tag).compile();
            const world = newQueryWorld(q);

            const e0 = world.spawn([registry.Health.create({ hp: 100 })]);
            world.updateQueries();
            expect(world.getQueryResults('healthy-no-tag')).toHaveLength(1);

            world.addComponent(e0, registry.Tag.create());
            world.updateQueries();

            expect(world.getQueryResults('healthy-no-tag')).toHaveLength(0);
        });

        it('should track multiple queries independently', () => {
            const q1 = query().name('positions').with(T.Position).compile();
            const q2 = query().name('velocities').with(T.Velocity).compile();
            const world = newQueryWorld(q1, q2);

            world.spawn([registry.Position.create({ x: 1, y: 2 })]);
            world.spawn([registry.Velocity.create({ vx: 3, vy: 4 })]);
            world.spawn([registry.Position.create({ x: 5, y: 6 }), registry.Velocity.create({ vx: 7, vy: 8 })]);
            world.updateQueries();

            const positions = world.getQueryResults('positions');
            const velocities = world.getQueryResults('velocities');

            expect(positions).toHaveLength(2); // e0 and e2
            expect(velocities).toHaveLength(2); // e1 and e2
        });

        it('should handle swap-and-pop correctly when removing non-last entity', () => {
            const q = query().name('positions').includeEntity().with(T.Position).compile();
            const world = newQueryWorld(q);

            const e0 = world.spawn([registry.Position.create({ x: 1, y: 2 })]);
            const e1 = world.spawn([registry.Position.create({ x: 3, y: 4 })]);
            const e2 = world.spawn([registry.Position.create({ x: 5, y: 6 })]);
            world.updateQueries();
            expect(world.getQueryResults('positions')).toHaveLength(3);

            // Remove first entity — should swap e2 into slot 0
            world.despawn(e0);
            world.updateQueries();

            const results = world.getQueryResults('positions');
            expect(results).toHaveLength(2);

            // After swap-and-pop, results should contain e1 and e2 in swapped order
            expect(results).toEqual([
                [e2, { type: 0, data: { x: 5, y: 6 } }],
                [e1, { type: 0, data: { x: 3, y: 4 } }],
            ]);
        });

        it('should update result tuple in place when component data changes via addComponent', () => {
            const q = query().name('movable').with(T.Position).with(T.Velocity).compile();
            const world = newQueryWorld(q);

            const e0 = world.spawn([
                registry.Position.create({ x: 1, y: 2 }),
                registry.Velocity.create({ vx: 3, vy: 4 }),
            ]);
            world.updateQueries();

            // Replace the Position component with new data
            world.addComponent(e0, registry.Position.create({ x: 99, y: 100 }));
            world.updateQueries();

            const results = world.getQueryResults('movable');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual([
                { type: T.Position, data: { x: 99, y: 100 } },
                { type: T.Velocity, data: { vx: 3, vy: 4 } },
            ]);
        });
    });
});
