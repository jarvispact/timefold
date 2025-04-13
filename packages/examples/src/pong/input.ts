export const setupInputListeners = (element: Window) => {
    const keydownMap: Record<string, boolean> = {};
    const keypressedMap: Record<string, boolean> = {};

    const keyDown = (key: string) => {
        return keydownMap[key];
    };

    const justPressed = (key: string) => {
        const value = keypressedMap[key];
        keypressedMap[key] = false;
        return value;
    };

    element.addEventListener('keydown', (e) => {
        keydownMap[e.key] = true;
    });

    element.addEventListener('keyup', (e) => {
        keydownMap[e.key] = false;
    });

    // keypress keeps firing when held down
    // should be handled in userland
    element.addEventListener('keypress', (e) => {
        keydownMap[e.key] = true;
    });

    return { keyDown, justPressed };
};
