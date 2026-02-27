import { it, describe, expect } from 'vitest';
import {
    createBitmask,
    addComponentToEntityBitmask,
    removeComponentFromEntityBitmask,
    satisfiesBitmask,
} from './bitmask';

describe('bitmask', () => {
    describe('addComponentToEntityBitmask', () => {
        it('should set the bit in the `with` array for the given component type', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            expect(entityBitmask.with[0]).toBe(0b00000001);
            expect(entityBitmask.without[0]).toBe(0);
        });

        it('should set the bit in the `without` array for the given component type', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'without', 0);
            expect(entityBitmask.without[0]).toBe(0b00000001);
            expect(entityBitmask.with[0]).toBe(0);
        });

        it('should set bits for multiple components independently', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);
            addComponentToEntityBitmask(entityBitmask, 'with', 3);
            expect(entityBitmask.with[0]).toBe(0b00001011);
        });

        it('should be idempotent — adding the same component twice does not change the mask', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 2);
            addComponentToEntityBitmask(entityBitmask, 'with', 2);
            expect(entityBitmask.with[0]).toBe(0b00000100);
        });

        it('should correctly set a bit in the second word for component types >= 32', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 32);
            expect(entityBitmask.with[0]).toBe(0);
            expect(entityBitmask.with[1]).toBe(0b00000001);
        });
    });

    describe('removeComponentFromEntityBitmask', () => {
        it('should clear the bit in the `with` array for the given component type', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);
            removeComponentFromEntityBitmask(entityBitmask, 'with', 1);
            expect(entityBitmask.with[0]).toBe(0);
        });

        it('should clear the bit in the `without` array for the given component type', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'without', 1);
            removeComponentFromEntityBitmask(entityBitmask, 'without', 1);
            expect(entityBitmask.without[0]).toBe(0);
        });

        it('should only clear the specified component, leaving others intact', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);
            addComponentToEntityBitmask(entityBitmask, 'with', 2);
            removeComponentFromEntityBitmask(entityBitmask, 'with', 1);
            expect(entityBitmask.with[0]).toBe(0b00000101);
        });

        it('should not touch the other array when removing from `with`', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);
            addComponentToEntityBitmask(entityBitmask, 'without', 1);
            removeComponentFromEntityBitmask(entityBitmask, 'with', 1);
            expect(entityBitmask.with[0]).toBe(0);
            expect(entityBitmask.without[0]).toBe(0b00000010);
        });

        it('should be a no-op when removing a component that was never added', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            removeComponentFromEntityBitmask(entityBitmask, 'with', 5);
            expect(entityBitmask.with[0]).toBe(0b00000001);
        });

        it('should correctly clear a bit in the second word for component types >= 32', () => {
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 32);
            addComponentToEntityBitmask(entityBitmask, 'with', 33);
            removeComponentFromEntityBitmask(entityBitmask, 'with', 32);
            expect(entityBitmask.with[1]).toBe(0b00000010);
        });
    });

    describe('satisfiesBitmask', () => {
        it('should match any entity when the query has no required or excluded components', () => {
            const queryBitmask = createBitmask(64);
            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 7);
            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(true);
        });

        it('should match when the entity has the required component', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'with', 0);

            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);

            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(true);
        });

        it('should not match when the entity is missing a required component', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'with', 0);
            addComponentToEntityBitmask(queryBitmask, 'with', 1);

            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0); // has 0, missing 1

            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(false);
        });

        it('should match when the entity has all required components', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'with', 0);
            addComponentToEntityBitmask(queryBitmask, 'with', 1);
            addComponentToEntityBitmask(queryBitmask, 'with', 2);

            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);
            addComponentToEntityBitmask(entityBitmask, 'with', 2);
            addComponentToEntityBitmask(entityBitmask, 'with', 5); // extra component is fine

            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(true);
        });

        it('should match when the entity does not have any excluded component', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'without', 2);

            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);

            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(true);
        });

        it('should not match when the entity has an excluded component', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'without', 2);

            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 2); // has excluded component

            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(false);
        });

        it('should match when required components are present and excluded components are absent', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'with', 0);
            addComponentToEntityBitmask(queryBitmask, 'with', 1);
            addComponentToEntityBitmask(queryBitmask, 'without', 2);

            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);

            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(true);
        });

        it('should not match when required components are present but an excluded component is also present', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'with', 0);
            addComponentToEntityBitmask(queryBitmask, 'with', 1);
            addComponentToEntityBitmask(queryBitmask, 'without', 2);

            const entityBitmask = createBitmask(64);
            addComponentToEntityBitmask(entityBitmask, 'with', 0);
            addComponentToEntityBitmask(entityBitmask, 'with', 1);
            addComponentToEntityBitmask(entityBitmask, 'with', 2); // has excluded component

            expect(satisfiesBitmask(queryBitmask, entityBitmask)).toBe(false);
        });

        it('should correctly evaluate required and excluded components that span across word boundaries', () => {
            const queryBitmask = createBitmask(64);
            addComponentToEntityBitmask(queryBitmask, 'with', 0); // requires component 0 (word 0)
            addComponentToEntityBitmask(queryBitmask, 'with', 32); // requires component 32 (word 1)
            addComponentToEntityBitmask(queryBitmask, 'without', 33); // excludes component 33 (word 1)

            const matchingEntity = createBitmask(64);
            addComponentToEntityBitmask(matchingEntity, 'with', 0);
            addComponentToEntityBitmask(matchingEntity, 'with', 32);

            const entityMissingCrossWordComponent = createBitmask(64);
            addComponentToEntityBitmask(entityMissingCrossWordComponent, 'with', 0);

            const entityWithExcludedCrossWordComponent = createBitmask(64);
            addComponentToEntityBitmask(entityWithExcludedCrossWordComponent, 'with', 0);
            addComponentToEntityBitmask(entityWithExcludedCrossWordComponent, 'with', 32);
            addComponentToEntityBitmask(entityWithExcludedCrossWordComponent, 'with', 33);

            expect(satisfiesBitmask(queryBitmask, matchingEntity)).toBe(true);
            expect(satisfiesBitmask(queryBitmask, entityMissingCrossWordComponent)).toBe(false);
            expect(satisfiesBitmask(queryBitmask, entityWithExcludedCrossWordComponent)).toBe(false);
        });
    });
});
