/* eslint-disable @typescript-eslint/no-unused-vars */

import { it, describe, expectTypeOf, expect } from 'vitest';
import { CompiledQuery, InferQueryResultTuple, query, With, Without } from './query';
import { Component } from './component';
import { Entity } from './entity';

describe('query', () => {
    describe('query builder allowed methods', () => {
        it('should only allow name to be set at first', () => {
            const q = query();
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'name'>();
        });

        it('should only allow either `includeEntity` or `with` after `name`', () => {
            const q = query().name('test');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'includeEntity' | 'with'>();
        });

        it('should allow `compile`, `with`, `without` and `map` after `includeEntity`', () => {
            const q = query().name('test').includeEntity();
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without' | 'map'>();
        });

        it('should allow `compile`, `with`, `without` and `map` after `with`', () => {
            const q = query().name('test').with('B');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without' | 'map'>();
        });

        it('should allow chaining of `with`', () => {
            const q = query().name('test').with('B').with('C');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without' | 'map'>();
        });

        it('should allow `compile`, `with`, `without` and `map` after `includeEntity`', () => {
            const q = query().name('test').includeEntity();
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without' | 'map'>();
        });

        it('should allow `map` after `with`', () => {
            const q = query().name('test').with('B');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without' | 'map'>();
        });

        it('should allow `map` after `includeEntity` and `with`', () => {
            const q = query().name('test').includeEntity().with('B');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without' | 'map'>();
        });

        it('should allow `map` after `without`', () => {
            const q = query().name('test').includeEntity().without('B');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'without' | 'map'>();
        });

        it('should only allow `compile` after `map`', () => {
            type C = { type: 'A' } | { type: 'B' };
            const q = query<C>()
                .name('test')
                .with('A')
                .map(() => ({}));
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile'>();
        });

        it('should allow only allow `compile` and `without` after the first `without`', () => {
            const q = query().name('test').includeEntity().without('B');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'without' | 'map'>();
        });

        it('should allow chaining of without', () => {
            const q = query().name('test').includeEntity().without('B').without('C');
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'without' | 'map'>();
        });

        it('should remove used types from the union', () => {
            type C = { type: 'A' } | { type: 'B' } | { type: 'C' };

            const q1 = query<C>().name('test').with;
            type Test1 = Parameters<typeof q1>[0];
            expectTypeOf<Test1>().toEqualTypeOf<'A' | 'B' | 'C'>();

            const q2 = query<C>().name('test').with('A').with;
            type Test2 = Parameters<typeof q2>[0];
            expectTypeOf<Test2>().toEqualTypeOf<'B' | 'C'>();

            const q3 = query<C>().name('test').with('A').with('B').with;
            type Test3 = Parameters<typeof q3>[0];
            expectTypeOf<Test3>().toEqualTypeOf<'C'>();

            const q4 = query<C>().name('test').with('A').with('B').with('C').with;
            type Test4 = Parameters<typeof q4>[0];
            expectTypeOf<Test4>().toEqualTypeOf<never>();
        });
    });

    describe('compiled queries', () => {
        it('should return the correct compiled query type. Case 1', () => {
            const q = query().name('test').includeEntity().with('B').compile();

            expect(q).toMatchObject({
                name: 'test',
                includeEntity: true,
                types: [{ with: 'B' }],
            });
            expect(q.mapFn).toBeTypeOf('function');

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', true, [With<'B'>]>>();
        });

        it('should return the correct compiled query type. Case 2', () => {
            const q = query().name('test').with('B').compile();

            expect(q).toMatchObject({
                name: 'test',
                includeEntity: false,
                types: [{ with: 'B' }],
            });
            expect(q.mapFn).toBeTypeOf('function');

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', boolean, [With<'B'>]>>();
        });

        it('should return the correct compiled query type. Case 3', () => {
            const q = query().name('test').includeEntity().without('B').compile();

            expect(q).toMatchObject({
                name: 'test',
                includeEntity: true,
                types: [{ without: 'B' }],
            });
            expect(q.mapFn).toBeTypeOf('function');

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', true, [Without<'B'>]>>();
        });

        it('should return the correct compiled query type. Case 4', () => {
            const q = query().name('test').includeEntity().with('B').without('C').compile();

            expect(q).toMatchObject({
                name: 'test',
                includeEntity: true,
                types: [{ with: 'B' }, { without: 'C' }],
            });

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', true, [With<'B'>, Without<'C'>]>>();
        });

        it('should return a compiled query with mapFn when using .map()', () => {
            type C = Component<'A'> | Component<'B', number>;

            const q = query<C>()
                .name('test')
                .includeEntity()
                .with('A')
                .with('B')
                .map(([entity, _, b]) => ({ entity, b }))
                .compile();

            expect(q.name).toBe('test');
            expect(q.includeEntity).toBe(true);
            expect(q.types).toEqual([{ with: 'A' }, { with: 'B' }]);
            expect(q.mapFn).toBeTypeOf('function');
        });

        it('should return the correct compiled query type. Case 5', () => {
            const q = query().name('test').includeEntity().with('B').with('C').without('D').without('E').compile();

            expect(q).toMatchObject({
                name: 'test',
                includeEntity: true,
                types: [{ with: 'B' }, { with: 'C' }, { without: 'D' }, { without: 'E' }],
            });
            expect(q.mapFn).toBeTypeOf('function');

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<
                CompiledQuery<'test', true, [With<'B'>, With<'C'>, Without<'D'>, Without<'E'>]>
            >();
        });
    });

    describe('query tuple result type', () => {
        it('should return the correct tuple type for simple queries with `with`', () => {
            type C = Component<'A'> | Component<'B', number> | Component<'C', string>;

            const q1 = query<C>().name('test').with('A').with('B').with('C').compile();
            type Test1 = InferQueryResultTuple<C, typeof q1>;
            expectTypeOf<Test1>().toEqualTypeOf<[Component<'A'>, Component<'B', number>, Component<'C', string>]>();

            const q2 = query<C>().name('test').with('C').with('A').with('B').compile();
            type Test2 = InferQueryResultTuple<C, typeof q2>;
            expectTypeOf<Test2>().toEqualTypeOf<[Component<'C', string>, Component<'A'>, Component<'B', number>]>();
        });

        it('should return the correct tuple type for simple queries with `with` and `include: false`', () => {
            type C = Component<'A'> | Component<'B', number> | Component<'C', string>;

            const q1 = query<C>().name('test').with('A').with('B', { include: false }).with('C').compile();
            type Test1 = InferQueryResultTuple<C, typeof q1>;
            expectTypeOf<Test1>().toEqualTypeOf<[Component<'A'>, Component<'C', string>]>();

            const q2 = query<C>()
                .name('test')
                .with('C', { include: false })
                .with('A')
                .with('B', { include: false })
                .compile();
            type Test2 = InferQueryResultTuple<C, typeof q2>;
            expectTypeOf<Test2>().toEqualTypeOf<[Component<'A'>]>();
        });

        it('should return the correct tuple type for queries with `with` and `without`', () => {
            type C = Component<'A'> | Component<'B', number> | Component<'C', string>;

            const q1 = query<C>().name('test').with('A').with('B').without('C').compile();
            type Test1 = InferQueryResultTuple<C, typeof q1>;
            expectTypeOf<Test1>().toEqualTypeOf<[Component<'A'>, Component<'B', number>]>();

            const q2 = query<C>().name('test').with('C').without('A').without('B').compile();
            type Test2 = InferQueryResultTuple<C, typeof q2>;
            expectTypeOf<Test2>().toEqualTypeOf<[Component<'C', string>]>();

            const q3 = query<C>()
                .name('test')
                .includeEntity()
                .with('C', { include: false })
                .without('A')
                .without('B')
                .compile();
            type Test3 = InferQueryResultTuple<C, typeof q3>;
            expectTypeOf<Test3>().toEqualTypeOf<[Entity]>();
        });

        it('should return the mapped type when `.map()` is used', () => {
            type C = Component<'A'> | Component<'B', number> | Component<'C', string>;

            const q1 = query<C>()
                .name('test')
                .includeEntity()
                .with('A')
                .with('B')
                .map(([entity, _a, b]) => ({ entity, b }))
                .compile();

            type Test1 = InferQueryResultTuple<C, typeof q1>;
            expectTypeOf<Test1>().toEqualTypeOf<{ entity: Entity; b: Component<'B', number> }>();

            const q2 = query<C>()
                .name('test')
                .with('C')
                .map(([c]) => c.data)
                .compile();

            type Test2 = InferQueryResultTuple<C, typeof q2>;
            expectTypeOf<Test2>().toEqualTypeOf<string>();
        });
    });
});
