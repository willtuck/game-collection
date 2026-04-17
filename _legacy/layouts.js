
/* ══════════════════════════════════════════
   LAYOUTS SYSTEM
   ══════════════════════════════════════════ */

const LAYOUTS_SK = 'kallax-layouts-v1';
let layouts = (() => { try { return JSON.parse(localStorage.getItem(LAYOUTS_SK)) || []; } catch { return []; } })();
let activeLayoutId = null;  // currently loaded layout id (null = live auto-pack)
let manualEditingId = null; // layout being edited in manual mode
let manualSelectedGameId = null; // game selected for placement
let manualHoveredCell = null; // {unitId, cellIndex} currently hovered

function saveLayouts() { localStorage.setItem(LAYOUTS_SK, JSON.stringify(layouts)); }

/* ── Suggested layout snapshot ── */
function snapshotSuggestedPlacements() {
  const eligible = getSortedForKallax();
  const placements = [];
  let remaining = [...eligible];
  const isStacked = kallaxMode === 'stacked';
  for (const ku of myKallaxes) {
    const [cols, rows] = kuGrid(ku.model);
    const CELLS = cols * rows;
    const { cellPacked, remaining: next } = packCellsGroupAware(remaining, CELLS, isStacked);
    cellPacked.forEach((packed, ci) => {
      packed.forEach(g => placements.push({
        gameId: g.id, unitId: ku.id, cellIndex: ci, storageMode: kallaxMode
      }));
    });
    remaining = next;
  }
  return placements;
}

function saveCurrentAsLayout() {
  const name = prompt('Name this layout:', 'My layout ' + (layouts.length + 1));
  if (!name) return;
  const layout = {
    id: 'lay' + Date.now().toString(36),
    name: name.trim(),
    type: 'suggested',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Settings snapshot
    sortScheme: kallaxSort,
    storageMode: kallaxMode,
    units: myKallaxes.map(k => ({id: k.id, model: k.model, label: k.label})),
    // Game placement snapshot
    placements: snapshotSuggestedPlacements(),
    // Collection snapshot (game ids + names so we can detect changes)
    collectionSnapshot: games.map(g => ({id: g.id, name: g.name})),
  };
  layouts.push(layout);
  saveLayouts();
  renderSuggestedLayouts(); renderManualLayouts();
  toast(`Saved "${layout.name}"`);
}

function updateSuggestedLayout(id) {
  const layout = layouts.find(l => l.id === id);
  if (!layout || layout.type !== 'suggested') return;
  layout.updatedAt = new Date().toISOString();
  layout.sortScheme = kallaxSort;
  layout.storageMode = kallaxMode;
  layout.units = myKallaxes.map(k => ({id: k.id, model: k.model, label: k.label}));
  layout.placements = snapshotSuggestedPlacements();
  layout.collectionSnapshot = games.map(g => ({id: g.id, name: g.name}));
  saveLayouts();
  renderSuggestedLayouts(); renderManualLayouts();
  toast(`Updated "${layout.name}"`);
}

function loadLayout(id) {
  const layout = layouts.find(l => l.id === id);
  if (!layout) return;
  activeLayoutId = id;

  if (layout.type === 'suggested') {
    kallaxSort = layout.sortScheme || 'alpha';
    kallaxMode = layout.storageMode || 'upright';
    const sortEl = document.getElementById('kallax-sort');
    if (sortEl) sortEl.value = kallaxSort;
    document.getElementById('kmode-upright').classList.toggle('on', kallaxMode === 'upright');
    document.getElementById('kmode-stacked').classList.toggle('on', kallaxMode === 'stacked');
    document.getElementById('layout-active-name').textContent = layout.name;
    document.getElementById('layout-active-banner').classList.add('show');
    renderSuggestedLayouts();
    switchTab('suggested');
  } else {
    manualEditingId = id;
    manualSelectedGameId = null;
    manualHoveredCell = null;
    renderManualLayouts();
    switchTab('manual');
    showManualEditView(layout.name);
  }
  toast(`Loaded "${layout.name}"`);
}

function clearActiveLayout() {
  activeLayoutId = null;
  document.getElementById('layout-active-banner').classList.remove('show');
  renderSuggestedLayouts(); renderManualLayouts();
  renderKallax();
}

function deleteLayout(id) {
  const layout = layouts.find(l => l.id === id);
  if (!layout) return;
  _pendingDeleteLayoutId = id;
  document.getElementById('del-modal-body').innerHTML =
    `Delete layout <strong>${layout.name}</strong>? This cannot be undone.`;
  document.getElementById('del-backdrop').classList.add('show');
}

let _pendingDeleteLayoutId = null;

function renameLayout(id) {
  const layout = layouts.find(l => l.id === id);
  if (!layout) return;
  const name = prompt('Rename layout:', layout.name);
  if (!name || !name.trim()) return;
  layout.name = name.trim();
  saveLayouts();
  renderSuggestedLayouts(); renderManualLayouts();
}

function hasPendingLayoutDelete() {
  return !!_pendingDeleteLayoutId;
}

/* ── Layout change detection ── */
function layoutHasChanges(layout) {
  if (layout.type !== 'suggested') return false;
  const current = new Set(games.map(g => g.id));
  const saved = new Set((layout.collectionSnapshot || []).map(g => g.id));
  if (current.size !== saved.size) return true;
  for (const id of current) if (!saved.has(id)) return true;
  return false;
}

/* ── Manual layout ── */
function startManualLayout() {
  const name = prompt('Name this layout:', 'Manual layout ' + (layouts.length + 1));
  if (!name) return;
  const layout = {
    id: 'lay' + Date.now().toString(36),
    name: name.trim(),
    type: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    units: myKallaxes.map(k => ({id: k.id, model: k.model, label: k.label})),
    placements: [],  // {gameId, unitId, cellIndex, storageMode}
  };
  layouts.push(layout);
  saveLayouts();
  manualEditingId = layout.id;
  manualSelectedGameId = null;
  manualHoveredCell = null;
  switchTab('manual');
  showManualEditView(layout.name);
}

function editManualLayout(id) {
  manualEditingId = id;
  manualSelectedGameId = null;
  manualHoveredCell = null;
  const _lay = layouts.find(l => l.id === id);
  switchTab('manual');
  showManualEditView(_lay?.name || '');
}

function saveManualLayout() {
  const layout = layouts.find(l => l.id === manualEditingId);
  if (layout) {
    layout.updatedAt = new Date().toISOString();
    saveLayouts();
    toast(`Saved "${layout.name}"`);
  }
  manualEditingId = null;
  manualSelectedGameId = null;
  manualHoveredCell = null;
  showManualListView();
}

function showManualListView() {
  // Tab panel: show empty state, hide canvas
  document.getElementById('manual-list-view').style.display = 'flex';
  document.getElementById('manual-edit-view').style.display = 'none';
  // Sidebar: show list, hide edit
  document.getElementById('sb-manual-list').style.display = 'flex';
  document.getElementById('sb-manual-edit').style.display = 'none';
  renderManualLayouts();
}

function showManualEditView(layoutName) {
  // Tab panel: hide list, show edit canvas
  document.getElementById('manual-list-view').style.display = 'none';
  document.getElementById('manual-edit-view').style.display = 'flex';
  // Sidebar: hide list, show edit
  document.getElementById('sb-manual-list').style.display = 'none';
  document.getElementById('sb-manual-edit').style.display = 'flex';
  document.getElementById('sb-manual-name').textContent = layoutName || '';
  renderManualGameList();
  // Defer render until the canvas container has dimensions
  requestAnimationFrame(() => renderManualKallax());
}

function cancelManualLayout() {
  manualEditingId = null;
  manualSelectedGameId = null;
  manualHoveredCell = null;
  showManualListView();
}

function getManualLayout() {
  return layouts.find(l => l.id === manualEditingId) || null;
}

function manualSelectGame(gameId) {
  if (isManualGamePlaced(gameId)) return;
  manualSelectedGameId = manualSelectedGameId === gameId ? null : gameId;
  renderManualGameList();
  renderManualKallax();
}

function isManualGamePlaced(gameId) {
  const layout = getManualLayout();
  return layout ? layout.placements.some(p => p.gameId === gameId) : false;
}

function manualPlaceGame(unitId, cellIndex) {
  if (!manualSelectedGameId) return;
  const layout = getManualLayout();
  if (!layout) return;

  const g = games.find(g => g.id === manualSelectedGameId);
  if (!g) return;

  const ku = myKallaxes.find(k => k.id === unitId);
  if (!ku) return;

  // Check if game fits using its storage mode
  const inCell = layout.placements.filter(p => p.unitId === unitId && p.cellIndex === cellIndex);
  const gw=parseFloat(g.width), gh=parseFloat(g.height), gd=parseFloat(g.depth);

  // A cell can only have one storage mode — mixing upright and stacked causes overlap
  const existingModes = new Set(inCell.map(p => p.storageMode));
  if (existingModes.size > 0 && !existingModes.has(manualStorageMode)) {
    const existing = existingModes.has('upright') ? 'vertical' : 'horizontal';
    toast(`This cell already has ${existing} games — switch storage mode to match.`);
    return;
  }

  if (manualStorageMode === 'stacked') {
    const dims=[gw,gh,gd].sort((a,b)=>a-b);
    const thickness = dims[0];
    const stackUsed = inCell
      .filter(p => p.storageMode === 'stacked')
      .reduce((s, p) => {
        const gg = games.find(x => x.id === p.gameId);
        if (!gg) return s;
        return s + Math.min(parseFloat(gg.width),parseFloat(gg.height),parseFloat(gg.depth));
      }, 0);
    if (stackUsed + thickness > KALLAX.h) {
      toast("This game doesn't fit — the cell is full.");
      return;
    }
  } else {
    const spine = gd;
    const uprightUsed = inCell
      .filter(p => p.storageMode === 'upright')
      .reduce((s, p) => {
        const gg = games.find(x => x.id === p.gameId);
        return gg ? s + parseFloat(gg.depth) : s;
      }, 0);
    if (gh > KALLAX.h || uprightUsed + spine > KALLAX.w) {
      toast("This game doesn't fit — the cell is full.");
      return;
    }
  }

  layout.placements.push({ gameId: manualSelectedGameId, unitId, cellIndex, storageMode: manualStorageMode });
  manualSelectedGameId = null;
  renderManualGameList();
  renderManualKallax();
}

function manualRemovePlacement(gameId) {
  const layout = getManualLayout();
  if (!layout) return;
  layout.placements = layout.placements.filter(p => p.gameId !== gameId);
  renderManualGameList();
  renderManualKallax();
}

/* ── Manual mode sidebar ── */


function renderManualGameList() {
  const layout = getManualLayout();
  const gameListEl = document.getElementById('manual-game-list');
  const hintEl = document.getElementById('sb-manual-hint');
  if (!layout || !gameListEl) return;

  if (hintEl) hintEl.textContent = manualSelectedGameId ? '📌 Click a cell to place' : 'Select a game below, then click a cell';

  const q = (document.getElementById('manual-game-search')?.value || '').toLowerCase();
  const eligible = games.filter(g => hasDims(g) && (!q || g.name.toLowerCase().includes(q)))
    .sort((a,b) => a.name.localeCompare(b.name));
  gameListEl.innerHTML = eligible.map(g => {
    const placed = isManualGamePlaced(g.id);
    const selected = manualSelectedGameId === g.id;
    const col = gameColor(g.id);
    const players = g.minPlayers
      ? (g.minPlayers === g.maxPlayers || !g.maxPlayers ? g.minPlayers+'p' : g.minPlayers+'-'+g.maxPlayers+'p')
      : '';
    return `<div class="manual-game-item${selected?' selected':''}${placed?' placed':''}"
      onclick="${placed ? `manualRemovePlacement('${g.id}')` : `manualSelectGame('${g.id}')`}">
      <div class="manual-game-dot" style="background:${col.stroke};"></div>
      <span class="manual-game-name" title="${g.name}">${g.name}</span>
      ${players ? `<span class="manual-game-players">${players}</span>` : ''}
      ${placed ? '<span style="font-size:10px;font-family:var(--mono);color:var(--accent);">✓</span>' : ''}
    </div>`;
  }).join('');
}




/* ── Manual Kallax render ── */
function renderManualKallax() {
  const layout = getManualLayout();
  if (!layout) return;

  const manualFindTerm = (document.getElementById('manual-find-search')?.value || '').toLowerCase().trim();
  kallaxHitRegions = [];
  const wrap = document.getElementById('kallax-units-wrap-manual');
  if (!wrap) return;

  if (!activeKuId && myKallaxes.length) activeKuId = myKallaxes[0].id;
  const activeKu = myKallaxes.find(k => k.id === activeKuId);
  if (!activeKu) return;

  // Render unit tabs for the manual view
  const manualTabBar = document.getElementById('ku-tab-bar-manual');
  if (manualTabBar) {
    manualTabBar.innerHTML = myKallaxes.map(ku => {
      const isActive = ku.id === activeKuId;
      return `<div style="display:inline-flex;flex-direction:column;align-items:center;">
        <button class="ku-tab${isActive?' on':''}" onclick="setActiveKu('${ku.id}'); renderManualKallax();">${ku.label}</button>
      </div>`;
    }).join('');
  }

  const wrap2 = document.getElementById('kallax-canvas-wrap-manual');
  const availW = wrap2?.clientWidth || 600;
  const availH = wrap2?.clientHeight || availW;

  const cvId = 'kcv-manual-' + activeKu.id;
  if (!document.getElementById(cvId)) {
    wrap.innerHTML = `<canvas id="${cvId}"></canvas>`;
  }
  const cv = document.getElementById(cvId);
  const [cols, rows] = kuGrid(activeKu.model);
  sizeCanvasForUnit(cv, cols, rows, availW, availH);

  const ctx = cv.getContext('2d');
  const CW = cv.width, CH = cv.height;
  ctx.clearRect(0, 0, CW, CH);

  const KW = KALLAX.w, KH = KALLAX.h, KD = KALLAX.d;
  const totalW = KW * cols, totalH = KH * rows;
  const {proj} = isoProject([
    [0,0,0],[totalW,0,0],[totalW,0,KD],[0,0,KD],
    [0,totalH,0],[totalW,totalH,0],[totalW,totalH,KD],[0,totalH,KD],
  ], CW, CH, 36);

  // Get placements for this unit
  const unitPlacements = layout.placements.filter(p => p.unitId === activeKu.id);

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cellIndex = row * cols + col;
      const xBase = col * KW, yBase = row * KH;
      const isHovered = manualHoveredCell &&
        manualHoveredCell.unitId === activeKu.id &&
        manualHoveredCell.cellIndex === cellIndex;

      // Get games placed in this cell with their stored storage modes
      const cellPlacements = unitPlacements.filter(p => p.cellIndex === cellIndex);

      // Position each game manually based on its stored storageMode
      const packed = [];
      let uprightWidthUsed = 0;
      let stackHeightUsed = 0;

      for (const p of cellPlacements) {
        const g = games.find(gg => gg.id === p.gameId);
        if (!g || !hasDims(g)) continue;
        const gw=parseFloat(g.width), gh=parseFloat(g.height), gd=parseFloat(g.depth);
        if (p.storageMode === 'stacked') {
          const dims=[gw,gh,gd].sort((a,b)=>a-b);
          const thickness=dims[0];
          const footW=dims[1]<=KALLAX.w?dims[1]:dims[2];
          const footD=dims[1]<=KALLAX.w?dims[2]:dims[1];
          if (stackHeightUsed + thickness <= KALLAX.h) {
            packed.push({...g, yOffset:stackHeightUsed, mode:'stacked',
              _thickness:thickness, _footW:footW, _footD:footD, xOffset:xBase});
            stackHeightUsed += thickness;
          }
        } else {
          const spine = gd;
          if (gh <= KALLAX.h && uprightWidthUsed + spine <= KALLAX.w) {
            packed.push({...g, xOffset: xBase + uprightWidthUsed, yOffset: 0, mode: 'upright'});
            uprightWidthUsed += spine;
          }
        }
      }

      drawCell(ctx, proj, yBase, packed, xBase, manualFindTerm);

      // Register hit regions for placed games (for hover tooltip + click-to-remove)
      packed.forEach(g => {
        const gw=parseFloat(g.width), gh=parseFloat(g.height), gd=parseFloat(g.depth);
        if (g.mode === 'stacked') {
          const dims=[gw,gh,gd].sort((a,b)=>a-b);
          const thickness=dims[0];
          const footW=dims[1]<=KALLAX.w?dims[1]:dims[2];
          const footD=dims[1]<=KALLAX.w?dims[2]:dims[1];
          const yOff=yBase+g.yOffset;
          const xOff=xBase+(KALLAX.w-footW)/2;
          const zC=(KALLAX.d-footD)/2;
          const P=[
            proj(xOff,yOff,zC), proj(xOff+footW,yOff,zC),
            proj(xOff+footW,yOff,zC+footD), proj(xOff,yOff,zC+footD),
            proj(xOff,yOff+thickness,zC), proj(xOff+footW,yOff+thickness,zC),
            proj(xOff+footW,yOff+thickness,zC+footD), proj(xOff,yOff+thickness,zC+footD),
          ];
          kallaxHitRegions.push({id:g.id, name:g.name, isPlacedGame:true, unitId:activeKu.id, cellIndex,
            poly:[P[4],P[5],P[6],P[7]], frontPoly:[P[0],P[1],P[2],P[3]]});
        } else {
          const xOff=g.xOffset, yOff=yBase, spineW=gd;
          const P=[
            proj(xOff,yOff,0), proj(xOff+spineW,yOff,0),
            proj(xOff+spineW,yOff,KALLAX.d), proj(xOff,yOff,KALLAX.d),
            proj(xOff,yOff+gh,0), proj(xOff+spineW,yOff+gh,0),
            proj(xOff+spineW,yOff+gh,KALLAX.d), proj(xOff,yOff+gh,KALLAX.d),
          ];
          kallaxHitRegions.push({id:g.id, name:g.name, isPlacedGame:true, unitId:activeKu.id, cellIndex,
            poly:[P[0],P[1],P[5],P[4]], frontPoly:[P[4],P[5],P[6],P[7]]});
        }
      });

      // Hover highlight overlay
      if (isHovered && manualSelectedGameId) {
        const corners = [
          proj(xBase, yBase, 0), proj(xBase+KW, yBase, 0),
          proj(xBase+KW, yBase, KD), proj(xBase, yBase, KD),
          proj(xBase, yBase+KH, 0), proj(xBase+KW, yBase+KH, 0),
          proj(xBase+KW, yBase+KH, KD), proj(xBase, yBase+KH, KD),
        ];
        // Highlight all 6 faces
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#2B4C3F';
        [[0,1,2,3],[4,5,6,7],[0,3,7,4],[1,2,6,5],[0,1,5,4],[3,2,6,7]].forEach(face => {
          ctx.beginPath();
          face.forEach((i,n) => n===0 ? ctx.moveTo(...corners[i]) : ctx.lineTo(...corners[i]));
          ctx.closePath(); ctx.fill();
        });
        ctx.globalAlpha = 1;
        // Outline
        ctx.strokeStyle = '#2B4C3F';
        ctx.lineWidth = 2;
        [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => {
          ctx.beginPath(); ctx.moveTo(...corners[a]); ctx.lineTo(...corners[b]); ctx.stroke();
        });
        ctx.restore();
      }

      // Register hit region for cell
      kallaxHitRegions.push({
        id: 'cell', unitId: activeKu.id, cellIndex,
        poly: [proj(xBase,yBase,0),proj(xBase+KW,yBase,0),proj(xBase+KW,yBase+KH,0),proj(xBase,yBase+KH,0)],
        frontPoly: [proj(xBase,yBase,KD),proj(xBase+KW,yBase,KD),proj(xBase+KW,yBase+KH,KD),proj(xBase,yBase+KH,KD)],
        isCell: true,
      });
    }
  }

  // Draw shelf dividers on top
  const kEdgeD = (p1,p2,col,lw) => {
    ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2);
    ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.stroke();
  };
  for (let r = 1; r < rows; r++) {
    const y = r * KH;
    const d = [proj(0,y,0),proj(totalW,y,0),proj(totalW,y,KD),proj(0,y,KD)];
    ctx.beginPath(); d.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p)); ctx.closePath();
    ctx.fillStyle='rgba(150,142,130,0.35)'; ctx.fill();
    [[0,1],[1,2],[2,3],[3,0]].forEach(([a,b])=>kEdgeD(d[a],d[b],'#8A8278',2));
  }
  for (let c2 = 1; c2 < cols; c2++) {
    const x = c2 * KW;
    const d = [proj(x,0,0),proj(x,totalH,0),proj(x,totalH,KD),proj(x,0,KD)];
    ctx.beginPath(); d.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p)); ctx.closePath();
    ctx.fillStyle='rgba(150,142,130,0.28)'; ctx.fill();
  }
}

/* ── Layouts tab render ── */
function renderLayoutCard(layout) {
  const isActive = layout.id === activeLayoutId;
  const changed = layoutHasChanges(layout);
  const dateStr = new Date(layout.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const placedCount = layout.placements?.length || 0;
  const totalDims = games.filter(hasDims).length;
  const metaLine1 = layout.type === 'suggested'
    ? `${layout.sortScheme||'alpha'} · ${layout.storageMode||'upright'}`
    : `${placedCount} of ${totalDims} placed`;
  const metaLine2 = `${dateStr}${changed?' · ⚠ changed':''}`;
  return `<div class="layout-card${isActive?' active':''}">
    <div class="layout-info">
      <div class="layout-name">${layout.name}${isActive?' <span style="font-size:10px;font-family:var(--mono);color:var(--accent);">● active</span>':''}</div>
      <div class="layout-meta">${metaLine1}<br>${metaLine2}</div>
    </div>
    <div class="layout-btns">
      <button class="layout-btn" onclick="renameLayout('${layout.id}')">Rename</button>
      ${layout.type === 'suggested' ? `<button class="layout-btn" onclick="updateSuggestedLayout('${layout.id}')">Update</button>` : ''}
      ${layout.type === 'manual' ? `<button class="layout-btn" onclick="editManualLayout('${layout.id}')">Edit</button>` : ''}
      <button class="layout-btn${isActive?'':' primary'}" onclick="loadLayout('${layout.id}')">${isActive ? 'Loaded' : 'Load'}</button>
      <button class="layout-btn danger" onclick="deleteLayout('${layout.id}')">Delete</button>
    </div>
  </div>`;
}

function renderSuggestedLayouts() {
  const container = document.getElementById('layouts-suggested');
  if (!container) return;
  const suggested = layouts.filter(l => l.type === 'suggested');
  if (!suggested.length) {
    container.innerHTML = `<div style="font-size:12px;font-family:var(--mono);color:var(--text-light);padding:var(--s1) 0;">No saved suggested layouts yet.</div>`;
    return;
  }
  container.innerHTML = `<div class="layout-cards">${suggested.map(renderLayoutCard).join('')}</div>`;
}

function renderManualLayouts() {
  const container = document.getElementById('layouts-manual');
  if (!container) return;
  const manual = layouts.filter(l => l.type === 'manual');
  if (!manual.length) {
    container.innerHTML = `<div class="layouts-empty">
      <div style="font-size:40px;opacity:.3;">✋</div>
      <p>No manual layouts yet. Create one to place games exactly where you want them.</p>
    </div>`;
    return;
  }
  container.innerHTML = `<div class="layout-cards">${manual.map(renderLayoutCard).join('')}</div>`;
}

function renderLayoutsTab() {
  renderSuggestedLayouts();
  renderManualLayouts();
}

/* ── Init ── */
render();
updateStats();
setupKallaxHover();
renderKallaxTabs();
renderSuggestedLayouts(); renderManualLayouts();

// Event delegation for remove buttons in tab bar
document.getElementById('ku-tab-bar')?.addEventListener('click', e => {
  const btn = e.target.closest('.ku-remove-btn');
  if (!btn) return;
  const id = btn.dataset.kuId;
  const ku = myKallaxes.find(k => k.id === id);
  if (ku) confirmRemoveKu(id, ku.label);
});

document.getElementById('ku-tab-bar')?.addEventListener('mouseover', e => {
  if (e.target.closest('.ku-remove-btn')) e.target.style.color = 'var(--danger)';
});
document.getElementById('ku-tab-bar')?.addEventListener('mouseout', e => {
  if (e.target.closest('.ku-remove-btn')) e.target.style.color = 'var(--text-light)';
});

// Resize canvas whenever the wrap container changes size
const _kallaxWrap = document.getElementById('kallax-canvas-wrap');
const _ro = new ResizeObserver(() => {
  if (document.getElementById('tab-suggested').classList.contains('on')) renderKallax();
});
_ro.observe(_kallaxWrap);

const _manualWrap = document.getElementById('kallax-canvas-wrap-manual');
if (_manualWrap) {
  const _roManual = new ResizeObserver(() => {
    if (manualEditingId && document.getElementById('tab-manual').classList.contains('on')) {
      renderManualKallax();
    }
  });
  _roManual.observe(_manualWrap);
}
