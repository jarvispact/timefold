export const setupInputListeners = <
    InputMap extends { keydown: Record<string, string>; keypressed: Record<string, string> },
>(
    element: Window,
    inputMap: InputMap,
) => {
    const keydownKeys = Object.keys(inputMap.keydown);
    const keydownMap = keydownKeys.reduce<Record<string, boolean>>((accum, key) => {
        accum[key] = false;
        return accum;
    }, {});

    const keypressedKeys = Object.keys(inputMap.keypressed);
    const keypressedMap = keydownKeys.reduce<Record<string, boolean>>((accum, key) => {
        accum[key] = false;
        return accum;
    }, {});

    const keyDown = (key: keyof InputMap['keydown']) => {
        return keydownMap[key as string];
    };

    const justPressed = (key: keyof InputMap['keypressed']) => {
        const value = keypressedMap[key as string];
        keypressedMap[key as string] = false;
        return value;
    };

    element.addEventListener('keydown', (e) => {
        for (const key of keydownKeys) {
            if (e.key === inputMap.keydown[key]) {
                keydownMap[key] = true;
            }
        }
    });

    element.addEventListener('keyup', (e) => {
        for (const key of keydownKeys) {
            if (e.key === inputMap.keydown[key]) {
                keydownMap[key] = false;
            }
        }
    });

    // keypress keeps firing when held down
    // should be handled in userland
    element.addEventListener('keypress', (e) => {
        for (const key of keypressedKeys) {
            if (e.key === inputMap.keypressed[key]) {
                keypressedMap[key] = true;
            }
        }
    });

    return { keyDown, justPressed };
};
