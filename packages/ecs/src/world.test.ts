import { expect, it, describe, vi, expectTypeOf } from 'vitest';
import { Component, createComponent } from './component';
import { createWorld } from './world';

describe('world', () => {
    describe('events', () => {
        it('should call the "ecs/spawn-entity" event listener', () => {
            const world = createWorld();

            const mock = vi.fn();
            world.on('ecs/spawn-entity', mock);

            const entity = {
                id: '0',
                components: [createComponent('A', 'a'), createComponent('B', 42)],
            };

            world.spawnEntity(entity.id, entity.components);

            expect(mock).toHaveBeenCalledWith({ type: 'ecs/spawn-entity', payload: entity });
        });

        it('should call the "ecs/despawn-entity" event listener', () => {
            const world = createWorld();

            const mock = vi.fn();
            world.on('ecs/despawn-entity', mock);

            const entity = {
                id: '0',
                components: [createComponent('A', 'a'), createComponent('B', 42)],
            };

            world.spawnEntity(entity.id, entity.components);
            world.despawnEntity('0');

            expect(mock).toHaveBeenCalledWith({ type: 'ecs/despawn-entity', payload: entity });
        });

        it('should call the "ecs/add-component" event listener', () => {
            const world = createWorld();

            const mock = vi.fn();
            world.on('ecs/add-component', mock);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            const entity = {
                id: '0',
                components: [a, b],
            };

            world.spawnEntity(entity.id, entity.components);
            world.addComponent('0', c);

            expect(mock).toHaveBeenCalledWith({
                type: 'ecs/add-component',
                payload: { entityId: '0', component: c },
            });
        });

        it('should call the "ecs/remove-component" event listener', () => {
            const world = createWorld();

            const mock = vi.fn();
            world.on('ecs/remove-component', mock);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            const entity = {
                id: '0',
                components: [a, b, c],
            };

            world.spawnEntity(entity.id, entity.components);
            world.removeComponent('0', c.type);

            expect(mock).toHaveBeenCalledWith({
                type: 'ecs/remove-component',
                payload: { entityId: '0', component: c },
            });
        });
    });

    describe('queries (spawn-entity)', () => {
        it('should return tuples that contain just the id as the only item', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({ includeId: true, tuple: [] });
            expectTypeOf(query).toMatchTypeOf<[string][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([['0']]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([['0'], ['1']]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([['0'], ['1'], ['2']]);
        });

        it('[has-query] should return tuples that contain the id along with the specified components', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                includeId: true,
                tuple: [{ has: 'A' }, { has: 'C' }],
            });

            expectTypeOf(query).toMatchTypeOf<[string, A, C][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([['3', a, c]]);
        });

        it('[has-query] should return tuples without id and with the specified components', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                tuple: [{ has: 'A' }, { has: 'C' }],
            });

            expectTypeOf(query).toMatchTypeOf<[A, C][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([[a, c]]);
        });

        it('[has-query] should return the mapped result without id', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery(
                {
                    tuple: [{ has: 'A' }, { has: 'C' }],
                },
                {
                    map: (tuple) => ({ a: tuple[0].data, c: tuple[1].data }),
                },
            );

            expectTypeOf(query).toMatchTypeOf<{ a: string; c: boolean }[]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([{ a: a.data, c: c.data }]);
        });

        it('[has-query] should return tuples that contain the id along with the specified components respecting the `includes` flag', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                includeId: true,
                tuple: [{ has: 'A' }, { has: 'C', include: false }],
            });

            expectTypeOf(query).toMatchTypeOf<[string, A][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([['3', a]]);
        });

        it('[has-query] should return tuples that contain the id along with the specified optional components', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                includeId: true,
                tuple: [{ has: 'A' }, { has: 'C', optional: true }],
            });

            expectTypeOf(query).toMatchTypeOf<[string, A, C | undefined][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([['0', a, undefined]]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([['0', a, undefined]]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([['0', a, undefined]]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([
                ['0', a, undefined],
                ['3', a, c],
            ]);
        });

        it('[or-query] should return tuples that contain the id along with the specified components', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                includeId: true,
                tuple: [{ or: ['A', 'C'] }],
            });

            expectTypeOf(query).toMatchTypeOf<[string, A | C][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([['0', a]]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([['0', a]]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([
                ['0', a],
                ['2', c],
            ]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([
                ['0', a],
                ['2', c],
                ['3', a],
            ]);
        });

        it('[or-query] should return the mapped result of the specified query', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery(
                {
                    includeId: true,
                    tuple: [{ or: ['A', 'C'] }],
                },
                {
                    map: (tuple) => ({ a: tuple[0], c: tuple[1].data }),
                },
            );

            expectTypeOf(query).toMatchTypeOf<{ a: string; c: string | boolean }[]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([{ a: '0', c: 'a' }]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([{ a: '0', c: 'a' }]);

            world.spawnEntity('2', [c]);

            expect(query).toEqual([
                { a: '0', c: 'a' },
                { a: '2', c: true },
            ]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([
                { a: '0', c: 'a' },
                { a: '2', c: true },
                { a: '3', c: 'a' },
            ]);
        });
    });

    describe('queries (despawn-entity)', () => {
        it('should remove tuples that contain just the id as the only component', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({ includeId: true, tuple: [] });
            expectTypeOf(query).toMatchTypeOf<[string][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);

            world.spawnEntity('0', [a]);

            world.spawnEntity('1', [b]);

            world.spawnEntity('2', [c]);

            world.spawnEntity('3', [a, c]);

            expect(query).toEqual([['0'], ['1'], ['2'], ['3']]);

            world.despawnEntity('1');
            expect(query).toEqual([['0'], ['3'], ['2']]);

            world.despawnEntity('3');
            expect(query).toEqual([['0'], ['2']]);

            world.despawnEntity('0');
            expect(query).toEqual([['2']]);

            world.despawnEntity('2');
            expect(query).toEqual([]);
        });

        it('[has-query] should remove tuples that contain the id along with the specified component', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                includeId: true,
                tuple: [{ has: 'A' }, { has: 'C' }],
            });

            expectTypeOf(query).toMatchTypeOf<[string, A, C][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const c = createComponent('C', true);

            world.spawnEntity('0', [a, c]);

            world.spawnEntity('1', [a]);

            world.spawnEntity('2', [a, c]);

            world.spawnEntity('3', [a, c]);

            world.spawnEntity('4', [a, c]);

            expect(query).toEqual([
                ['0', a, c],
                ['2', a, c],
                ['3', a, c],
                ['4', a, c],
            ]);

            // was never added, so removing should be a noop
            world.despawnEntity('1');
            expect(query).toEqual([
                ['0', a, c],
                ['2', a, c],
                ['3', a, c],
                ['4', a, c],
            ]);

            world.despawnEntity('2');
            expect(query).toEqual([
                ['0', a, c],
                ['4', a, c],
                ['3', a, c],
            ]);

            world.despawnEntity('4');
            expect(query).toEqual([
                ['0', a, c],
                ['3', a, c],
            ]);

            world.despawnEntity('0');
            expect(query).toEqual([['3', a, c]]);

            world.despawnEntity('3');
            expect(query).toEqual([]);
        });

        it('[has-query] should remove tuples without the id and the specified component', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                tuple: [{ has: 'A' }, { has: 'C' }],
            });

            expectTypeOf(query).toMatchTypeOf<[A, C][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const c = createComponent('C', true);

            world.spawnEntity('0', [a, c]);

            world.spawnEntity('1', [a]);

            world.spawnEntity('2', [a, c]);

            world.spawnEntity('3', [a, c]);

            world.spawnEntity('4', [a, c]);

            expect(query).toEqual([
                [a, c],
                [a, c],
                [a, c],
                [a, c],
            ]);

            // was never added, so removing should be a noop
            world.despawnEntity('1');
            expect(query).toEqual([
                [a, c],
                [a, c],
                [a, c],
                [a, c],
            ]);

            world.despawnEntity('2');
            expect(query).toEqual([
                [a, c],
                [a, c],
                [a, c],
            ]);

            world.despawnEntity('4');
            expect(query).toEqual([
                [a, c],
                [a, c],
            ]);

            world.despawnEntity('0');
            expect(query).toEqual([[a, c]]);

            world.despawnEntity('3');
            expect(query).toEqual([]);
        });
    });

    describe('queries (add-component)', () => {
        it('should add a tuple when a component is added to an entity which results in a satisfied query definition', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({ includeId: true, tuple: [{ has: 'A' }] });
            expectTypeOf(query).toMatchTypeOf<[string, A][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);

            world.spawnEntity('0', [a]);

            expect(query).toEqual([['0', a]]);

            world.spawnEntity('1', [b]);

            expect(query).toEqual([['0', a]]);

            // should do nothing - query only interested in `a`
            world.addComponent('0', b);
            // should do nothing - entityId: '2' does not exist.
            world.addComponent('2', a);

            expect(query).toEqual([['0', a]]);

            // query should be updated
            world.addComponent('1', a);

            expect(query).toEqual([
                ['0', a],
                ['1', a],
            ]);
        });
    });

    describe('queries (remove-component)', () => {
        it('should remove a tuple when a component is removed from an entity which results in a query definition not being satisfied anymore', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;

            type WorldComponent = A | B | C;

            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                includeId: true,
                tuple: [{ has: 'A' }, { has: 'B' }],
            });

            expectTypeOf(query).toMatchTypeOf<[string, A, B][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);

            world.spawnEntity('0', [a, b]);

            world.spawnEntity('1', [a, b]);

            expect(query).toEqual([
                ['0', a, b],
                ['1', a, b],
            ]);

            // should do nothing - query only interested in `a` or `b`
            world.removeComponent('0', 'C');
            // should do nothing - entityId: '2' does not exist.
            world.removeComponent('2', 'A');

            expect(query).toEqual([
                ['0', a, b],
                ['1', a, b],
            ]);

            // query should be updated
            world.removeComponent('1', 'B');
            expect(query).toEqual([['0', a, b]]);
        });
    });

    describe('complex queries', () => {
        it('should produce the correct query eventually', () => {
            type A = Component<'A', string>;
            type B = Component<'B', number>;
            type C = Component<'C', boolean>;
            type D = Component<'D', null>;

            type WorldComponent = A | B | C | D;
            const world = createWorld<WorldComponent>();

            const query = world.createQuery({
                includeId: true,
                tuple: [{ has: 'A' }, { or: ['B', 'C'] }, { has: 'D', optional: true }],
            });

            expectTypeOf(query).toMatchTypeOf<[string, A, B | C, D | undefined][]>();
            expect(query).toEqual([]);

            const a = createComponent('A', 'a');
            const b = createComponent('B', 42);
            const c = createComponent('C', true);
            const d = createComponent('D', null);

            world.spawnEntity('0', [a, b, d]); // match
            world.spawnEntity('1', [a, c, d]); // match
            world.spawnEntity('2', [a, c]); // match
            world.spawnEntity('3', [a, c, b]); // no match

            world.spawnEntity('4', [b]); // no match
            world.spawnEntity('5', [a, d]); // no match

            world.spawnEntity('6', [a]); // no match

            expect(query).toEqual([
                ['0', a, b, d],
                ['1', a, c, d],
                ['2', a, c, undefined],
                ['3', a, c, undefined],
            ]);

            world.addComponent('6', b);
            expect(query).toEqual([
                ['0', a, b, d],
                ['1', a, c, d],
                ['2', a, c, undefined],
                ['3', a, c, undefined],
                ['6', a, b, undefined],
            ]);

            world.removeComponent('0', 'A');
            expect(query).toEqual([
                ['6', a, b, undefined],
                ['1', a, c, d],
                ['2', a, c, undefined],
                ['3', a, c, undefined],
            ]);

            world.despawnEntity('2');
            expect(query).toEqual([
                ['6', a, b, undefined],
                ['1', a, c, d],
                ['3', a, c, undefined],
            ]);

            world.despawnEntity('3');
            expect(query).toEqual([
                ['6', a, b, undefined],
                ['1', a, c, d],
            ]);

            world.removeComponent('6', 'B');
            expect(query).toEqual([['1', a, c, d]]);

            world.spawnEntity('7', [a, b]);
            world.spawnEntity('8', [a, b, d]);
            expect(query).toEqual([
                ['1', a, c, d],
                ['7', a, b, undefined],
                ['8', a, b, d],
            ]);

            world.despawnEntity('1');
            expect(query).toEqual([
                ['8', a, b, d],
                ['7', a, b, undefined],
            ]);
        });
    });
});
