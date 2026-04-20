import type { PackedGame, GameColor } from './types';
import { KALLAX } from './packing';
import { gameColor } from './colors';

/* ── Projection ── */

let kAzimuth   = -Math.PI + Math.PI / 8;  // ~22° right of front
let kElevation =  0.52;

export function getRotation() { return { kAzimuth, kElevation }; }
export function setRotation(az: number, el: number) {
  kAzimuth = az;
  kElevation = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, el));
}

export interface IsoProjection {
  proj: (x: number, y: number, z: number) => [number, number];
  scale: number;
}

export function isoProject(
  corners3d: [number, number, number][],
  CW: number,
  CH: number,
  pad: number,
): IsoProjection {
  const az = kAzimuth, el = kElevation;
  const cosAz = Math.cos(az), sinAz = Math.sin(az);
  const cosEl = Math.cos(el), sinEl = Math.sin(el);

  function projRaw(x: number, y: number, z: number, sc: number): [number, number] {
    const rx =  x * cosAz + z * sinAz;
    const ry =  y;
    const rz = -x * sinAz + z * cosAz;
    const fx =  rx;
    const fy =  ry * cosEl - rz * sinEl;
    return [fx * sc, -fy * sc];
  }

  const raw1 = corners3d.map(([x,y,z]) => projRaw(x, y, z, 1));
  const xs1 = raw1.map(p => p[0]), ys1 = raw1.map(p => p[1]);
  const rw = Math.max(...xs1) - Math.min(...xs1);
  const rh = Math.max(...ys1) - Math.min(...ys1);
  const scale = Math.min((CW - pad * 2) / Math.max(rw, 1), (CH - pad * 2) / Math.max(rh, 1)) * 0.98;

  const raw = corners3d.map(([x,y,z]) => projRaw(x, y, z, scale));
  const xs = raw.map(p => p[0]), ys = raw.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const ox = (CW - (maxX - minX)) / 2 - minX;
  const oy = (CH - (maxY - minY)) / 2 - minY;

  function proj(x: number, y: number, z: number): [number, number] {
    const [rx, ry] = projRaw(x, y, z, scale);
    return [rx + ox, ry + oy];
  }
  return { proj, scale };
}

/* ── Hit regions ── */

export interface HitRegion {
  id: string;
  name: string;
  poly: [number, number][];
  frontPoly: [number, number][];
  isCell?: boolean;
  isPlacedGame?: boolean;
  unitId?: string;
  cellIndex?: number;
}


export function pointInPoly(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/* ── Box wireframe (game card preview) ── */

export function drawBox(
  canvas: HTMLCanvasElement,
  w: number, h: number, d: number,
  col: GameColor = { fill: 'rgba(74,124,101,0.10)', stroke: '#4A7C65' },
): void {
  const ctx = canvas.getContext('2d')!;
  const CW = canvas.width, CH = canvas.height;
  ctx.clearRect(0, 0, CW, CH);

  const ang = Math.PI / 6;
  const cosA = Math.cos(ang), sinA = Math.sin(ang);

  function projRaw(x: number, y: number, z: number, sc: number): [number, number] {
    return [(x - z) * cosA * sc, -(y * sc) + (x + z) * sinA * sc];
  }

  const corners3d: [number, number, number][] = [
    [0,0,0],[w,0,0],[w,0,h],[0,0,h],
    [0,d,0],[w,d,0],[w,d,h],[0,d,h],
  ];

  const pad = 30;
  const rawPts1 = corners3d.map(([x,y,z]) => projRaw(x, y, z, 1));
  const xs1 = rawPts1.map(p => p[0]), ys1 = rawPts1.map(p => p[1]);
  const rw = Math.max(...xs1) - Math.min(...xs1);
  const rh = Math.max(...ys1) - Math.min(...ys1);
  const scale = Math.min((CW - pad * 2) / rw, (CH - pad * 2) / rh) * 0.92;

  const rawPts = corners3d.map(([x,y,z]) => projRaw(x, y, z, scale));
  const xs = rawPts.map(p => p[0]), ys = rawPts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const ox = (CW - (maxX - minX)) / 2 - minX;
  const oy = (CH - (maxY - minY)) / 2 - minY;
  const P = rawPts.map(([x,y]): [number, number] => [x + ox, y + oy]);

  function proj(x: number, y: number, z: number): [number, number] {
    const [rx, ry] = projRaw(x, y, z, scale);
    return [rx + ox, ry + oy];
  }

  const E = col.stroke, Eh = '#C5BEB2';
  const fillBase = col.fill.replace(/[\d.]+\)$/, '');
  function fillAt(a: number) { return fillBase + a + ')'; }

  function face(idx: number[], fill: string) {
    ctx.beginPath();
    idx.forEach((i, n) => n === 0 ? ctx.moveTo(...P[i]) : ctx.lineTo(...P[i]));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function edge(a: number, b: number, hidden: boolean) {
    ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]);
    ctx.strokeStyle = hidden ? Eh : E;
    ctx.lineWidth   = hidden ? 1 : 1.5;
    ctx.setLineDash(hidden ? [3, 3] : []);
    ctx.stroke(); ctx.setLineDash([]);
  }

  face([3,7,6,2], fillAt(0.05));
  face([0,3,7,4], fillAt(0.05));
  face([2,6,5,1], fillAt(0.06));
  face([0,1,2,3], fillAt(0.03));
  face([0,1,5,4], fillAt(0.08));
  face([4,5,6,7], fillAt(0.14));

  edge(3, 0, true); edge(3, 2, true); edge(0, 1, true);
  edge(4, 5, false); edge(5, 6, false); edge(6, 7, false); edge(7, 4, false);
  edge(4, 0, false); edge(5, 1, false); edge(6, 2, false); edge(7, 3, false);
  edge(1, 2, false);

  ctx.font = "10px 'DM Mono', monospace";
  ctx.fillStyle = col.stroke; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const wm = proj(w / 2, d, 0);  ctx.fillText('W', wm[0], wm[1] - 9);
  const lm = proj(w, d, h / 2);  ctx.fillText('L', lm[0] + 11, lm[1]);
  const dm = proj(0, d / 2, 0);  ctx.fillText('D', dm[0] - 10, dm[1]);
}

/* ── Shared game box renderer ── */

/**
 * Draws a game box given 8 projected 2D screen corners.
 * Returns the 3 non-back side face polygons for hit testing.
 */
function renderGameBox(
  ctx: CanvasRenderingContext2D,
  P: [number, number][],
  col: GameColor,
  isMatch: boolean,
  isDimmed: boolean,
): { faceFront: [number,number][]; faceRight: [number,number][]; faceLeft: [number,number][] } {
  function gFace(idx: number[], fill: string) {
    ctx.beginPath(); idx.forEach((i, n) => n === 0 ? ctx.moveTo(...P[i]) : ctx.lineTo(...P[i]));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function gEdge(a: number, b: number, color: string, lw: number, dash?: number[]) {
    ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]);
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.setLineDash(dash ?? []); ctx.stroke(); ctx.setLineDash([]);
  }

  // Only draw the 3 visible faces: right side, front, and top
  if (isDimmed) {
    const dimFill = 'rgba(160,152,140,0.08)';
    gFace([1,2,6,5], dimFill); // right
    gFace([0,1,5,4], dimFill); // front
    gFace([4,5,6,7], dimFill); // top
    [[4,5],[5,6],[6,7],[7,4],[4,0],[5,1],[6,2],[1,2]].forEach(([a,b]) => {
      gEdge(a, b, 'rgba(160,152,140,0.2)', 0.75);
    });
  } else {
    const baseFill = col.fill.replace(/[\d.]+\)$/, isMatch ? '0.85)' : '0.70)');
    const sideFill = col.fill.replace(/[\d.]+\)$/, isMatch ? '0.75)' : '0.55)');
    const topFill  = col.fill.replace(/[\d.]+\)$/, isMatch ? '0.90)' : '0.80)');

    gFace([1,2,6,5], sideFill); // right
    gFace([0,1,5,4], baseFill); // front
    gFace([4,5,6,7], topFill);  // top

    // Visible edges
    [[4,5],[5,6],[6,7],[7,4],[4,0],[5,1],[6,2],[1,2]].forEach(([a,b]) => {
      gEdge(a, b, col.stroke, isMatch ? 2 : 1.25);
    });
    if (isMatch) {
      ctx.beginPath();
      [4,5,6,7,4].forEach((i, n) => n === 0 ? ctx.moveTo(...P[i]) : ctx.lineTo(...P[i]));
      ctx.strokeStyle = col.stroke; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();
    }
  }
  return {
    faceFront: [P[0],P[1],P[5],P[4]],
    faceRight: [P[1],P[2],P[6],P[5]],
    faceLeft:  [P[0],P[3],P[7],P[4]],
  };
}

/* ── Kallax cell renderer ── */

export function drawCell(
  ctx: CanvasRenderingContext2D,
  proj: (x: number, y: number, z: number) => [number, number],
  yBase: number,
  packedGames: PackedGame[],
  xBase = 0,
  searchTerm = '',
  hovered = false,
  cellIdx?: number,
  dims = KALLAX,
): HitRegion[] {
  const { w: KW, h: KH, d: KD } = dims;
  const hitRegions: HitRegion[] = [];

  function kFace(pts: [number, number][], fill: string) {
    ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(...p) : ctx.lineTo(...p));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function kEdge(p1: [number,number], p2: [number,number], col: string, lw: number, dash?: number[]) {
    ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2);
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.setLineDash(dash ?? []); ctx.stroke(); ctx.setLineDash([]);
  }

  const c = [
    proj(xBase,    yBase,    0),  proj(xBase+KW, yBase,    0),
    proj(xBase+KW, yBase,    KD), proj(xBase,    yBase,    KD),
    proj(xBase,    yBase+KH, 0),  proj(xBase+KW, yBase+KH, 0),
    proj(xBase+KW, yBase+KH, KD), proj(xBase,    yBase+KH, KD),
  ];

  // Phase 1: draw faces BEHIND the games (back wall, far-side divider, bottom)
  kFace([c[3],c[7],c[6],c[2]], '#5C5449');                  // back wall (opaque)
  kFace([c[0],c[3],c[7],c[4]], 'rgba(180,172,160,0.65)');  // left divider (far side)
  kFace([c[0],c[1],c[2],c[3]], 'rgba(180,172,160,0.70)');  // bottom shelf
  // back edges
  kEdge(c[3],c[7],'#3E3A33',2); kEdge(c[7],c[6],'#3E3A33',2);
  kEdge(c[6],c[2],'#3E3A33',2); kEdge(c[2],c[3],'#3E3A33',2);
  [[c[0],c[4]],[c[7],c[3]],[c[6],c[2]],[c[3],c[2]]]
    .forEach(([p1,p2]) => kEdge(p1,p2,'#9A9288',1.5));

  packedGames.forEach(g => {
    const gw = parseFloat(g.width!), gh = parseFloat(g.height!), gd = parseFloat(g.depth!);
    const isMatch = !!searchTerm && g.name.toLowerCase().includes(searchTerm);
    const isDimmed = !!searchTerm && !isMatch;

    let corners: [number, number, number][];
    if (g.mode === 'upright') {
      const xOff = xBase + g.xOffset, yOff = yBase, spineW = gd;
      corners = [
        [xOff,         yOff,    0 ], [xOff+spineW,  yOff,    0 ],
        [xOff+spineW,  yOff,    gw], [xOff,         yOff,    gw],
        [xOff,         yOff+gh, 0 ], [xOff+spineW,  yOff+gh, 0 ],
        [xOff+spineW,  yOff+gh, gw], [xOff,         yOff+gh, gw],
      ];
    } else {
      const thickness = g._thickness ?? Math.min(gw, gh, gd);
      const footW = g._footW ?? (() => { const d=[gw,gh,gd].sort((a,b)=>a-b); return d[1]<=KW?d[1]:d[2]; })();
      const footD = g._footD ?? (() => { const d=[gw,gh,gd].sort((a,b)=>a-b); return d[1]<=KW?d[2]:d[1]; })();
      const yOff = yBase + g.yOffset;
      const xOff = xBase + (KW - footW) / 2;
      const zCenter = (KD - footD) / 2;
      corners = [
        [xOff,       yOff,           zCenter       ], [xOff+footW, yOff,           zCenter       ],
        [xOff+footW, yOff,           zCenter+footD ], [xOff,       yOff,           zCenter+footD ],
        [xOff,       yOff+thickness, zCenter       ], [xOff+footW, yOff+thickness, zCenter       ],
        [xOff+footW, yOff+thickness, zCenter+footD ], [xOff,       yOff+thickness, zCenter+footD ],
      ];
    }

    const P = corners.map(([x,y,z]) => proj(x, y, z));
    const col = gameColor(g.id);
    const { faceFront } = renderGameBox(ctx, P, col, isMatch, isDimmed);
    const frontPoly = g.mode === 'stacked' ? [P[0],P[1],P[5],P[4]] : [P[4],P[5],P[6],P[7]];
    hitRegions.push({
      id: g.id, name: g.name,
      poly: faceFront,
      frontPoly,
    });
  });

  // Phase 2: draw faces IN FRONT of games (right divider, top shelf, front edges)
  kFace([c[1],c[2],c[6],c[5]], 'rgba(160,152,140,0.50)');  // right divider (near side)
  kFace([c[4],c[5],c[6],c[7]], 'rgba(200,194,184,0.25)');  // top shelf
  // front edges
  kEdge(c[0],c[1],'#C5BEB2',1,[3,3]);
  kEdge(c[4],c[5],'#C5BEB2',1,[3,3]);
  kEdge(c[1],c[5],'#C5BEB2',1,[3,3]);
  [[c[0],c[4]],[c[5],c[6]]]
    .forEach(([p1,p2]) => kEdge(p1,p2,'#9A9288',1.5));

  // Desktop hover: subtle accent tint on the front face (the cell opening)
  if (hovered) {
    ctx.beginPath();
    [c[0], c[1], c[5], c[4]].forEach((p, i) => i === 0 ? ctx.moveTo(...p) : ctx.lineTo(...p));
    ctx.closePath();
    ctx.fillStyle = 'rgba(74,124,101,0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,124,101,0.40)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // Cell-level hit region: the front face quad (the opening of the cell).
  // Pushed after game hits so game polygons take precedence in findHit.
  const frontFace: [number, number][] = [c[0], c[1], c[5], c[4]];
  hitRegions.push({
    id: `__cell_${cellIdx ?? 0}`,
    name: '',
    poly: frontFace,
    frontPoly: frontFace,
    isCell: true,
    cellIndex: cellIdx,
  });

  return hitRegions;
}

/* ── Top-of-unit renderer ── */

/**
 * Draws games stacked on top of a Kallax unit (above y=0) and returns their hit regions.
 * Games are always in stacked orientation; positions are absolute (pre-computed by packTop).
 */
export function drawTopGames(
  ctx: CanvasRenderingContext2D,
  proj: (x: number, y: number, z: number) => [number, number],
  topPacked: PackedGame[],
  searchTerm = '',
  dims = KALLAX,
): HitRegion[] {
  const { d: KD } = dims;
  const hitRegions: HitRegion[] = [];

  for (const g of topPacked) {
    const thickness = g._thickness!;
    const footW     = g._footW!;
    const footD     = g._footD!;
    const xOff      = g.xOffset;
    const yOff      = g.yOffset; // top face of the game (negative = above kallax surface)
    const zCenter   = (KD - footD) / 2;

    const corners: [number, number, number][] = [
      [xOff,       yOff,           zCenter       ], [xOff+footW, yOff,           zCenter       ],
      [xOff+footW, yOff,           zCenter+footD ], [xOff,       yOff,           zCenter+footD ],
      [xOff,       yOff+thickness, zCenter       ], [xOff+footW, yOff+thickness, zCenter       ],
      [xOff+footW, yOff+thickness, zCenter+footD ], [xOff,       yOff+thickness, zCenter+footD ],
    ];
    const P = corners.map(([x, y, z]) => proj(x, y, z));
    const col = gameColor(g.id);
    const isMatch = !!searchTerm && g.name.toLowerCase().includes(searchTerm);
    const isDimmed = !!searchTerm && !isMatch;

    const { faceFront } = renderGameBox(ctx, P, col, isMatch, isDimmed);
    hitRegions.push({
      id: g.id, name: g.name,
      poly: faceFront,
      frontPoly: faceFront,
    });
  }

  return hitRegions;
}
