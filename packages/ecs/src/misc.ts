export type EntityId = string | number;

export const createTuple = <T extends unknown[]>(...args: T) => args;
