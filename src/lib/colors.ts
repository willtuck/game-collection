import type { GameColor } from './types';

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn)      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else                 h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  function hue2rgb(t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

// Very pale tint: same hue, saturation capped at 35%, lightness at 93%
function lightenRgb(r: number, g: number, b: number): string {
  const [h, s] = rgbToHsl(r, g, b);
  const [lr, lg, lb] = hslToRgb(h, Math.min(s, 0.35), 0.93);
  return `rgb(${lr},${lg},${lb})`;
}

// Medium tint: same hue, mostly original saturation, lightness at 78%
function midRgb(r: number, g: number, b: number): string {
  const [h, s] = rgbToHsl(r, g, b);
  const [mr, mg, mb] = hslToRgb(h, Math.min(s, 0.70), 0.78);
  return `rgb(${mr},${mg},${mb})`;
}

function parseRgb(fill: string): [number, number, number] {
  const m = fill.match(/rgba?\((\d+),(\d+),(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128];
}

const BASE_COLORS = [
  { fill: 'rgba(110,160,140,1)', stroke: '#2B4C3F' },
  { fill: 'rgba(130,185,160,1)', stroke: '#4A7C65' },
  { fill: 'rgba(195,150,90,1)',  stroke: '#7A4F1E' },
  { fill: 'rgba(120,155,200,1)', stroke: '#3A5A9A' },
  { fill: 'rgba(160,120,180,1)', stroke: '#6B3D7A' },
  { fill: 'rgba(210,140,100,1)', stroke: '#A05028' },
  { fill: 'rgba(100,170,190,1)', stroke: '#286478' },
  { fill: 'rgba(90,170,170,1)',  stroke: '#1C6464' },
];

const GAME_COLORS: GameColor[] = BASE_COLORS.map(c => {
  const [r, g, b] = parseRgb(c.fill);
  return { ...c, light: lightenRgb(r, g, b), mid: midRgb(r, g, b) };
});

const gameColorMap: Record<string, number> = {};
let gameColorCounter = 0;

function colorFromAccent(rgb: string): GameColor {
  const [r, g, b] = parseRgb(rgb);
  return {
    fill:   `rgba(${r},${g},${b},1)`,
    stroke: `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.55)},${Math.round(b * 0.55)})`,
    light:  lightenRgb(r, g, b),
    mid:    midRgb(r, g, b),
  };
}

export function gameColor(id: string, accentColor?: string): GameColor {
  if (accentColor) return colorFromAccent(accentColor);
  if (!(id in gameColorMap)) {
    gameColorMap[id] = gameColorCounter++ % GAME_COLORS.length;
  }
  return GAME_COLORS[gameColorMap[id]];
}
