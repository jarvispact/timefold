export const debounce = <T extends unknown[]>(callback: (...args: T) => void, delay: number) => {
    let timeoutTimer: number;

    return (...args: T) => {
        clearTimeout(timeoutTimer);

        timeoutTimer = window.setTimeout(() => {
            callback(...args);
        }, delay);
    };
};
