import { useRef, useEffect, useState, useCallback } from 'react';
import { isoProject, drawCell, pointInPoly, getRotation, setRotation } from '../../lib/rendering';
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

// Azimuth limits: keep cos(az) < 0 so the painter's draw order stays correct.
// ±1.1 rad (~63°) from the default of -2.36 gives symmetric left/right travel
// without flipping to a back-facing view.
const AZ_MIN = -Math.PI - Math.PI / 4;  // 45° left of front
const AZ_MAX = -Math.PI + Math.PI / 4;  // 45° right of front

interface DragState {
  startX: number;
  startAz: number;
  moved: boolean;
}

export function KallaxCanvas({ cellPacked, cols, rows, searchTerm }: KallaxCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const hitRef       = useRef<HitRegion[]>([]);
  const dragRef      = useRef<DragState | null>(null);

  const [tooltip,  setTooltip]  = useState<{ name: string; x: number; y: number } | null>(null);
  const [cw,       setCw]       = useState(0);
  const [azimuth,  setAzimuth]  = useState(() => getRotation().kAzimuth);
  const [dragging, setDragging] = useState(false);

  // Responsive width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(e => setCw(e[0].contentRect.width));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const canvasH = Math.min(cw * 0.85, 480);

  // Render (re-runs whenever azimuth changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cw <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = cw * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width  = `${cw}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, canvasH);

    const { w: KW, h: KH, d: KD } = KALLAX;
    const totalW = cols * KW;
    const totalH = rows * KH;
    const allCorners: [number, number, number][] = [
      [0, 0, 0],      [totalW, 0, 0],      [totalW, 0, KD],      [0, 0, KD],
      [0, totalH, 0], [totalW, totalH, 0], [totalW, totalH, KD], [0, totalH, KD],
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
  }, [cellPacked, cols, rows, searchTerm, cw, canvasH, azimuth]);

  const findHit = useCallback((x: number, y: number) =>
    hitRef.current.find(r => pointInPoly(x, y, r.poly)) ?? null,
  []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startAz: getRotation().kAzimuth, moved: false };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (drag) {
      const delta = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(delta) > 4) {
        drag.moved = true;
        setDragging(true);
        setTooltip(null);
      }
      if (drag.moved) {
        const newAz = Math.max(AZ_MIN, Math.min(AZ_MAX, drag.startAz + delta * 0.009));
        setRotation(newAz, getRotation().kElevation);
        setAzimuth(newAz);
        return;
      }
    }

    // Hover tooltip (mouse only)
    if (e.pointerType === 'mouse' && !drag?.moved) {
      const rect = e.currentTarget.getBoundingClientRect();
      const hit  = findHit(e.clientX - rect.left, e.clientY - rect.top);
      setTooltip(hit ? { name: hit.name, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
    }
  }, [findHit]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);

    if (!drag?.moved) {
      // Tap — show tooltip briefly
      const rect = e.currentTarget.getBoundingClientRect();
      const hit  = findHit(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) {
        setTooltip({ name: hit.name, x: e.clientX - rect.left, y: e.clientY - rect.top });
        setTimeout(() => setTooltip(null), 1400);
      } else {
        setTooltip(null);
      }
    }
  }, [findHit]);

  return (
    <div
      ref={containerRef}
      className={styles.wrap}
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => { if (!dragRef.current?.moved) setTooltip(null); }}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(tooltip.x + 10, cw - 30),
            top:  Math.max(tooltip.y - 34, 4),
          }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
