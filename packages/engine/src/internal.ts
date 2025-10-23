export function objectKeys<Obj extends Record<string, unknown>>(obj: Obj) {
    return Object.keys(obj) as (keyof Obj)[];
}

export function debounce<T extends unknown[]>(callback: (...args: T) => void, delay: number) {
    let timeoutTimer: number;

    return function (...args: T) {
        clearTimeout(timeoutTimer);

        timeoutTimer = setTimeout(() => {
            callback(...args);
        }, delay);
    };
}

export const ensureFloat32Array = (array: number[] | Float32Array) =>
    array instanceof Float32Array ? array : new Float32Array(array);

export const ensureUint32Array = (array: number[] | Uint32Array) =>
    array instanceof Uint32Array ? array : new Uint32Array(array);
