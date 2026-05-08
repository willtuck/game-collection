import { useRef, useEffect, useState, useCallback } from 'react';
import { isoProject, drawCell, drawCellShell, drawCellGames, drawTopGames, pointInPoly, getRotation, setRotation, rightFaceVisible } from '../../lib/rendering';
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
  /** When provided, cell clicks call this instead of zooming into the canvas */
  onCellClick?: (cellIndex: number) => void;
  /** Force a persistent hover highlight on this cell index */
  highlightCellIdx?: number;
}

const AZ_MIN = -Math.PI - Math.PI / 4;
const AZ_MAX = -Math.PI + Math.PI / 4;

interface DragState {
  startX: number;
  startAz: number;
  moved: boolean;
}

export function ShelfCanvas({ cellPacked, cols, rows, searchTerm, topPacked = [], cellDims, onCellClick, highlightCellIdx }: KallaxCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const hitRef       = useRef<HitRegion[]>([]);
  const dragRef      = useRef<DragState | null>(null);

  const [tooltip,        setTooltip]        = useState<{ name: string; x: number; y: number } | null>(null);
  const [tapHighlight,   setTapHighlight]   = useState('');
  const [zoomedCellIdx,  setZoomedCellIdx]  = useState<number | null>(null);
  const [hoveredCellIdx, setHoveredCellIdx] = useState<number | null>(null);
  const [cw,      setCw]      = useState(0);
  const [ch,      setCh]      = useState(0);
  const [azimuth, setAzimuth] = useState(() => getRotation().kAzimuth);
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

  // Responsive size — observe the .canvasArea parent (the stable flex container)
  useEffect(() => {
    const wrap = containerRef.current;
    const area = wrap?.parentElement;
    if (!area) return;
    const measure = () => {
      setCw(area.clientWidth);
      setCh(area.clientHeight);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(area);
    measure();
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const canvasH = ch > 0 ? ch : Math.min(cw * 0.85, 480);

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
      const { proj } = isoProject(allCorners, cw, canvasH, 8);
      const allHits: HitRegion[] = [];

      const showRight = rightFaceVisible();

      // Pass 1: draw ALL cell shells (opaque walls) first
      for (let r = 0; r < rows; r++) {
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const c = showRight ? (cols - 1 - cIdx) : cIdx;
          drawCellShell(ctx, proj, r * KH, c * KW, dims);
        }
      }

      // Pass 2: draw ALL games on top of all walls
      for (let r = 0; r < rows; r++) {
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const c = showRight ? (cols - 1 - cIdx) : cIdx;
          const i = (rows - 1 - r) * cols + (cols - 1 - c);
          allHits.push(...drawCellGames(ctx, proj, r * KH, cellPacked[i] ?? [], c * KW, effectiveSearch, hoveredCellIdx === i || highlightCellIdx === i, i, dims));
        }
      }

      // Pass 3: draw opaque panels — internal dividers + outer shell
      // These cover internal cell edges so the unit looks like solid furniture
      const oFace = (pts: [number,number][], fill: string) => {
        ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(...p) : ctx.lineTo(...p));
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      };
      const oEdge = (p1: [number,number], p2: [number,number], col: string, lw: number) => {
        ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2);
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash([]); ctx.stroke();
      };

      // Outer near-side wall (full-height)
      if (showRight) {
        const r0 = proj(totalW, 0, 0), r1 = proj(totalW, 0, KD);
        const r2 = proj(totalW, totalH, KD), r3 = proj(totalW, totalH, 0);
        oFace([r0, r1, r2, r3], '#B8B0A4');
        oEdge(r0, r1, '#B8A898', 1.5); oEdge(r1, r2, '#B8A898', 1.5);
        oEdge(r2, r3, '#B8A898', 1.5); oEdge(r3, r0, '#B8A898', 1.5);
      } else {
        const l0 = proj(0, 0, 0), l1 = proj(0, 0, KD);
        const l2 = proj(0, totalH, KD), l3 = proj(0, totalH, 0);
        oFace([l0, l1, l2, l3], '#B8B0A4');
        oEdge(l0, l1, '#B8A898', 1.5); oEdge(l1, l2, '#B8A898', 1.5);
        oEdge(l2, l3, '#B8A898', 1.5); oEdge(l3, l0, '#B8A898', 1.5);
      }
      // Outer top panel
      const t0 = proj(0, totalH, 0), t1 = proj(totalW, totalH, 0);
      const t2 = proj(totalW, totalH, KD), t3 = proj(0, totalH, KD);
      oFace([t0, t1, t2, t3], '#C2BAB0');
      oEdge(t0, t1, '#B8A898', 1.5); oEdge(t1, t2, '#B8A898', 1.5);
      oEdge(t2, t3, '#B8A898', 1.5); oEdge(t3, t0, '#B8A898', 1.5);

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
          ctx.fillStyle = 'rgba(74,124,101,0.50)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(74,124,101,0.80)';
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
  }, [cellPacked, cols, rows, effectiveSearch, cw, ch, canvasH, azimuth, zoomedCellIdx, hoveredCellIdx, highlightCellIdx, topPacked, topCellIdx, dims, KW, KH, KD]);

  const testHit = useCallback((x: number, y: number, r: HitRegion): boolean => {
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
          if (onCellClick) {
            onCellClick(cellIdx);
          } else {
            setZoomedCellIdx(cellIdx);
          }
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
