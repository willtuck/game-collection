import { useRef, useEffect, useState, useCallback } from 'react';
import { isoProject, drawCell, pointInPoly } from '../../lib/rendering';
import { KALLAX } from '../../lib/packing';
import type { HitRegion } from '../../lib/rendering';
import type { PackedGame } from '../../lib/types';
import styles from './KallaxCanvas.module.css';

interface KallaxCanvasProps {
  cellPacked: PackedGame[][];
  cols: number;
  rows: number;
  searchTerm: string;
}

export function KallaxCanvas({ cellPacked, cols, rows, searchTerm }: KallaxCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitRef = useRef<HitRegion[]>([]);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const [cw, setCw] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(e => setCw(e[0].contentRect.width));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const canvasH = Math.min(cw * 0.85, 480);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cw <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cw * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, canvasH);

    const { w: KW, h: KH, d: KD } = KALLAX;
    const totalW = cols * KW;
    const totalH = rows * KH;
    const allCorners: [number, number, number][] = [
      [0, 0, 0],       [totalW, 0, 0],       [totalW, 0, KD],       [0, 0, KD],
      [0, totalH, 0],  [totalW, totalH, 0],  [totalW, totalH, KD],  [0, totalH, KD],
    ];
    const { proj } = isoProject(allCorners, cw, canvasH, 20);

    const allHits: HitRegion[] = [];
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const hits = drawCell(ctx, proj, row * KH, cellPacked[i] ?? [], col * KW, searchTerm);
      allHits.push(...hits);
    }
    hitRef.current = allHits;
  }, [cellPacked, cols, rows, searchTerm, cw, canvasH]);

  const findHit = useCallback((x: number, y: number) => {
    return hitRef.current.find(r => pointInPoly(x, y, r.poly)) ?? null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = findHit(x, y);
    setTooltip(hit ? { name: hit.name, x, y } : null);
  }, [findHit]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    const hit = findHit(x, y);
    setTooltip(hit ? { name: hit.name, x, y } : null);
  }, [findHit]);

  return (
    <div
      ref={containerRef}
      className={styles.wrap}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
      onTouchStart={handleTouchStart}
      onTouchEnd={() => setTimeout(() => setTooltip(null), 1400)}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(tooltip.x + 10, cw - 168),
            top: Math.max(tooltip.y - 34, 4),
          }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
