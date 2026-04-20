import { useRef, useEffect, useState, useCallback } from 'react';
import { isoProject, drawCell, drawTopGames, pointInPoly, getRotation, setRotation } from '../../lib/rendering';
import { KALLAX } from '../../lib/packing';
import type { HitRegion } from '../../lib/rendering';
import type { PackedGame } from '../../lib/types';
import styles from './KallaxCanvas.module.css';

interface KallaxCanvasProps {
  cellPacked: PackedGame[][];
  cols: number;
  rows: number;
  searchTerm: string;
  topPacked?: PackedGame[];
  cellDims?: { w: number; h: number; d: number };
}

const AZ_MIN = -Math.PI - Math.PI / 4;
const AZ_MAX = -Math.PI + Math.PI / 4;

interface DragState {
  startX: number;
  startAz: number;
  moved: boolean;
}

export function KallaxCanvas({ cellPacked, cols, rows, searchTerm, topPacked = [], cellDims }: KallaxCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const hitRef       = useRef<HitRegion[]>([]);
  const dragRef      = useRef<DragState | null>(null);

  const [tooltip,        setTooltip]        = useState<{ name: string; x: number; y: number } | null>(null);
  const [tapHighlight,   setTapHighlight]   = useState('');
  const [zoomedCellIdx,  setZoomedCellIdx]  = useState<number | null>(null);
  const [hoveredCellIdx, setHoveredCellIdx] = useState<number | null>(null);
  const [cw,             setCw]             = useState(0);
  const [azimuth,        setAzimuth]        = useState(() => getRotation().kAzimuth);
  const [dragging,       setDragging]       = useState(false);

  // Use provided dims or fall back to standard KALLAX dims
  const dims = cellDims ?? KALLAX;
  const { w: KW, h: KH, d: KD } = dims;

  // Index used for the virtual "top cell" — one beyond the last real cell
  const topCellIdx = cols * rows;

  // Search field takes over — clear tap highlight
  useEffect(() => { if (searchTerm) setTapHighlight(''); }, [searchTerm]);

  // Zoom resets highlight, tooltip, and cell hover
  useEffect(() => {
    setTapHighlight('');
    setTooltip(null);
    setHoveredCellIdx(null);
  }, [zoomedCellIdx]);

  const effectiveSearch = tapHighlight || searchTerm;

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

  // Render
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

    const totalW = cols * KW;
    const totalH = rows * KH;

    if (zoomedCellIdx !== null) {
      if (zoomedCellIdx === topCellIdx) {
        // ── Zoomed top view ──
        const topMaxY = topPacked.length > 0
          ? Math.max(...topPacked.map(g => g.yOffset + (g._thickness ?? 0)))
          : totalH + 1;
        const topCorners: [number, number, number][] = [
          [0,      totalH,  0  ], [totalW, totalH,  0  ], [totalW, totalH,  KD ], [0,      totalH,  KD ],
          [0,      topMaxY, 0  ], [totalW, topMaxY, 0  ], [totalW, topMaxY, KD ], [0,      topMaxY, KD ],
        ];
        const { proj } = isoProject(topCorners, cw, canvasH, 24);
        hitRef.current = drawTopGames(ctx, proj, topPacked, effectiveSearch, dims);
      } else {
        // ── Zoomed: single cell fills the canvas ──
        const col   = cols - 1 - (zoomedCellIdx % cols);
        const row   = rows - 1 - Math.floor(zoomedCellIdx / cols);
        const cellX = col * KW;
        const cellY = row * KH;
        const singleCorners: [number, number, number][] = [
          [cellX,      cellY,      0  ], [cellX + KW, cellY,      0  ],
          [cellX + KW, cellY,      KD ], [cellX,      cellY,      KD ],
          [cellX,      cellY + KH, 0  ], [cellX + KW, cellY + KH, 0  ],
          [cellX + KW, cellY + KH, KD ], [cellX,      cellY + KH, KD ],
        ];
        const { proj } = isoProject(singleCorners, cw, canvasH, 24);
        hitRef.current = drawCell(ctx, proj, cellY, cellPacked[zoomedCellIdx] ?? [], cellX, effectiveSearch, false, zoomedCellIdx, dims);
      }
    } else {
      // ── Full unit ──
      const topMaxY = topPacked.length > 0
        ? Math.max(...topPacked.map(g => g.yOffset + (g._thickness ?? 0)))
        : totalH;
      const topExtra = Math.max(0, topMaxY - totalH);
      const allCorners: [number, number, number][] = [
        [0, -topExtra, 0  ], [totalW, -topExtra, 0  ], [totalW, -topExtra, KD ], [0, -topExtra, KD ],
        [0, topMaxY,   0  ], [totalW, topMaxY,   0  ], [totalW, topMaxY,   KD ], [0, topMaxY,   KD ],
      ];
      const { proj } = isoProject(allCorners, cw, canvasH, 20);
      const allHits: HitRegion[] = [];

      for (let r = 0; r < rows; r++) {
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const c = cols - 1 - cIdx;
          const i = (rows - 1 - r) * cols + (cols - 1 - c);
          allHits.push(...drawCell(ctx, proj, r * KH, cellPacked[i] ?? [], c * KW, effectiveSearch, hoveredCellIdx === i, i, dims));
        }
      }

      allHits.push(...drawTopGames(ctx, proj, topPacked, effectiveSearch, dims));

      if (topPacked.length > 0) {
        const topFront: [number, number][] = [
          proj(0,      totalH,  0),
          proj(totalW, totalH,  0),
          proj(totalW, topMaxY, 0),
          proj(0,      topMaxY, 0),
        ];

        if (hoveredCellIdx === topCellIdx) {
          ctx.beginPath();
          topFront.forEach((p, i) => i === 0 ? ctx.moveTo(...p) : ctx.lineTo(...p));
          ctx.closePath();
          ctx.fillStyle = 'rgba(74,124,101,0.10)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(74,124,101,0.40)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.stroke();
        }

        allHits.push({
          id: '__top_cell',
          name: '',
          poly: topFront,
          frontPoly: topFront,
          isCell: true,
          cellIndex: topCellIdx,
        });
      }

      hitRef.current = allHits;
    }
  }, [cellPacked, cols, rows, effectiveSearch, cw, canvasH, azimuth, zoomedCellIdx, hoveredCellIdx, topPacked, topCellIdx, dims, KW, KH, KD]);

  const testHit = useCallback((x: number, y: number, r: HitRegion): boolean => {
    if (r.polys) return r.polys.some(p => pointInPoly(x, y, p));
    return pointInPoly(x, y, r.poly);
  }, []);

  const findHit = useCallback((x: number, y: number): HitRegion | null => {
    const gameHit = hitRef.current.find(r => !r.isCell && testHit(x, y, r));
    if (gameHit) return gameHit;
    return hitRef.current.find(r => r.isCell && testHit(x, y, r)) ?? null;
  }, [testHit]);

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

    if (e.pointerType === 'mouse' && !drag?.moved) {
      const rect = e.currentTarget.getBoundingClientRect();
      const hit  = findHit(e.clientX - rect.left, e.clientY - rect.top);
      if (hit && !hit.isCell) {
        setTooltip({ name: hit.name, x: e.clientX - rect.left, y: e.clientY - rect.top });
        if (zoomedCellIdx === null) {
          const ci = (hitRef.current as HitRegion[]).find(r => r.isCell && pointInPoly(e.clientX - rect.left, e.clientY - rect.top, r.poly));
          setHoveredCellIdx(ci?.cellIndex ?? null);
        }
      } else if (hit?.isCell) {
        setTooltip(null);
        setHoveredCellIdx(hit.cellIndex ?? null);
      } else {
        setTooltip(null);
        setHoveredCellIdx(null);
      }
    }
  }, [findHit, zoomedCellIdx]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);

    if (drag?.moved) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const hit  = findHit(e.clientX - rect.left, e.clientY - rect.top);

    if (zoomedCellIdx !== null) {
      if (hit && !hit.isCell) {
        if (e.pointerType !== 'mouse') {
          const nameLower = hit.name.toLowerCase();
          setTapHighlight(prev => prev === nameLower ? '' : nameLower);
        }
        setTooltip({ name: hit.name, x: e.clientX - rect.left, y: e.clientY - rect.top });
        setTimeout(() => setTooltip(null), 1400);
      } else {
        setZoomedCellIdx(null);
      }
    } else {
      if (hit) {
        const cellIdx = hit.isCell
          ? (hit.cellIndex ?? null)
          : (() => {
              const idx = cellPacked.findIndex(cell => cell.some(g => g.id === hit.id));
              if (idx >= 0) return idx;
              if (topPacked.some(g => g.id === hit.id)) return topCellIdx;
              return null;
            })();
        if (cellIdx !== null && cellIdx !== -1) {
          setZoomedCellIdx(cellIdx);
          setHoveredCellIdx(null);
        }
      }
    }
  }, [findHit, zoomedCellIdx, cellPacked, topPacked, topCellIdx]);

  return (
    <div
      ref={containerRef}
      className={styles.wrap}
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && !dragRef.current?.moved) {
          setTooltip(null);
          setHoveredCellIdx(null);
        }
      }}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={`Isometric view of ${cols}×${rows} shelving unit`}
      />

      {zoomedCellIdx !== null && (
        <button
          className={styles.backBtn}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setZoomedCellIdx(null)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All cells
        </button>
      )}

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
