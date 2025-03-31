const defaultImageBitmapOptions: ImageBitmapOptions = {
    imageOrientation: 'flipY',
};

export const ImageLoader = {
    loadImage: (url: string, options?: ImageBitmapOptions) =>
        fetch(url)
            .then((res) => res.blob())
            .then((blob) => createImageBitmap(blob, { ...defaultImageBitmapOptions, ...options })),
};
