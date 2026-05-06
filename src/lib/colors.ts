import type { GameColor } from './types';

const GAME_COLORS: GameColor[] = [
  { fill: 'rgba(110,160,140,1)', stroke: '#2B4C3F' },
  { fill: 'rgba(130,185,160,1)', stroke: '#4A7C65' },
  { fill: 'rgba(195,150,90,1)',  stroke: '#7A4F1E' },
  { fill: 'rgba(120,155,200,1)', stroke: '#3A5A9A' },
  { fill: 'rgba(160,120,180,1)', stroke: '#6B3D7A' },
  { fill: 'rgba(210,140,100,1)', stroke: '#A05028' },
  { fill: 'rgba(100,170,190,1)', stroke: '#286478' },
  { fill: 'rgba(90,170,170,1)',  stroke: '#1C6464' },
];

const gameColorMap: Record<string, number> = {};
let gameColorCounter = 0;

function colorFromAccent(rgb: string): GameColor {
  const m = rgb.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!m) return GAME_COLORS[0];
  const [r, g, b] = [+m[1], +m[2], +m[3]];
  return {
    fill:   `rgba(${r},${g},${b},1)`,
    stroke: `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.55)},${Math.round(b * 0.55)})`,
  };
}

export function gameColor(id: string, accentColor?: string): GameColor {
  if (accentColor) return colorFromAccent(accentColor);
  if (!(id in gameColorMap)) {
    gameColorMap[id] = gameColorCounter++ % GAME_COLORS.length;
  }
  return GAME_COLORS[gameColorMap[id]];
}
