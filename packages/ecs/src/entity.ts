type Branded<K, T> = K & { __brand: T };

export type Entity = Branded<number, 'entity'>;
