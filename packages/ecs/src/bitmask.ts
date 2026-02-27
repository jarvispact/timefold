// Can be used for a entity or query
export type Bitmask = {
    with: Uint32Array;
    without: Uint32Array;
};

const DIVISOR = 32;

export const createBitmask = (maxComponentType: number) => ({
    with: new Uint32Array(maxComponentType / DIVISOR),
    without: new Uint32Array(maxComponentType / DIVISOR),
});

export function addComponentToEntityBitmask(bitmask: Bitmask, kind: 'with' | 'without', componentType: number) {
    bitmask[kind][componentType >> 5] |= 1 << (componentType & 31);
}

export function removeComponentFromEntityBitmask(bitmask: Bitmask, kind: 'with' | 'without', componentType: number) {
    bitmask[kind][componentType >> 5] &= ~(1 << (componentType & 31));
}

export function satisfiesBitmask(queryBitmask: Bitmask, entityBitmask: Bitmask): boolean {
    for (let i = 0; i < queryBitmask.with.length; i++) {
        const queryWith = queryBitmask.with[i];
        if ((entityBitmask.with[i] & queryWith) !== queryWith) return false;
    }

    for (let i = 0; i < queryBitmask.without.length; i++) {
        if ((entityBitmask.with[i] & queryBitmask.without[i]) !== 0) return false;
    }

    return true;
}
