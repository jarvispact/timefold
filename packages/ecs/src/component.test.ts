import { expect, it, describe, expectTypeOf } from 'vitest';
import { createComponent, defineComponentTypes } from './component';

describe('component', () => {
    it('should create a component and return the correct type', () => {
        const component1 = createComponent(0);
        expect(component1).toEqual({ type: 0 });
        expectTypeOf(component1).toMatchObjectType<{ type: 0 }>();

        const component2 = createComponent(1, { foo: 'bar' });
        expect(component2).toEqual({ type: 1, data: { foo: 'bar' } });
        expectTypeOf(component2).toMatchObjectType<{ type: 1; data: { foo: string } }>();
    });

    it('should define component types and return the correct type', () => {
        const { T } = defineComponentTypes(['POS', 'VEL', 'COLOR']);

        expectTypeOf(T).toMatchObjectType<{
            POS: 0;
            VEL: 1;
            COLOR: 2;
        }>();

        expect(T).toEqual({
            POS: 0,
            VEL: 1,
            COLOR: 2,
        });
    });
});
