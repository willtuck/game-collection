/**
 * Extracts a dominant accent color from an image URL using the Canvas API.
 * Skips near-white, near-black, and low-saturation pixels so the result is
 * a vivid representative hue rather than a muddy average.
 * Returns null on CORS failure or if no suitable pixels are found.
 */
export function extractDominantColor(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, 16, 16);

        const { data } = ctx.getImageData(0, 0, 16, 16);
        let wr = 0, wg = 0, wb = 0, totalWeight = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const lightness = (max + min) / 2;
          if (lightness > 230 || lightness < 20) continue; // skip near-white / near-black
          const sat = max === min ? 0
            : (max - min) / (lightness < 128 ? (max + min) : (510 - max - min));
          if (sat < 0.15) continue; // skip near-grey
          wr += r * sat; wg += g * sat; wb += b * sat;
          totalWeight += sat;
        }

        if (totalWeight === 0) { resolve(null); return; }
        const r = Math.round(wr / totalWeight);
        const g = Math.round(wg / totalWeight);
        const b = Math.round(wb / totalWeight);
        resolve(`rgb(${r},${g},${b})`);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}
