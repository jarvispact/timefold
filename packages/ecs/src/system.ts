export type SyncSystem = { async: false; fn: () => void };
export type AsyncSystem = { async: true; fn: () => Promise<void> };
export type System = SyncSystem | AsyncSystem;
export type SystemListEntry = System | AsyncSystem[];

export const system = (fn: () => void): SyncSystem => {
    return {
        async: false,
        fn,
    };
};

export const asyncSystem = (fn: () => Promise<void>): AsyncSystem => {
    return {
        async: true,
        fn,
    };
};
