const DIVISOR = 32;

export type Bitmask = {
    has: number[];
};

export function createBitmask(): Bitmask {
    return { has: [] };
}

export function addBitToBitmask(bitmask: Bitmask, bit: number) {
    const index = Math.floor(bit / DIVISOR);

    while (bitmask.has.length <= index) {
        bitmask.has.push(0);
    }

    bitmask.has[index] |= 1 << bit % DIVISOR;
}

export function removeBitFromBitmask(bitmask: Bitmask, bit: number) {
    const index = Math.floor(bit / DIVISOR);

    if (index < bitmask.has.length) {
        bitmask.has[index] &= ~(1 << bit % DIVISOR);
    }
}

export function hasBitInBitmask(bitmask: Bitmask, bit: number) {
    const index = Math.floor(bit / DIVISOR);

    if (index >= bitmask.has.length) {
        return false;
    }

    return (bitmask.has[index] & (1 << bit % DIVISOR)) !== 0;
}

export function includesMask(bitmask: Bitmask, otherMasks: Bitmask) {
    for (let i = 0; i < otherMasks.has.length; i++) {
        const otherMask = otherMasks.has[i];
        const mask = i < bitmask.has.length ? bitmask.has[i] : 0;
        if ((mask & otherMask) !== otherMask) {
            return false;
        }
    }
    return true;
}
