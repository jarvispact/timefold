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

        it('should allow `compile`, `with` and `without` after `includeEntity`', () => {
            const q = query().name('test').includeEntity();
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without'>();
        });

        it('should allow `compile`, `with` and `without` after `with`', () => {
            const q = query().name('test').with(1);
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without'>();
        });

        it('should allow chaining of `with`', () => {
            const q = query().name('test').with(1).with(2);
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without'>();
        });

        it('should allow `compile`, `with` and `without` after `includeEntity`', () => {
            const q = query().name('test').includeEntity();
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'with' | 'without'>();
        });

        it('should allow only allow `compile` and `without` after the first `without`', () => {
            const q = query().name('test').includeEntity().without(1);
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'without'>();
        });

        it('should allow chaining of without', () => {
            const q = query().name('test').includeEntity().without(1).without(2);
            type Test = keyof typeof q;
            expectTypeOf<Test>().toEqualTypeOf<'compile' | 'without'>();
        });

        it('should remove used types from the union', () => {
            type C = { type: 0 } | { type: 1 } | { type: 2 };

            const q1 = query<C>().name('test').with;
            type Test1 = Parameters<typeof q1>[0];
            expectTypeOf<Test1>().toEqualTypeOf<0 | 1 | 2>();

            const q2 = query<C>().name('test').with(0).with;
            type Test2 = Parameters<typeof q2>[0];
            expectTypeOf<Test2>().toEqualTypeOf<1 | 2>();

            const q3 = query<C>().name('test').with(0).with(1).with;
            type Test3 = Parameters<typeof q3>[0];
            expectTypeOf<Test3>().toEqualTypeOf<2>();

            const q4 = query<C>().name('test').with(0).with(1).with(2).with;
            type Test4 = Parameters<typeof q4>[0];
            expectTypeOf<Test4>().toEqualTypeOf<never>();
        });
    });

    describe('compiled queries', () => {
        it('should return the correct compiled query type. Case 1', () => {
            const q = query().name('test').includeEntity().with(1).compile();

            expect(q).toEqual({
                name: 'test',
                includeEntity: true,
                types: [{ with: 1 }],
            });

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', true, [With<1>]>>();
        });

        it('should return the correct compiled query type. Case 2', () => {
            const q = query().name('test').with(1).compile();

            expect(q).toEqual({
                name: 'test',
                includeEntity: false,
                types: [{ with: 1 }],
            });

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', boolean, [With<1>]>>();
        });

        it('should return the correct compiled query type. Case 3', () => {
            const q = query().name('test').includeEntity().without(1).compile();

            expect(q).toEqual({
                name: 'test',
                includeEntity: true,
                types: [{ without: 1 }],
            });

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', true, [Without<1>]>>();
        });

        it('should return the correct compiled query type. Case 4', () => {
            const q = query().name('test').includeEntity().with(1).without(2).compile();

            expect(q).toEqual({
                name: 'test',
                includeEntity: true,
                types: [{ with: 1 }, { without: 2 }],
            });

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<CompiledQuery<'test', true, [With<1>, Without<2>]>>();
        });

        it('should return the correct compiled query type. Case 5', () => {
            const q = query().name('test').includeEntity().with(1).with(2).without(3).without(4).compile();

            expect(q).toEqual({
                name: 'test',
                includeEntity: true,
                types: [{ with: 1 }, { with: 2 }, { without: 3 }, { without: 4 }],
            });

            type Test = typeof q;
            expectTypeOf<Test>().toEqualTypeOf<
                CompiledQuery<'test', true, [With<1>, With<2>, Without<3>, Without<4>]>
            >();
        });
    });

    describe('query tuple result type', () => {
        it('should return the correct tuple type for simple queries with `with`', () => {
            type C = Component<0> | Component<1, number> | Component<2, string>;

            const q1 = query<C>().name('test').with(0).with(1).with(2).compile();
            type Test1 = InferQueryResultTuple<C, typeof q1>;
            expectTypeOf<Test1>().toEqualTypeOf<[Component<0>, Component<1, number>, Component<2, string>]>();

            const q2 = query<C>().name('test').with(2).with(0).with(1).compile();
            type Test2 = InferQueryResultTuple<C, typeof q2>;
            expectTypeOf<Test2>().toEqualTypeOf<[Component<2, string>, Component<0>, Component<1, number>]>();
        });

        it('should return the correct tuple type for simple queries with `with` and `include: false`', () => {
            type C = Component<0> | Component<1, number> | Component<2, string>;

            const q1 = query<C>().name('test').with(0).with(1, { include: false }).with(2).compile();
            type Test1 = InferQueryResultTuple<C, typeof q1>;
            expectTypeOf<Test1>().toEqualTypeOf<[Component<0>, Component<2, string>]>();

            const q2 = query<C>()
                .name('test')
                .with(2, { include: false })
                .with(0)
                .with(1, { include: false })
                .compile();
            type Test2 = InferQueryResultTuple<C, typeof q2>;
            expectTypeOf<Test2>().toEqualTypeOf<[Component<0>]>();
        });

        it('should return the correct tuple type for queries with `with` and `without`', () => {
            type C = Component<0> | Component<1, number> | Component<2, string>;

            const q1 = query<C>().name('test').with(0).with(1).without(2).compile();
            type Test1 = InferQueryResultTuple<C, typeof q1>;
            expectTypeOf<Test1>().toEqualTypeOf<[Component<0>, Component<1, number>]>();

            const q2 = query<C>().name('test').with(2).without(0).without(1).compile();
            type Test2 = InferQueryResultTuple<C, typeof q2>;
            expectTypeOf<Test2>().toEqualTypeOf<[Component<2, string>]>();

            const q3 = query<C>()
                .name('test')
                .includeEntity()
                .with(2, { include: false })
                .without(0)
                .without(1)
                .compile();
            type Test3 = InferQueryResultTuple<C, typeof q3>;
            expectTypeOf<Test3>().toEqualTypeOf<[Entity]>();
        });
    });
});
