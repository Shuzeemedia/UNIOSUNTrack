export const getCroppedImg = (imageSrc, crop, zoom) => {
    const image = new Image();
    image.src = imageSrc;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const outputWidth = 300;
    const outputHeight = 300;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    return new Promise((resolve) => {
        image.onload = () => {
            const scale = image.width / image.naturalWidth;

            const px = (crop.x * image.width) / 100;
            const py = (crop.y * image.height) / 100;

            const sw = (image.width * crop.width) / 100;
            const sh = (image.height * crop.height) / 100;

            ctx.drawImage(image, px, py, sw, sh, 0, 0, outputWidth, outputHeight);

            canvas.toBlob((blob) => {
                resolve(blob);
            }, "image/jpeg");
        };
    });
};