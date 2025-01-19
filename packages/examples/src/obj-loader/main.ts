import { examples } from './menu';

let lastDestroy: (() => void) | undefined = undefined;

// start the default right away
void import('./interleaved-typed-array-indexed').then(async ({ run, destroy }) => {
    lastDestroy = destroy;
    await run();
});

// lazily load examples on button click
examples.forEach((example) => {
    const btn = document.getElementById(example) as HTMLButtonElement;
    btn.onclick = async () => {
        lastDestroy?.();
        const { run, destroy } = (await import(`./${example}`)) as { run: () => Promise<void>; destroy: () => void };
        lastDestroy = destroy;
        await run();
    };
});
