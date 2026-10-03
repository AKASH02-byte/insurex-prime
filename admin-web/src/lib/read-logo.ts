const LOGO_MAX_SIDE = 256;

/** Opaque and close to white. */
const isNearWhite = (data: Uint8ClampedArray, index: number) =>
  data[index + 3]! > 240 &&
  data[index]! >= 225 &&
  data[index + 1]! >= 225 &&
  data[index + 2]! >= 225;

/**
 * Round logos are often saved as a disc on a solid white square. On a dark theme those white
 * corners show as a white frame, so this turns them transparent. It only acts when the
 * image looks like that (white corners, white removed from about a quarter of the area);
 * square and already transparent logos are left exactly as uploaded.
 */
function clearDiscBackground(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  if (!corners.every((pixel) => isNearWhite(data, pixel * 4))) return;

  const background = new Uint8Array(width * height);
  const stack = [...corners];
  for (const pixel of corners) background[pixel] = 1;
  while (stack.length > 0) {
    const pixel = stack.pop()!;
    const x = pixel % width;
    const neighbours = [
      x > 0 ? pixel - 1 : -1,
      x < width - 1 ? pixel + 1 : -1,
      pixel >= width ? pixel - width : -1,
      pixel < width * (height - 1) ? pixel + width : -1,
    ];
    for (const next of neighbours) {
      if (next >= 0 && !background[next] && isNearWhite(data, next * 4)) {
        background[next] = 1;
        stack.push(next);
      }
    }
  }

  let removed = 0;
  for (const flag of background) removed += flag;
  // A disc covers pi/4 (about 0.785) of its bounding square, so about 21% is corner background.
  const covered = 1 - removed / (width * height);
  if (covered < 0.68 || covered > 0.84) return;

  for (let pixel = 0; pixel < background.length; pixel += 1) {
    if (background[pixel]) data[pixel * 4 + 3] = 0;
  }
  context.putImageData(image, 0, 0);
}

/** Downsizes the picked image to a small PNG data URL so it stays well under the API limit. */
export function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      reject(new Error("Choose a PNG, JPEG or WebP image."));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      clearDiscBackground(canvas);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be read."));
    };
    image.src = url;
  });
}
