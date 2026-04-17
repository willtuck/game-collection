import type { Game } from './types';

export function hasDims(g: Game): boolean {
  return !!(
    g.width && g.height && g.depth &&
    parseFloat(g.width) > 0 &&
    parseFloat(g.height) > 0 &&
    parseFloat(g.depth) > 0
  );
}

export function toCm(val: string, unit: 'cm' | 'in'): string | null {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return null;
  return unit === 'in' ? (n * 2.54).toFixed(1) : n.toFixed(1);
}

export function fmtDims(g: Game): string {
  const u = g.unit || 'cm';
  const cv = (v: string) => u === 'in' ? (parseFloat(v) / 2.54).toFixed(1) : v;
  return `${cv(g.width!)} × ${cv(g.height!)} × ${cv(g.depth!)} ${u}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function kuGrid(model: string): [number, number] {
  const map: Record<string, [number, number]> = {
    '1x1': [1,1], '1x2': [1,2], '2x1': [2,1], '1x4': [1,4], '4x1': [4,1],
    '2x2': [2,2], '2x4': [2,4], '4x2': [4,2], '4x4': [4,4], '5x5': [5,5],
  };
  return map[model] ?? [2, 4];
}

export function kuLabel(model: string): string {
  const labels: Record<string, string> = {
    '1x1': '1×1', '1x2': '1×2 tall', '2x1': '1×2 wide',
    '1x4': '1×4 tall', '4x1': '1×4 wide', '2x2': '2×2',
    '2x4': '2×4 tall', '4x2': '2×4 wide', '4x4': '4×4', '5x5': '5×5',
  };
  return labels[model] ?? model;
}
