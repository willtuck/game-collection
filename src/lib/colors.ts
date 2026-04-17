import type { GameColor } from './types';

const GAME_COLORS: GameColor[] = [
  { fill: 'rgba(43,76,63,0.18)',   stroke: '#2B4C3F' },
  { fill: 'rgba(74,124,101,0.18)', stroke: '#4A7C65' },
  { fill: 'rgba(122,79,30,0.15)',  stroke: '#7A4F1E' },
  { fill: 'rgba(74,100,155,0.15)', stroke: '#3A5A9A' },
  { fill: 'rgba(100,60,120,0.15)', stroke: '#6B3D7A' },
  { fill: 'rgba(160,80,40,0.15)',  stroke: '#A05028' },
  { fill: 'rgba(40,100,120,0.15)', stroke: '#286478' },
  { fill: 'rgba(28,100,100,0.15)', stroke: '#1C6464' },
];

const gameColorMap: Record<string, number> = {};
let gameColorCounter = 0;

export function gameColor(id: string): GameColor {
  if (!(id in gameColorMap)) {
    gameColorMap[id] = gameColorCounter++ % GAME_COLORS.length;
  }
  return GAME_COLORS[gameColorMap[id]];
}
