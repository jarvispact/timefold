// flipping y in `copyExternalImageToTexture` in `createImageBitmapTexture`
const defaultImageBitmapOptions: ImageBitmapOptions = {};

export const ImageLoader = {
    loadImage: (url: string, options?: ImageBitmapOptions) =>
        fetch(url)
            .then((res) => res.blob())
            .then((blob) => createImageBitmap(blob, { ...defaultImageBitmapOptions, ...options })),
};

export const DomUtils = {
    getCanvasById: (id: string) => {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        return canvas;
    },
};
