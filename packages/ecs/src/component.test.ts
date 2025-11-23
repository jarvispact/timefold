import { expect, it, describe, expectTypeOf } from 'vitest';
import { createComponent } from './component';

describe('component', () => {
    it('should create a component and return the correct type', () => {
        const component1 = createComponent('A');
        expect(component1).toEqual({ type: 'A' });
        expectTypeOf(component1).toMatchObjectType<{ type: 'A' }>();

        const component2 = createComponent('B', { foo: 'bar' });
        expect(component2).toEqual({ type: 'B', data: { foo: 'bar' } });
        expectTypeOf(component2).toMatchObjectType<{ type: 'B'; data: { foo: string } }>();
    });
});
