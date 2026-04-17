/* ── Kallax renderer ── */
const KALLAX = { w: 33, h: 33, d: 38 }; // cm, interior dimensions
let kAzimuth   = -2.36;
let kElevation =  0.52;
let kDragging  = false;
let kDragStart = {x:0, y:0, az:0, el:0};


// 3D rotation projection for Kallax — uses azimuth + elevation angles
// Rotates around the Y axis (azimuth) then tilts up/down (elevation)
function isoProject(corners3d, CW, CH, pad) {
  const az = kAzimuth, el = kElevation;
  const cosAz = Math.cos(az), sinAz = Math.sin(az);
  const cosEl = Math.cos(el), sinEl = Math.sin(el);

  // Rotate point in 3D then project to 2D (orthographic)
  function projRaw(x, y, z, sc) {
    // Rotate around Y axis (azimuth)
    const rx =  x * cosAz + z * sinAz;
    const ry =  y;
    const rz = -x * sinAz + z * cosAz;
    // Rotate around X axis (elevation)
    const fx =  rx;
    const fy =  ry * cosEl - rz * sinEl;
    // Project to screen (orthographic — drop the depth axis)
    return [fx * sc, -fy * sc];
  }

  const raw1 = corners3d.map(([x,y,z]) => projRaw(x,y,z,1));
  const xs1 = raw1.map(p=>p[0]), ys1 = raw1.map(p=>p[1]);
  const rw = Math.max(...xs1)-Math.min(...xs1);
  const rh = Math.max(...ys1)-Math.min(...ys1);
  const scale = Math.min((CW-pad*2)/Math.max(rw,1), (CH-pad*2)/Math.max(rh,1)) * 0.92;

  const raw = corners3d.map(([x,y,z]) => projRaw(x,y,z,scale));
  const xs = raw.map(p=>p[0]), ys = raw.map(p=>p[1]);
  const minX=Math.min(...xs), maxX=Math.max(...xs);
  const minY=Math.min(...ys), maxY=Math.max(...ys);
  const ox = (CW-(maxX-minX))/2 - minX;
  const oy = (CH-(maxY-minY))/2 - minY;

  function proj(x,y,z) {
    const [rx,ry] = projRaw(x,y,z,scale);
    return [rx+ox, ry+oy];
  }
  return {proj, scale};
}

// Colors for individual game boxes — stable per game id
const GAME_COLORS = [
  {fill:'rgba(43,76,63,0.18)', stroke:'#2B4C3F'},
  {fill:'rgba(74,124,101,0.18)', stroke:'#4A7C65'},
  {fill:'rgba(122,79,30,0.15)', stroke:'#7A4F1E'},
  {fill:'rgba(74,100,155,0.15)', stroke:'#3A5A9A'},
  {fill:'rgba(100,60,120,0.15)', stroke:'#6B3D7A'},
  {fill:'rgba(160,80,40,0.15)', stroke:'#A05028'},
  {fill:'rgba(40,100,120,0.15)', stroke:'#286478'},
  {fill:'rgba(28,100,100,0.15)', stroke:'#1C6464'},
];
// Map game id → stable color index (persists across re-renders and mode toggles)
const gameColorMap = {};
let gameColorCounter = 0;
function gameColor(id) {
  if (!(id in gameColorMap)) gameColorMap[id] = gameColorCounter++ % GAME_COLORS.length;
  return GAME_COLORS[gameColorMap[id]];
}

// Hit regions for hover detection
let kallaxHitRegions = [];


function packCell(gamesPool, isStacked, startUsed = 0) {
  const KW=KALLAX.w, KH=KALLAX.h, KD=KALLAX.d;
  const packed = [];
  if (!isStacked) {
    let widthUsed = startUsed;
    for (const g of gamesPool) {
      const gw=parseFloat(g.width), gh=parseFloat(g.height), gd=parseFloat(g.depth);
      if (gh > KH || gw > KD) continue;
      const spine = gd;
      if (widthUsed + spine <= KW) {
        packed.push({...g, xOffset: widthUsed, yOffset: 0, mode: 'upright'});
        widthUsed += spine;
      }
    }
  } else {
    // Helper: given a game's dims, return {thickness, footW, footD, area}
    function stackDims(g) {
      const dims=[parseFloat(g.width),parseFloat(g.height),parseFloat(g.depth)].sort((a,b)=>a-b);
      const thickness=dims[0];
      const footW=dims[1]<=KW?dims[1]:dims[2];
      const footD=dims[1]<=KW?dims[2]:dims[1];
      return {thickness, footW, footD, area:footW*footD};
    }
    const sorted = [...gamesPool].filter(g => {
      const dims=[parseFloat(g.width),parseFloat(g.height),parseFloat(g.depth)].sort((a,b)=>a-b);
      return (dims[1]<=KW&&dims[2]<=KD)||(dims[1]<=KD&&dims[2]<=KW);
    }).sort((a,b)=>{
      // Sort by footprint area descending — largest area on bottom
      return stackDims(b).area - stackDims(a).area;
    });
    let heightUsed = startUsed;
    for (const g of sorted) {
      const sd = stackDims(g);
      if (heightUsed + sd.thickness <= KH) {
        packed.push({...g, yOffset:heightUsed, mode:'stacked',
          _thickness:sd.thickness, _footW:sd.footW, _footD:sd.footD});
        heightUsed += sd.thickness;
      }
    }
  }
  return packed;
}

function drawCell(ctx, proj, yBase, packedGames, xBase=0, searchTerm='') {
  const KW=KALLAX.w, KH=KALLAX.h, KD=KALLAX.d;

  function kFace(pts, fill) {
    ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p));
    ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
  }
  function kEdge(p1,p2,col,lw,dash) {
    ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2);
    ctx.strokeStyle=col; ctx.lineWidth=lw;
    ctx.setLineDash(dash||[]); ctx.stroke(); ctx.setLineDash([]);
  }

  const c = [
    proj(xBase,   yBase,   0 ), proj(xBase+KW,yBase,   0 ), proj(xBase+KW,yBase,   KD), proj(xBase,   yBase,   KD),
    proj(xBase,   yBase+KH,0 ), proj(xBase+KW,yBase+KH,0 ), proj(xBase+KW,yBase+KH,KD), proj(xBase,   yBase+KH,KD),
  ];

  // Faces — painter's order
  kFace([c[0],c[3],c[7],c[4]], 'rgba(160,152,140,0.22)'); // left
  kFace([c[1],c[2],c[6],c[5]], 'rgba(160,152,140,0.28)'); // right
  kFace([c[0],c[1],c[2],c[3]], 'rgba(160,152,140,0.32)'); // bottom
  kFace([c[4],c[5],c[6],c[7]], 'rgba(160,152,140,0.08)'); // top
  // Back wall — solid dark
  kFace([c[3],c[7],c[6],c[2]], '#5C5449');
  kEdge(c[3],c[7],'#3E3A33',2); kEdge(c[7],c[6],'#3E3A33',2);
  kEdge(c[6],c[2],'#3E3A33',2); kEdge(c[2],c[3],'#3E3A33',2);

  // Hidden edges
  kEdge(c[0],c[1],'#C5BEB2',1,[3,3]);
  kEdge(c[4],c[5],'#C5BEB2',1,[3,3]);
  kEdge(c[1],c[5],'#C5BEB2',1,[3,3]);

  // Visible shell edges
  [[c[0],c[4]],[c[7],c[3]],[c[5],c[6]],[c[6],c[2]],[c[3],c[2]]]
    .forEach(([p1,p2])=>kEdge(p1,p2,'#9A9288',1.5));

  // ── Draw games ──
  packedGames.forEach(g => {
    const gw=parseFloat(g.width), gh=parseFloat(g.height), gd=parseFloat(g.depth);
    const col = gameColor(g.id);
    const isMatch = searchTerm && g.name.toLowerCase().includes(searchTerm);
    const isDimmed = searchTerm && !isMatch;
    let corners;
    if (g.mode === 'upright') {
      const xOff=g.xOffset, yOff=yBase, spineW=gd;
      corners = [
        [xOff,        yOff,    0  ],[xOff+spineW, yOff,    0  ],
        [xOff+spineW, yOff,    gw ],[xOff,        yOff,    gw ],
        [xOff,        yOff+gh, 0  ],[xOff+spineW, yOff+gh, 0  ],
        [xOff+spineW, yOff+gh, gw ],[xOff,        yOff+gh, gw ],
      ];
    } else {
      // Use pre-computed dims if available, otherwise derive
      const thickness = g._thickness ?? Math.min(gw,gh,gd);
      const footW = g._footW ?? (()=>{const d=[gw,gh,gd].sort((a,b)=>a-b);return d[1]<=KW?d[1]:d[2];})();
      const footD = g._footD ?? (()=>{const d=[gw,gh,gd].sort((a,b)=>a-b);return d[1]<=KW?d[2]:d[1];})();
      const yOff=yBase+g.yOffset;
      const xOff=xBase+(KW-footW)/2;  // center left-right
      const zCenter=(KD-footD)/2;      // center front-back
      corners = [
        [xOff,       yOff,           zCenter       ],[xOff+footW, yOff,           zCenter       ],
        [xOff+footW, yOff,           zCenter+footD ],[xOff,       yOff,           zCenter+footD ],
        [xOff,       yOff+thickness, zCenter       ],[xOff+footW, yOff+thickness, zCenter       ],
        [xOff+footW, yOff+thickness, zCenter+footD ],[xOff,       yOff+thickness, zCenter+footD ],
      ];
    }
    const P = corners.map(([x,y,z])=>proj(x,y,z));
    function gFace(idx,fill){
      ctx.beginPath(); idx.forEach((i,n)=>n===0?ctx.moveTo(...P[i]):ctx.lineTo(...P[i]));
      ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
    }
    function gEdge(a,b,hidden){
      ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]);
      ctx.strokeStyle=hidden?'rgba(180,170,160,0.4)':col.stroke;
      ctx.lineWidth=hidden?0.75:1.25;
      ctx.setLineDash(hidden?[2,3]:[]); ctx.stroke(); ctx.setLineDash([]);
    }
    const topFill=col.fill.replace(/[\d.]+\)$/,v=>String(Math.min(parseFloat(v)*1.8,1))+')');

    if (isDimmed) {
      // Dimmed — very faint grey fill, no stroke color
      const dimFill = 'rgba(160,152,140,0.08)';
      gFace([3,7,6,2],dimFill); gFace([0,3,7,4],dimFill); gFace([1,2,6,5],dimFill);
      gFace([0,1,2,3],dimFill); gFace([0,1,5,4],dimFill); gFace([4,5,6,7],dimFill);
      [[4,5],[5,6],[6,7],[7,4],[4,0],[5,1],[6,2],[7,3],[1,2]].forEach(([a,b])=>{
        ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]);
        ctx.strokeStyle='rgba(160,152,140,0.2)'; ctx.lineWidth=0.75;
        ctx.setLineDash([]); ctx.stroke();
      });
    } else {
      // Normal or highlighted
      const hFill = isMatch
        ? col.fill.replace(/[\d.]+\)$/, '0.55)')
        : col.fill;
      const hTopFill = isMatch
        ? col.fill.replace(/[\d.]+\)$/, '0.75)')
        : topFill;
      gFace([3,7,6,2],hFill); gFace([0,3,7,4],hFill); gFace([1,2,6,5],hFill);
      gFace([0,1,2,3],hFill); gFace([0,1,5,4],hFill); gFace([4,5,6,7],hTopFill);
      gEdge(0,3,true); gEdge(3,2,true); gEdge(0,1,true);
      [[4,5],[5,6],[6,7],[7,4],[4,0],[5,1],[6,2],[7,3],[1,2]].forEach(([a,b])=>{
        ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]);
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth = isMatch ? 2 : 1.25;
        ctx.setLineDash([]); ctx.stroke();
      });
      // Glow ring on match — redraw top face outline in accent color
      if (isMatch) {
        ctx.beginPath();
        [4,5,6,7,4].forEach((i,n) => n===0?ctx.moveTo(...P[i]):ctx.lineTo(...P[i]));
        ctx.strokeStyle = col.stroke; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();
      }
    }
    const hitPoly = g.mode==='stacked'?[P[4],P[5],P[6],P[7]]:[P[0],P[1],P[5],P[4]];
    const altPoly = g.mode==='stacked'?[P[0],P[1],P[5],P[4]]:[P[4],P[5],P[6],P[7]];
    kallaxHitRegions.push({id:g.id, name:g.name, poly:hitPoly, frontPoly:altPoly});
  });

  // Re-draw back wall border + shell on top
  kEdge(c[3],c[7],'#3E3A33',2); kEdge(c[7],c[6],'#3E3A33',2);
  kEdge(c[6],c[2],'#3E3A33',2); kEdge(c[2],c[3],'#3E3A33',2);
  [[c[0],c[4]],[c[7],c[3]],[c[5],c[6]],[c[6],c[2]],[c[3],c[2]]]
    .forEach(([p1,p2])=>kEdge(p1,p2,'#9A9288',1.5));
}

// Group-aware packing for a fixed number of cells.
// Returns { cellPacked: Array<Array>, remaining: Array }
// Used by renderKallaxUnit (display), drain loops, and overflow counting —
// all three must use the same algorithm so game distribution is consistent.
function packCellsGroupAware(inputQueue, numCells, isStacked) {
  let queue = [...inputQueue];
  const cellPacked = [];

  for (let i = 0; i < numCells; i++) {
    if (!queue.length) { cellPacked.push([]); continue; }

    if (queue[0]._cellGroup) {
      // ── Cell-group at front ─────────────────────────────────────────────
      const cellGroup = queue[0]._cellGroup;
      const groupGames = [], afterGroup = [];
      let pastGroup = false;
      for (const g of queue) {
        if (!pastGroup && g._cellGroup === cellGroup) groupGames.push(g);
        else { pastGroup = true; afterGroup.push(g); }
      }

      const fillCandidates = afterGroup.filter(g => !g._cellGroup);

      let cellResult, notPackedGroup, fillIds;
      if (isStacked) {
        // Stacked: combine group + fill so area-sort runs across all, largest on bottom.
        const allPacked = packCell([...groupGames, ...fillCandidates], isStacked);
        const groupIdSet = new Set(groupGames.map(g => g.id));
        const packedGroupIds = new Set(allPacked.filter(g => groupIdSet.has(g.id)).map(g => g.id));
        notPackedGroup = groupGames.filter(g => !packedGroupIds.has(g.id));
        fillIds = new Set(allPacked.filter(g => !groupIdSet.has(g.id)).map(g => g.id));
        cellResult = allPacked;
      } else {
        // Upright: pack group left-to-right first, then fill remaining width.
        const groupPacked = packCell(groupGames, isStacked);
        const groupIdSet = new Set(groupPacked.map(g => g.id));
        notPackedGroup = groupGames.filter(g => !groupIdSet.has(g.id));
        const usedByGroup = groupPacked.reduce((s, g) => s + parseFloat(g.depth), 0);
        const fillPacked = packCell(fillCandidates, isStacked, usedByGroup);
        fillIds = new Set(fillPacked.map(g => g.id));
        cellResult = [...groupPacked, ...fillPacked];
      }

      cellPacked.push(cellResult);
      queue = [...notPackedGroup, ...afterGroup.filter(g => !fillIds.has(g.id))];

    } else {
      // ── Ungrouped games at front ─────────────────────────────────────────
      // Pack them, but stop before the next cell-group so it gets its own cell.
      const nextGroupIdx = queue.findIndex(g => g._cellGroup);
      const leadingNonGroup = nextGroupIdx === -1 ? queue : queue.slice(0, nextGroupIdx);
      const afterNonGroup   = nextGroupIdx === -1 ? []    : queue.slice(nextGroupIdx);

      const packed = packCell(leadingNonGroup, isStacked);
      const packedIds = new Set(packed.map(g => g.id));

      cellPacked.push(packed);
      if (packed.length === 0) {
        queue = [...afterNonGroup, ...leadingNonGroup]; // too big for any cell — move to end
      } else {
        queue = [...leadingNonGroup.filter(g => !packedIds.has(g.id)), ...afterNonGroup];
      }
    }
  }
  return { cellPacked, remaining: queue };
}

function renderKallaxUnit(canvas, ku, inputRemaining, searchTerm) {
  // Renders one Kallax unit into its canvas, packs from 'inputRemaining', returns leftover games
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  ctx.clearRect(0, 0, CW, CH);

  const isStacked = kallaxMode === 'stacked';
  const KW=KALLAX.w, KH=KALLAX.h, KD=KALLAX.d;
  const [COLS, ROWS] = kuGrid(ku.model);
  const CELLS = COLS * ROWS;
  const totalW = KW * COLS, totalH = KH * ROWS;

  const {proj} = isoProject([
    [0,0,0],[totalW,0,0],[totalW,0,KD],[0,0,KD],
    [0,totalH,0],[totalW,totalH,0],[totalW,totalH,KD],[0,totalH,KD],
  ], CW, CH, 36);

  const { cellPacked, remaining } = packCellsGroupAware(inputRemaining, CELLS, isStacked);

  function kEdgeD(p1,p2,col,lw,dash){
    ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2);
    ctx.strokeStyle=col; ctx.lineWidth=lw;
    ctx.setLineDash(dash||[]); ctx.stroke(); ctx.setLineDash([]);
  }
  function shelfPanel(y) {
    const d=[proj(0,y,0),proj(totalW,y,0),proj(totalW,y,KD),proj(0,y,KD)];
    ctx.beginPath(); d.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p)); ctx.closePath();
    ctx.fillStyle='rgba(150,142,130,0.35)'; ctx.fill();
    [[0,1],[1,2],[2,3],[3,0]].forEach(([a,b])=>kEdgeD(d[a],d[b],'#8A8278',2));
  }
  function vertDivider(x) {
    const d=[proj(x,0,0),proj(x,totalH,0),proj(x,totalH,KD),proj(x,0,KD)];
    ctx.beginPath(); d.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p)); ctx.closePath();
    ctx.fillStyle='rgba(150,142,130,0.28)'; ctx.fill();
    [[0,1],[1,2],[2,3],[3,0]].forEach(([a,b])=>kEdgeD(d[a],d[b],'#8A8278',1.5));
  }

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cellIdx = row * COLS + col;
      const xBase = col * KW, yBase = row * KH;
      const offsetPacked = cellPacked[cellIdx].map(g => ({...g, xOffset: (g.xOffset||0) + xBase}));
      drawCell(ctx, proj, yBase, offsetPacked, xBase, searchTerm);
    }
  }
  for (let r = 1; r < ROWS; r++) shelfPanel(r * KH);
  for (let c = 1; c < COLS; c++) vertDivider(c * KW);

  return remaining;
}

function renderKallax() {
  // If in manual editing mode, delegate to manual renderer
  if (manualEditingId) { renderManualKallax(); return; }

  kallaxHitRegions = [];
  const searchTerm = (document.getElementById('kallax-search')?.value || '').toLowerCase().trim();
  const wrap = document.getElementById('kallax-units-wrap');
  if (!wrap) return;

  if (!myKallaxes.length) {
    wrap.innerHTML = '<div style="font-size:13px;font-family:var(--mono);color:var(--text-light);padding:var(--s4);text-align:center;">No Kallax units. Add one above.</div>';
    document.getElementById('kallax-meta').textContent = '';
    document.getElementById('kallax-overflow').style.display = 'none';
    return;
  }

  if (!activeKuId && myKallaxes.length) activeKuId = myKallaxes[0].id;

  // If there's a search term, find which unit contains a matching game and switch to it
  if (searchTerm && myKallaxes.length > 1) {
    const eligible = getSortedForKallax();
    let rem = [...eligible];
    for (const ku of myKallaxes) {
      const CELLS = kuGrid(ku.model)[0] * kuGrid(ku.model)[1];
      const { cellPacked: cp, remaining: next } = packCellsGroupAware(rem, CELLS, kallaxMode === 'stacked');
      const unitGames = cp.flat();
      rem = next;
      if (unitGames.some(g => g.name.toLowerCase().includes(searchTerm))) {
        if (activeKuId !== ku.id) {
          activeKuId = ku.id;
          renderKallaxTabs();
        }
        break;
      }
    }
  }

  const activeKu = myKallaxes.find(k => k.id === activeKuId);
  if (!activeKu) return;

  const wrap2 = document.getElementById('kallax-canvas-wrap');
  const availW = wrap2?.clientWidth || 600;
  const availH = wrap2?.clientHeight || availW;

  // Keep only one canvas — for the active unit
  const cvId = 'kcv-' + activeKu.id;
  if (!document.getElementById(cvId)) {
    wrap.innerHTML = `<canvas id="${cvId}"></canvas>`;
  }
  const cv = document.getElementById(cvId);
  const [cols, rows] = kuGrid(activeKu.model);
  sizeCanvasForUnit(cv, cols, rows, availW, availH);

  // Pack all units in order so games are distributed correctly
  const eligible = getSortedForKallax();
  let remaining = [...eligible];
  let activeRemaining = remaining;

  for (const ku of myKallaxes) {
    if (ku.id === activeKu.id) {
      // This is the unit to display — render it
      activeRemaining = remaining;
      remaining = renderKallaxUnit(cv, ku, remaining, searchTerm);
      break;
    } else {
      // Skip earlier units — drain using the same group-aware algorithm for consistency
      const CELLS = kuGrid(ku.model)[0] * kuGrid(ku.model)[1];
      ({ remaining } = packCellsGroupAware(remaining, CELLS, kallaxMode === 'stacked'));
    }
  }

  const totalCells = myKallaxes.reduce((s,ku) => { const [c,r]=kuGrid(ku.model); return s+c*r; }, 0);
  // Count overflow using the same group-aware algorithm
  let allRemaining = [...getSortedForKallax()];
  for (const ku of myKallaxes) {
    const CELLS = kuGrid(ku.model)[0] * kuGrid(ku.model)[1];
    ({ remaining: allRemaining } = packCellsGroupAware(allRemaining, CELLS, kallaxMode === 'stacked'));
  }
  const overflow = allRemaining;
  const metaEl = document.getElementById('kallax-meta');
  const ovEl = document.getElementById('kallax-overflow');
  const kuIdx = myKallaxes.findIndex(k => k.id === activeKu.id) + 1;
  metaEl.textContent = `Unit ${kuIdx} of ${myKallaxes.length} · ${kuLabel(activeKu.model)} · ${totalCells} cell${totalCells>1?'s':''} total`;
  if (overflow.length > 0) {
    ovEl.style.display = 'block';
    ovEl.innerHTML = `<strong>${overflow.length} game${overflow.length>1?'s':''} don't fit:</strong> ${overflow.map(g => `<span class="ov-name">${esc(g.name)}</span>`).join('')}`;
  } else {
    ovEl.style.display = 'none';
  }
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const [xi,yi]=poly[i],[xj,yj]=poly[j];
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

// Set up hover + drag-to-rotate — attaches to the units wrap, delegates to individual canvases
function setupKallaxHover() {
  const wrap = document.getElementById('kallax-canvas-wrap');
  if (!wrap) return;
  const tooltip = document.getElementById('k-tooltip');

  wrap.addEventListener('mousedown', e => {
    const cv = e.target.closest('canvas');
    if (!cv) return;
    kDragging = true;
    kDragStart = { x: e.clientX, y: e.clientY, az: kAzimuth, el: kElevation };
    cv.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mouseup', () => {
    if (kDragging) {
      kDragging = false;
      wrap.querySelectorAll('canvas').forEach(c => c.style.cursor = 'grab');
    }
  });

  wrap.addEventListener('mousemove', e => {
    if (kDragging) {
      const dx = e.clientX - kDragStart.x;
      const dy = e.clientY - kDragStart.y;
      const sens = 0.008;
      kAzimuth   = kDragStart.az + dx * sens;
      kElevation = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1,
                    kDragStart.el - dy * sens));
      renderKallax();
      return;
    }

    const cv = e.target.closest('canvas');
    if (!cv) { tooltip.classList.remove('show'); return; }

    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let hit = null;
    for (const r of [...kallaxHitRegions].reverse()) {
      if (pointInPoly(mx, my, r.poly) || pointInPoly(mx, my, r.frontPoly)) {
        hit = r; break;
      }
    }

    if (manualEditingId) {
      // Manual mode: highlight hovered cell
      const newHover = hit?.isCell ? {unitId: hit.unitId, cellIndex: hit.cellIndex} : null;
      const changed = JSON.stringify(newHover) !== JSON.stringify(manualHoveredCell);
      if (changed) {
        manualHoveredCell = newHover;
        renderManualKallax();
      }
      cv.style.cursor = manualSelectedGameId && hit?.isCell ? 'cell' : 'default';
      tooltip.classList.remove('show');
    } else if (hit) {
      cv.style.cursor = 'pointer';
      tooltip.textContent = hit.name;
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top  = (e.clientY - 10) + 'px';
      tooltip.classList.add('show');
    } else {
      cv.style.cursor = 'grab';
      tooltip.classList.remove('show');
    }
  });

  wrap.addEventListener('mouseleave', () => {
    tooltip.classList.remove('show');
    if (manualEditingId) { manualHoveredCell = null; renderManualKallax(); }
  });

  wrap.addEventListener('click', e => {
    if (!manualEditingId || !manualSelectedGameId) return;
    const cv = e.target.closest('canvas');
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for (const r of [...kallaxHitRegions].reverse()) {
      if (r.isCell && (pointInPoly(mx, my, r.poly) || pointInPoly(mx, my, r.frontPoly))) {
        manualPlaceGame(r.unitId, r.cellIndex);
        return;
      }
    }
  });

  // Also set up listeners for the manual canvas wrap
  const manualWrap = document.getElementById('kallax-canvas-wrap-manual');
  if (manualWrap) {
    manualWrap.addEventListener('mousedown', e => {
      const cv = e.target.closest('canvas');
      if (!cv || manualSelectedGameId) return; // don't drag when placing
      kDragging = true;
      kDragStart = { x: e.clientX, y: e.clientY, az: kAzimuth, el: kElevation };
      cv.style.cursor = 'grabbing';
      e.preventDefault();
    });
    manualWrap.addEventListener('mousemove', e => {
      if (kDragging) {
        const dx = e.clientX - kDragStart.x;
        const dy = e.clientY - kDragStart.y;
        const sens = 0.008;
        kAzimuth = kDragStart.az + dx * sens;
        kElevation = Math.max(-Math.PI/2+0.1, Math.min(Math.PI/2-0.1, kDragStart.el - dy * sens));
        renderManualKallax();
        return;
      }
      const cv = e.target.closest('canvas');
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * cv.width / rect.width;
      const my = (e.clientY - rect.top) * cv.height / rect.height;
      // Check placed games first (smaller, more specific), then cells
      let gameHit = null;
      for (const r of [...kallaxHitRegions].reverse()) {
        if (r.isPlacedGame && (pointInPoly(mx, my, r.poly) || pointInPoly(mx, my, r.frontPoly))) {
          gameHit = r; break;
        }
      }
      let cellHit = null;
      for (const r of [...kallaxHitRegions].reverse()) {
        if (r.isCell && (pointInPoly(mx, my, r.poly) || pointInPoly(mx, my, r.frontPoly))) {
          cellHit = r; break;
        }
      }
      const newHover = cellHit ? {unitId: cellHit.unitId, cellIndex: cellHit.cellIndex} : null;
      if (JSON.stringify(newHover) !== JSON.stringify(manualHoveredCell)) {
        manualHoveredCell = newHover;
        renderManualKallax();
      }
      if (gameHit) {
        tooltip.textContent = gameHit.name + ' (click to remove)';
        tooltip.style.left = e.clientX + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
        tooltip.classList.add('show');
        cv.style.cursor = 'pointer';
      } else {
        tooltip.classList.remove('show');
        cv.style.cursor = manualSelectedGameId && cellHit ? 'cell' : 'default';
      }
    });
    manualWrap.addEventListener('mouseup', () => {
      if (kDragging) { kDragging = false; }
    });
    manualWrap.addEventListener('mouseleave', () => {
      if (manualHoveredCell) { manualHoveredCell = null; renderManualKallax(); }
    });
    manualWrap.addEventListener('click', e => {
      const cv = e.target.closest('canvas');
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * cv.width / rect.width;
      const my = (e.clientY - rect.top) * cv.height / rect.height;
      // Check placed game hit first (click to remove)
      for (const r of [...kallaxHitRegions].reverse()) {
        if (r.isPlacedGame && (pointInPoly(mx, my, r.poly) || pointInPoly(mx, my, r.frontPoly))) {
          if (!manualSelectedGameId) {
            manualRemovePlacement(r.id);
            tooltip.classList.remove('show');
            return;
          }
        }
      }
      // Then check cell placement
      if (!manualSelectedGameId) return;
      for (const r of [...kallaxHitRegions].reverse()) {
        if (r.isCell && (pointInPoly(mx, my, r.poly) || pointInPoly(mx, my, r.frontPoly))) {
          manualPlaceGame(r.unitId, r.cellIndex);
          return;
        }
      }
    });
  }
}

/* ── Sidebar toggle ── */
function toggleSidebar() {
  document.body.classList.toggle('sb-hidden');
  setTimeout(() => {
    if (document.getElementById('tab-suggested').classList.contains('on')) {
      resizeKallaxCanvas();
      renderKallax();
    }
  }, 220);
}

