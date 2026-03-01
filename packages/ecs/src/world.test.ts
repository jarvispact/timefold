import { expect, it, describe, expectTypeOf, vi } from 'vitest';
import { worldBuilder } from './world';
import { createComponent, defineComponents, InferComponents } from './component';
import { DefineEcsEvent, EcsEvent, GenericEcsEvent } from './event';
import { GenericCompiledQuery, query } from './query';
import * as s from './schema';

describe('world', () => {
    const newWorld = () => worldBuilder().withComponents({}).withQueries().compile();

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

    describe('queries', () => {
        const components = defineComponents({
            A: undefined,
            B: s.struct({ x: s.number, y: s.number }),
            C: s.struct({ x: s.number, y: s.number, z: s.number }),
            D: s.struct({ data: s.float32Array }),
        });

        const createA = () => createComponent('A');
        const createB = (x: number, y: number) => createComponent('B', { x, y });
        const createC = (x: number, y: number, z: number) => createComponent('C', { x, y, z });
        const createD = (data: Float32Array) => createComponent('D', { data });

        const newQueryWorld = <Q extends GenericCompiledQuery[]>(...queries: Q) =>
            worldBuilder()
                .withComponents(components)
                .withQueries(...queries)
                .compile();

        it('should return the correct query result when spawning entities', () => {
            const qAB = query().name('ab').with('A').with('B').compile();
            const qBC = query().name('bc').with('B').with('C').compile();
            const qEAB = query().name('eab').includeEntity().with('A').with('B').compile();
            const qEBC = query().name('ebc').includeEntity().with('B').with('C').compile();
            const qMapped = query()
                .name('mapped')
                .includeEntity()
                .with('A')
                .with('B')
                .map(([entity, , b]) => ({ entity, b }))
                .compile();
            const world = newQueryWorld(qAB, qBC, qEAB, qEBC, qMapped);

            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();

            const ae0 = createA();
            const be0 = createB(1, 2);
            const be1 = createB(3, 4);
            const ce1 = createC(5, 6, 7);
            const ae2 = createA();
            const ce2 = createC(8, 9, 10);

            world.spawn(e0, [ae0, be0]);
            world.spawn(e1, [be1, ce1]);
            world.spawn(e2, [ae2, ce2]);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[ae0, be0]]);
            expect(world.getQueryResults('bc')).toEqual([[be1, ce1]]);

            expect(world.getQueryResults('eab')).toEqual([[e0, ae0, be0]]);
            expect(world.getQueryResults('ebc')).toEqual([[e1, be1, ce1]]);

            expect(world.getQueryResults('mapped')).toEqual([{ entity: e0, b: be0 }]);
        });

        it('should return the correct query result when adding components to entities', () => {
            const qAB = query().name('ab').with('A').with('B').compile();
            const qBC = query().name('bc').with('B').with('C').compile();
            const qEAB = query().name('eab').includeEntity().with('A').with('B').compile();
            const qEBC = query().name('ebc').includeEntity().with('B').with('C').compile();
            const qMapped = query()
                .name('mapped')
                .includeEntity()
                .with('A')
                .with('B')
                .map(([entity, , b]) => ({ entity, b }))
                .compile();
            const world = newQueryWorld(qAB, qBC, qEAB, qEBC, qMapped);

            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();

            const ae0 = createA();
            const be0 = createB(1, 2);
            const be1 = createB(3, 4);
            const ce1 = createC(5, 6, 7);
            const ae2 = createA();
            const ce2 = createC(8, 9, 10);

            world.spawn(e0, [ae0]);
            world.spawn(e1, [be1]);
            world.spawn(e2, [ae2]);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([]);
            expect(world.getQueryResults('bc')).toEqual([]);
            expect(world.getQueryResults('eab')).toEqual([]);
            expect(world.getQueryResults('ebc')).toEqual([]);
            expect(world.getQueryResults('mapped')).toEqual([]);

            world.addComponent(e0, be0);
            world.addComponent(e1, ce1);
            world.addComponent(e2, ce2);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[ae0, be0]]);
            expect(world.getQueryResults('bc')).toEqual([[be1, ce1]]);

            expect(world.getQueryResults('eab')).toEqual([[e0, ae0, be0]]);
            expect(world.getQueryResults('ebc')).toEqual([[e1, be1, ce1]]);

            expect(world.getQueryResults('mapped')).toEqual([{ entity: e0, b: be0 }]);
        });

        it('should return the correct query result when removing components from entities', () => {
            const qAB = query().name('ab').with('A').with('B').compile();
            const qBC = query().name('bc').with('B').with('C').compile();
            const qEAB = query().name('eab').includeEntity().with('A').with('B').compile();
            const qEBC = query().name('ebc').includeEntity().with('B').with('C').compile();
            const qMapped = query()
                .name('mapped')
                .includeEntity()
                .with('A')
                .with('B')
                .map(([entity, , b]) => ({ entity, b }))
                .compile();
            const world = newQueryWorld(qAB, qBC, qEAB, qEBC, qMapped);

            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();

            const ae0 = createA();
            const be0 = createB(1, 2);
            const be1 = createB(3, 4);
            const ce1 = createC(5, 6, 7);
            const ae2 = createA();
            const ce2 = createC(8, 9, 10);

            world.spawn(e0, [ae0, be0]);
            world.spawn(e1, [be1, ce1]);
            world.spawn(e2, [ae2, ce2]);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[ae0, be0]]);
            expect(world.getQueryResults('bc')).toEqual([[be1, ce1]]);
            expect(world.getQueryResults('eab')).toEqual([[e0, ae0, be0]]);
            expect(world.getQueryResults('ebc')).toEqual([[e1, be1, ce1]]);
            expect(world.getQueryResults('mapped')).toEqual([{ entity: e0, b: be0 }]);

            world.removeComponent(e0, 'B');
            world.removeComponent(e1, 'C');
            world.removeComponent(e2, 'C');
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([]);
            expect(world.getQueryResults('bc')).toEqual([]);
            expect(world.getQueryResults('eab')).toEqual([]);
            expect(world.getQueryResults('ebc')).toEqual([]);
            expect(world.getQueryResults('mapped')).toEqual([]);
        });

        it('should return the correct query result when despawning entities', () => {
            const qAB = query().name('ab').with('A').with('B').compile();
            const qBC = query().name('bc').with('B').with('C').compile();
            const qEAB = query().name('eab').includeEntity().with('A').with('B').compile();
            const qEBC = query().name('ebc').includeEntity().with('B').with('C').compile();
            const qMapped = query()
                .name('mapped')
                .includeEntity()
                .with('A')
                .with('B')
                .map(([entity, , b]) => ({ entity, b }))
                .compile();
            const world = newQueryWorld(qAB, qBC, qEAB, qEBC, qMapped);

            const e0 = world.createEntity();
            const e1 = world.createEntity();
            const e2 = world.createEntity();

            const ae0 = createA();
            const be0 = createB(1, 2);
            const be1 = createB(3, 4);
            const ce1 = createC(5, 6, 7);
            const ae2 = createA();
            const ce2 = createC(8, 9, 10);

            world.spawn(e0, [ae0, be0]);
            world.spawn(e1, [be1, ce1]);
            world.spawn(e2, [ae2, ce2]);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[ae0, be0]]);
            expect(world.getQueryResults('bc')).toEqual([[be1, ce1]]);
            expect(world.getQueryResults('eab')).toEqual([[e0, ae0, be0]]);
            expect(world.getQueryResults('ebc')).toEqual([[e1, be1, ce1]]);
            expect(world.getQueryResults('mapped')).toEqual([{ entity: e0, b: be0 }]);

            world.despawn(e0);
            world.despawn(e1);
            world.despawn(e2);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([]);
            expect(world.getQueryResults('bc')).toEqual([]);
            expect(world.getQueryResults('eab')).toEqual([]);
            expect(world.getQueryResults('ebc')).toEqual([]);
            expect(world.getQueryResults('mapped')).toEqual([]);
        });

        it('should update queries correctly across different actions', () => {
            const qAB = query().name('ab').with('A').with('B').compile();
            const qBC = query().name('bc').with('B').with('C').compile();
            const qCD = query().name('cd').with('C').with('D').compile();
            const qMapped = query()
                .name('mapped')
                .with('A')
                .with('B')
                .map(([, b]) => ({ b }))
                .compile();
            const world = newQueryWorld(qAB, qBC, qCD, qMapped);

            const e0 = world.createEntity();

            const a = createA();
            const b = createB(0, 1);
            const c = createC(1, 2, 3);
            const d = createD(new Float32Array([4, 5, 6]));

            world.spawn(e0, [a]);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([]);
            expect(world.getQueryResults('bc')).toEqual([]);
            expect(world.getQueryResults('cd')).toEqual([]);
            expect(world.getQueryResults('mapped')).toEqual([]);

            world.addComponent(e0, b);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[a, b]]);
            expect(world.getQueryResults('bc')).toEqual([]);
            expect(world.getQueryResults('cd')).toEqual([]);
            expect(world.getQueryResults('mapped')).toEqual([{ b }]);

            world.addComponent(e0, c);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[a, b]]);
            expect(world.getQueryResults('bc')).toEqual([[b, c]]);
            expect(world.getQueryResults('cd')).toEqual([]);
            expect(world.getQueryResults('mapped')).toEqual([{ b }]);

            world.addComponent(e0, d);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[a, b]]);
            expect(world.getQueryResults('bc')).toEqual([[b, c]]);
            expect(world.getQueryResults('cd')).toEqual([[c, d]]);
            expect(world.getQueryResults('mapped')).toEqual([{ b }]);

            world.removeComponent(e0, 'A');
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([]);
            expect(world.getQueryResults('bc')).toEqual([[b, c]]);
            expect(world.getQueryResults('cd')).toEqual([[c, d]]);
            expect(world.getQueryResults('mapped')).toEqual([]);

            world.removeComponent(e0, 'B');
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([]);
            expect(world.getQueryResults('bc')).toEqual([]);
            expect(world.getQueryResults('cd')).toEqual([[c, d]]);
            expect(world.getQueryResults('mapped')).toEqual([]);

            world.addComponent(e0, a);
            world.addComponent(e0, b);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([[a, b]]);
            expect(world.getQueryResults('bc')).toEqual([[b, c]]);
            expect(world.getQueryResults('cd')).toEqual([[c, d]]);
            expect(world.getQueryResults('mapped')).toEqual([{ b }]);

            world.despawn(e0);
            world.updateQueries();

            expect(world.getQueryResults('ab')).toEqual([]);
            expect(world.getQueryResults('bc')).toEqual([]);
            expect(world.getQueryResults('cd')).toEqual([]);
            expect(world.getQueryResults('mapped')).toEqual([]);
        });
    });

    describe('events', () => {
        const components = defineComponents({
            A: undefined,
            B: s.struct({ x: s.number, y: s.number }),
        });

        type WorldComponent = InferComponents<typeof components>;
        type WorldResources = { deltaTime: number };

        type E1 = DefineEcsEvent<'E1'>;
        type E2 = DefineEcsEvent<'E2', { a: string }>;
        type E3 = DefineEcsEvent<'E3', { b: number }>;
        type WorldEvent = E1 | E2 | E3;

        it('should return the correct type when no event type was passed', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const world = worldBuilder().withComponents(components).withQueries().compile();
            type World = typeof world;
            type Emit = Parameters<World['emit']>[0];
            type On = Parameters<World['on']>[0];

            expectTypeOf<Emit>().toExtend<GenericEcsEvent>();
            expectTypeOf<On>().toExtend<EcsEvent<WorldComponent, NonNullable<unknown>>['type']>();

            expectTypeOf<GenericEcsEvent>().toExtend<Emit>();
            expectTypeOf<EcsEvent<WorldComponent, NonNullable<unknown>>['type']>().toExtend<On>();
        });

        it('should return the correct type when passed as generic', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const world = worldBuilder<WorldResources, WorldEvent>().withComponents(components).withQueries().compile();
            type World = typeof world;
            type Emit = Parameters<World['emit']>[0];
            type On = Parameters<World['on']>[0];

            expectTypeOf<Emit>().toExtend<WorldEvent>();
            expectTypeOf<On>().toExtend<(WorldEvent | EcsEvent<WorldComponent, WorldResources>)['type']>();

            expectTypeOf<WorldEvent>().toExtend<Emit>();
            expectTypeOf<(WorldEvent | EcsEvent<WorldComponent, WorldResources>)['type']>().toExtend<On>();
        });

        it('should call all event handlers', () => {
            const world = worldBuilder<WorldResources, WorldEvent>().withComponents(components).withQueries().compile();

            const mockE1 = vi.fn();
            world.on('E1', mockE1);

            const mockE2 = vi.fn();
            world.on('E2', mockE2);

            const mockE3 = vi.fn();
            world.on('E3', mockE3);

            const mockSpawn = vi.fn();
            world.on('ecs/spawn-entity', mockSpawn);

            const mockAdd = vi.fn();
            world.on('ecs/add-component', mockAdd);

            const mockRemove = vi.fn();
            world.on('ecs/remove-component', mockRemove);

            const mockDespawn = vi.fn();
            world.on('ecs/despawn-entity', mockDespawn);

            const mockSetResource = vi.fn();
            world.on('ecs/set-resource', mockSetResource);

            const mockRemoveResource = vi.fn();
            world.on('ecs/remove-resource', mockRemoveResource);

            world.emit({ type: 'E1' });
            world.emit({ type: 'E2', payload: { a: 'foo' } });
            world.emit({ type: 'E3', payload: { b: 42 } });

            const e0 = world.createEntity();
            const a = createComponent('A');
            const b = createComponent('B', { x: 0, y: 0 });

            world.spawn(e0, [a]);
            world.addComponent(e0, b);
            world.removeComponent(e0, 'B');
            world.despawn(e0);

            world.setResource('deltaTime', 0.16);
            world.removeResource('deltaTime');

            expect(mockE1.mock.lastCall).toEqual([undefined]);
            expect(mockE2.mock.lastCall).toEqual([{ a: 'foo' }]);
            expect(mockE3.mock.lastCall).toEqual([{ b: 42 }]);

            expect(mockSpawn.mock.lastCall).toEqual([{ entity: e0, components: [a] }]);
            expect(mockAdd.mock.lastCall).toEqual([{ entity: e0, component: b }]);
            expect(mockRemove.mock.lastCall).toEqual([{ entity: e0, component: b }]);
            expect(mockDespawn.mock.lastCall).toEqual([{ entity: e0 }]);
            expect(mockSetResource.mock.lastCall).toEqual([{ name: 'deltaTime', data: 0.16 }]);
            expect(mockRemoveResource.mock.lastCall).toEqual([{ name: 'deltaTime', data: 0.16 }]);
        });
    });
});
