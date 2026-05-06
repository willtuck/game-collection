const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Extracts a dominant accent color from an image URL. Routes through the
 * bgg-proxy edge function so the response has CORS headers and the canvas
 * won't be tainted by cross-origin restrictions.
 * Skips near-white, near-black, and low-saturation pixels so the result is
 * a vivid representative hue rather than a muddy average.
 * Returns null on failure or if no suitable pixels are found.
 */
export async function extractDominantColor(url: string): Promise<string | null> {
  try {
    const proxyUrl = `${PROXY}?imageUrl=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    return new Promise(resolve => {
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
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
            if (lightness > 230 || lightness < 20) continue;
            const sat = max === min ? 0
              : (max - min) / (lightness < 128 ? (max + min) : (510 - max - min));
            if (sat < 0.15) continue;
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

      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null); };
      img.src = blobUrl;
    });
  } catch {
    return null;
  }
}
