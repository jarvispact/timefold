const DIVISOR = 32;

export type Bitmask = number[];

export function createBitmask(): Bitmask {
    return [];
}

export function addComponentToBitmask(bitmask: Bitmask, componentType: number) {
    const index = Math.floor(componentType / DIVISOR);

    while (bitmask.length <= index) {
        bitmask.push(0);
    }

    bitmask[index] |= 1 << componentType % DIVISOR;
}

export function removeComponentFromBitmask(bitmask: Bitmask, componentType: number) {
    const index = Math.floor(componentType / DIVISOR);

    if (index < bitmask.length) {
        bitmask[index] &= ~(1 << componentType % DIVISOR);
    }
}

export function satisfiesBitmask(queryBitmask: Bitmask, entityBitmask: Bitmask) {
    const queryLen = queryBitmask.length;
    const entityLen = entityBitmask.length;

    // Early exit if entity bitmask is shorter than query
    if (entityLen < queryLen && queryBitmask[entityLen] !== 0) {
        return false;
    }

    for (let i = 0; i < queryLen; i++) {
        const queryMask = queryBitmask[i];
        const entityMask = i < entityLen ? entityBitmask[i] : 0;
        if ((entityMask & queryMask) !== queryMask) {
            return false;
        }
    }
    return true;
}
