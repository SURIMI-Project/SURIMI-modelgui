export type MapImage = HTMLImageElement | ImageBitmap;

/** Native image loading reuses the HTML preloads and normal browser asset cache. */
export default function loadMapImage(url: string): Promise<MapImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (error) {
        image.removeAttribute("src");
        reject(error);
      } else resolve(image);
    };
    const timeout = window.setTimeout(() => finish(new Error("Map image request timed out")), 20000);
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(() => finish(), () => finish(new Error("Unable to decode map image")));
      } else finish();
    };
    image.onerror = () => finish(new Error("Unable to load map image"));
    image.src = url;
  });
}

export function releaseMapImage(image: MapImage) {
  if ("close" in image) image.close();
}
