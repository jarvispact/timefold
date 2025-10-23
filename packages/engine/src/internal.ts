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
