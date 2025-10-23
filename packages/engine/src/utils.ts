import { debounce } from './internal';

const defaultImageBitmapOptions: ImageBitmapOptions = {};

export const ImageLoader = {
    loadImage: (url: string, options?: ImageBitmapOptions) =>
        fetch(url)
            .then((res) => res.blob())
            .then((blob) => createImageBitmap(blob, { ...defaultImageBitmapOptions, ...options })),
};

export const DomUtils = {
    getCanvasById: (id: string, maxDevicePixelRatio?: number) => {
        const _dpr = window.devicePixelRatio || 1;
        const dpr = typeof maxDevicePixelRatio === 'number' ? Math.min(_dpr, maxDevicePixelRatio) : _dpr;
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        return canvas;
    },
    onResize: ({
        canvas,
        fn,
        maxDevicePixelRatio,
        debounceTime,
    }: {
        canvas: HTMLCanvasElement;
        fn: (width: number, height: number) => void;
        maxDevicePixelRatio?: number;
        debounceTime?: number;
    }) => {
        const dbt = debounceTime ?? 100;
        const _dpr = window.devicePixelRatio || 1;
        const dpr = typeof maxDevicePixelRatio === 'number' ? Math.min(_dpr, maxDevicePixelRatio) : _dpr;

        const resizeObserver = new ResizeObserver(
            debounce((entries) => {
                const dpcb = entries[0].devicePixelContentBoxSize[0];
                const cbs = entries[0].contentBoxSize[0];
                const width = dpcb.inlineSize || cbs.inlineSize * dpr;
                const height = dpcb.blockSize || cbs.blockSize * dpr;
                canvas.width = width;
                canvas.height = height;
                fn(width, height);
            }, dbt),
        );

        try {
            resizeObserver.observe(canvas, { box: 'device-pixel-content-box' });
        } catch {
            resizeObserver.observe(canvas, { box: 'content-box' });
        }
    },
};
