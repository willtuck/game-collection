const SK = 'kallax-col-v2';
let games = (() => { try { return JSON.parse(localStorage.getItem(SK)) || []; } catch { return []; } })();
let addUnit = 'cm';
let kallaxMode = 'upright';   // 'upright' | 'stacked'
let manualStorageMode = 'upright'; // storage mode for manual placement
let kallaxSort = 'alpha';     // 'alpha'|'players'|'size'|'date-new'|'date-old'|'dims-last'
let addGameType = 'base';    // 'base' | 'expansion' — state for the add form
let addGameStorage = 'box';  // 'box' | 'inside' — state for the add form

// My Kallaxes — array of {id, model, label}
// model is cols x rows as a string e.g. '2x4' (always cols×rows, oriented as-is)
let activeKuId = null;
const KU_SK = 'my-kallaxes-v1';
let myKallaxes = (() => {
  try { return JSON.parse(localStorage.getItem(KU_SK)) || []; } catch { return []; }
})();
if (!myKallaxes.length) {
  myKallaxes = [{id:'ku1', model:'2x4', label:'My Kallax'}];
}
activeKuId = myKallaxes[0]?.id || null;
function saveKallaxes() { localStorage.setItem(KU_SK, JSON.stringify(myKallaxes)); }

function kuGrid(model) {
  const map = {'1x1':[1,1],'1x2':[1,2],'2x1':[2,1],'1x4':[1,4],'4x1':[4,1],
               '2x2':[2,2],'2x4':[2,4],'4x2':[4,2],'4x4':[4,4],'5x5':[5,5]};
  return map[model] || [2,4];
}
function kuLabel(model) {
  const labels = {'1x1':'1×1','1x2':'1×2 tall','2x1':'1×2 wide','1x4':'1×4 tall',
                  '4x1':'1×4 wide','2x2':'2×2','2x4':'2×4 tall','4x2':'2×4 wide','4x4':'4×4','5x5':'5×5'};
  return labels[model] || model;
}

function save() { localStorage.setItem(SK, JSON.stringify(games)); }

/* ── Theme ── */
function setTheme(theme) {
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gc-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('gc-theme');
  }
  // Sync the dropdown in case this was called programmatically
  const sel = document.getElementById('theme-select');
  if (sel) sel.value = theme || '';
}
// Restore saved theme selection in dropdown on load
(function() {
  const t = localStorage.getItem('gc-theme');
  if (t) { const sel = document.getElementById('theme-select'); if (sel) sel.value = t; }
})();

function toast(m) {
  const el = document.getElementById('toast');
  el.textContent = m; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ── Unit ── */
function setUnit(u) {
  addUnit = u;
  document.getElementById('ucm').classList.toggle('on', u==='cm');
  document.getElementById('uin').classList.toggle('on', u==='in');
  const ph = u==='cm' ? ['29.5','29.5','7.5'] : ['11.6','11.6','3.0'];
  ['add-w','add-h','add-d'].forEach((id,i) => document.getElementById(id).placeholder = ph[i]);
  updateAddPv();
}

function setManualMode(mode) {
  manualStorageMode = mode;
  document.getElementById('mmode-upright').classList.toggle('on', mode==='upright');
  document.getElementById('mmode-stacked').classList.toggle('on', mode==='stacked');
  renderManualKallax();
}

function setKallaxMode(mode) {
  kallaxMode = mode;
  document.getElementById('kmode-upright').classList.toggle('on', mode==='upright');
  document.getElementById('kmode-stacked').classList.toggle('on', mode==='stacked');
  updateStats();
  renderKallax();
}

function setKallaxSort(sort) {
  kallaxSort = sort;
  renderKallax();
}

/* ── Expansion helpers ── */
function baseGameOptionsHTML(excludeId, selectedId) {
  const opts = games
    .filter(g => g.type !== 'expansion' && g.id !== excludeId)
    .sort((a,b) => a.name.localeCompare(b.name))
    .map(g => `<option value="${g.id}"${g.id === selectedId ? ' selected' : ''}>${esc(g.name)}</option>`);
  return '<option value="">Select base game…</option>' + opts.join('');
}

// Add-form handlers
function setAddType(type) {
  addGameType = type;
  document.getElementById('atype-base').classList.toggle('on', type === 'base');
  document.getElementById('atype-expansion').classList.toggle('on', type === 'expansion');
  document.getElementById('add-expansion-fields').style.display = type === 'expansion' ? 'flex' : 'none';
  if (type === 'expansion') {
    document.getElementById('add-basegame').innerHTML = baseGameOptionsHTML(null, null);
    document.getElementById('add-storage-field').style.display = 'none';
    document.getElementById('add-dims-section').style.display = '';
  } else {
    addGameStorage = 'box';
    document.getElementById('add-dims-section').style.display = '';
  }
}

function updateAddBaseGame() {
  const val = document.getElementById('add-basegame').value;
  document.getElementById('add-storage-field').style.display = val ? '' : 'none';
  if (!val) {
    addGameStorage = 'box';
    document.getElementById('astorage-box').classList.add('on');
    document.getElementById('astorage-inside').classList.remove('on');
    document.getElementById('add-dims-section').style.display = '';
  }
}

function setAddStorage(mode) {
  addGameStorage = mode;
  document.getElementById('astorage-box').classList.toggle('on', mode === 'box');
  document.getElementById('astorage-inside').classList.toggle('on', mode === 'inside');
  document.getElementById('add-dims-section').style.display = mode === 'inside' ? 'none' : '';
}

// Edit-form handlers
function setEditType(id, type) {
  document.getElementById(`etype-base-${id}`).classList.toggle('on', type === 'base');
  document.getElementById(`etype-exp-${id}`).classList.toggle('on', type === 'expansion');
  document.getElementById(`edit-exp-fields-${id}`).style.display = type === 'expansion' ? 'flex' : 'none';
  document.getElementById(`edit-dims-section-${id}`).style.display = '';
  if (type === 'expansion') {
    document.getElementById(`ebasegame-${id}`).innerHTML = baseGameOptionsHTML(id, null);
    document.getElementById(`edit-storage-field-${id}`).style.display = 'none';
  }
}

function updateEditBaseGame(id) {
  const val = document.getElementById(`ebasegame-${id}`).value;
  document.getElementById(`edit-storage-field-${id}`).style.display = val ? '' : 'none';
  if (!val) {
    document.getElementById(`estorage-box-${id}`).classList.add('on');
    document.getElementById(`estorage-inside-${id}`).classList.remove('on');
    document.getElementById(`edit-dims-section-${id}`).style.display = '';
  }
}

function setEditStorage(id, mode) {
  document.getElementById(`estorage-box-${id}`).classList.toggle('on', mode === 'box');
  document.getElementById(`estorage-inside-${id}`).classList.toggle('on', mode === 'inside');
  document.getElementById(`edit-dims-section-${id}`).style.display = mode === 'inside' ? 'none' : '';
}

function getSortedForKallax() {
  // Exclude expansions stored inside their base game — they have no Kallax footprint
  const eligible = games.filter(g => hasDims(g) && !(g.type === 'expansion' && g.storedInside));

  function vol(g) {
    return parseFloat(g.width) * parseFloat(g.height) * parseFloat(g.depth);
  }

  const sorted = [...eligible];
  switch (kallaxSort) {
    case 'alpha':
      sorted.sort((a,b) => a.name.localeCompare(b.name));
      break;
    case 'alpha-desc':
      sorted.sort((a,b) => b.name.localeCompare(a.name));
      break;
    case 'players':
      sorted.sort((a,b) => {
        const am = parseInt(a.minPlayers)||99, bm = parseInt(b.minPlayers)||99;
        if (am !== bm) return am - bm;
        return a.name.localeCompare(b.name);
      });
      break;
    case 'size-desc':
      sorted.sort((a,b) => vol(b) - vol(a));
      break;
    case 'size-asc':
      sorted.sort((a,b) => vol(a) - vol(b));
      break;
    case 'date-new':
      sorted.sort((a,b) => new Date(b.added) - new Date(a.added));
      break;
    case 'date-old':
      sorted.sort((a,b) => new Date(a.added) - new Date(b.added));
      break;
    case 'dims-last':
      // eligible games first (already filtered), nothing changes
      break;
  }

  // Group: each game immediately followed by its boxed expansions, then all group-mates (each with their own expansions)
  const placedIds = new Set();
  const result = [];

  function placeWithExpansions(g) {
    if (placedIds.has(g.id)) return;
    placedIds.add(g.id);
    result.push(g);
    // Pull this game's boxed expansions immediately after it
    for (const exp of sorted) {
      if (!placedIds.has(exp.id) && exp.type === 'expansion' && exp.baseGameId === g.id) {
        placedIds.add(exp.id);
        result.push(exp);
      }
    }
  }

  for (const g of sorted) {
    if (placedIds.has(g.id)) continue;
    placeWithExpansions(g);
    // Pull all other games in the same group to follow immediately
    if (g.groupName) {
      for (const member of sorted) {
        if (!placedIds.has(member.id) && member.groupName === g.groupName) {
          placeWithExpansions(member);
        }
      }
    }
  }

  // Annotate each game with _cellGroup — the key used by the Kallax packer to keep
  // games together in the same cell.  Named groups take precedence; base + boxed
  // expansion clusters get a synthetic key so they follow the same rules.
  const baseIdsWithBoxedExpansions = new Set(
    result.filter(g => g.type === 'expansion' && g.baseGameId).map(g => g.baseGameId)
  );
  return result.map(g => {
    const cg = g.groupName
      || (g.type === 'expansion' && g.baseGameId ? `__base__${g.baseGameId}` : null)
      || (baseIdsWithBoxedExpansions.has(g.id) ? `__base__${g.id}` : null);
    return cg ? {...g, _cellGroup: cg} : g;
  });
}

/* ── Kallax unit management ── */
function openAddKallaxModal() {
  document.getElementById('ku-modal-name').value = '';
  document.getElementById('ku-modal-model').value = '2x4';
  document.getElementById('add-ku-backdrop').classList.add('show');
  updateKuPreview();
  setTimeout(() => document.getElementById('ku-modal-name').focus(), 50);
}

function closeAddKuModal(e) {
  if (e && e.target !== document.getElementById('add-ku-backdrop')) return;
  document.getElementById('add-ku-backdrop').classList.remove('show');
}

function confirmAddKu() {
  const model = document.getElementById('ku-modal-model').value;
  const label = document.getElementById('ku-modal-name').value.trim() || kuLabel(model);
  const id = 'ku' + Date.now().toString(36);
  myKallaxes.push({id, model, label});
  activeKuId = id;
  document.getElementById('add-ku-backdrop').classList.remove('show');
  saveKallaxes();
  renderKallaxTabs();
  renderKallax();
}

function updateKuPreview() {
  const model = document.getElementById('ku-modal-model').value;
  const [cols, rows] = kuGrid(model);
  const cv = document.getElementById('ku-preview-cv');
  if (!cv) return;

  const KW = KALLAX.w, KH = KALLAX.h, KD = KALLAX.d;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = 200 * dpr; cv.height = 200 * dpr;
  cv.style.width = '200px'; cv.style.height = '200px';

  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);

  const totalW = KW * cols, totalH = KH * rows;
  const {proj} = isoProject([
    [0,0,0],[totalW,0,0],[totalW,0,KD],[0,0,KD],
    [0,totalH,0],[totalW,totalH,0],[totalW,totalH,KD],[0,totalH,KD],
  ], cv.width, cv.height, 20);

  function kFace(pts, fill) {
    ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p));
    ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
  }
  function kEdge(p1,p2,col,lw) {
    ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2);
    ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.stroke();
  }

  const c = [
    proj(0,0,0), proj(totalW,0,0), proj(totalW,0,KD), proj(0,0,KD),
    proj(0,totalH,0), proj(totalW,totalH,0), proj(totalW,totalH,KD), proj(0,totalH,KD),
  ];
  kFace([c[0],c[3],c[7],c[4]],'rgba(160,152,140,0.22)');
  kFace([c[1],c[2],c[6],c[5]],'rgba(160,152,140,0.28)');
  kFace([c[0],c[1],c[2],c[3]],'rgba(160,152,140,0.32)');
  kFace([c[3],c[7],c[6],c[2]],'#5C5449');
  kEdge(c[3],c[7],'#3E3A33',1.5); kEdge(c[7],c[6],'#3E3A33',1.5);
  kEdge(c[6],c[2],'#3E3A33',1.5); kEdge(c[2],c[3],'#3E3A33',1.5);

  // Draw shelf dividers
  for (let r = 1; r < rows; r++) {
    const y = r * KH;
    const d = [proj(0,y,0),proj(totalW,y,0),proj(totalW,y,KD),proj(0,y,KD)];
    ctx.beginPath(); d.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p)); ctx.closePath();
    ctx.fillStyle='rgba(150,142,130,0.35)'; ctx.fill();
    [[0,1],[2,3]].forEach(([a,b])=>kEdge(d[a],d[b],'#8A8278',1));
  }
  for (let c2 = 1; c2 < cols; c2++) {
    const x = c2 * KW;
    const d = [proj(x,0,0),proj(x,totalH,0),proj(x,totalH,KD),proj(x,0,KD)];
    ctx.beginPath(); d.forEach((p,i)=>i===0?ctx.moveTo(...p):ctx.lineTo(...p)); ctx.closePath();
    ctx.fillStyle='rgba(150,142,130,0.28)'; ctx.fill();
  }
  [[c[0],c[4]],[c[7],c[3]],[c[5],c[6]],[c[6],c[2]],[c[3],c[2]]]
    .forEach(([p1,p2])=>kEdge(p1,p2,'#9A9288',1.5));
}


function removeKallaxUnit(id) {
  myKallaxes = myKallaxes.filter(k => k.id !== id);
  if (activeKuId === id) activeKuId = myKallaxes[0]?.id || null;
  saveKallaxes();
  renderKallaxTabs();
  renderKallax();
}

let _pendingRemoveKuId = null;
function confirmRemoveKu(id, label) {
  _pendingRemoveKuId = id;
  document.getElementById('del-game-name').textContent = label;
  document.getElementById('del-modal-body').innerHTML =
    `Remove <strong>${label}</strong> from your setup? This cannot be undone.`;
  document.getElementById('del-backdrop').classList.add('show');
}

function updateKallaxLabel(id, val) {
  const ku = myKallaxes.find(k => k.id === id);
  if (ku) { ku.label = val; saveKallaxes(); }
}


function renderKallaxTabs() {
  const tabBar = document.getElementById('ku-tab-bar');
  if (!tabBar) return;
  tabBar.innerHTML = myKallaxes.map(ku => {
    const isActive = ku.id === activeKuId;
    const removeBtn = isActive
      ? `<div style="text-align:center;margin-top:2px;margin-bottom:4px;">
           <button data-ku-id="${ku.id}" class="ku-remove-btn" tabindex="0"
             style="border:none;background:transparent;cursor:pointer;font-size:10px;font-family:var(--mono);color:var(--text-light);padding:0;text-decoration:underline;text-underline-offset:2px;line-height:1;">remove</button>
         </div>`
      : '';
    const tabContent = isActive
      ? `<input id="ku-label-input-${ku.id}" class="ku-tab on"
           value="${ku.label.replace(/"/g, '&quot;')}"
           style="min-width:80px;width:${Math.max(80, ku.label.length * 10 + 32)}px;max-width:240px;text-align:center;cursor:text;box-sizing:border-box;"
           oninput="this.style.width=Math.max(80,this.value.length*10+32)+'px'"
           onblur="if(!event.relatedTarget?.classList.contains('ku-remove-btn'))saveKuLabel('${ku.id}', this.value)"
           onkeydown="if(event.key==='Enter')this.blur()" />`
      : `<button class="ku-tab" onclick="setActiveKu('${ku.id}')">${ku.label}</button>`;
    return `<div style="display:inline-flex;flex-direction:column;align-items:center;">
      ${tabContent}
      ${removeBtn}
    </div>`;
  }).join('');
}

function setActiveKu(id) {
  activeKuId = id;
  renderKallaxTabs();
  renderKallax();
}

function saveKuLabel(id, val) {
  const ku = myKallaxes.find(k => k.id === id);
  if (!ku) return;
  ku.label = val.trim() || kuLabel(ku.model);
  saveKallaxes();
  renderKallaxTabs();
}

function sizeCanvasForUnit(canvas, cols, rows, availW, availH) {
  const KD=38, KW=33, KH=33;
  const totalW = KW*cols, totalH = KH*rows;
  const cosA = Math.cos(Math.PI/6), sinA = Math.sin(Math.PI/6);
  const projW = (totalW+KD)*cosA;
  const projH = (totalW+KD)*sinA + totalH + KD*sinA;
  const ratio = projH/projW;
  const pad = 32;
  let cW = availW - pad;
  let cH = Math.round(cW * ratio);
  if (cH > availH - pad) { cH = availH - pad; cW = Math.round(cH / ratio); }
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  canvas.width = cW*dpr; canvas.height = cH*dpr;
  canvas.style.width = cW+'px'; canvas.style.height = cH+'px';
}

function resizeKallaxCanvas() {
  const wrap = document.getElementById('kallax-canvas-wrap');
  const availW = wrap?.clientWidth || 600;
  const availH = wrap?.clientHeight || availW;
  myKallaxes.forEach(ku => {
    const cv = document.getElementById('kcv-'+ku.id);
    if (!cv) return;
    const [cols, rows] = kuGrid(ku.model);
    sizeCanvasForUnit(cv, cols, rows, availW, availH);
  });
}

function toCm(val, unit) {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return null;
  return unit === 'in' ? (n * 2.54).toFixed(1) : n.toFixed(1);
}

/* ── Add ── */
function addGame() {
  const nEl = document.getElementById('add-name');
  const name = nEl.value.trim();
  const eEl = document.getElementById('name-err');
  if (!name) { eEl.textContent = 'Game name is required.'; nEl.focus(); return; }
  eEl.textContent = '';

  const baseGameId = addGameType === 'expansion'
    ? (document.getElementById('add-basegame').value || null)
    : null;
  const storedInside = addGameType === 'expansion' && addGameStorage === 'inside';
  const groupName = (document.getElementById('add-group').value || '').trim() || undefined;

  games.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    name,
    type: addGameType === 'expansion' ? 'expansion' : undefined,
    baseGameId: baseGameId || undefined,
    storedInside: storedInside || undefined,
    groupName,
    width:  storedInside ? null : toCm(document.getElementById('add-w').value, addUnit),
    height: storedInside ? null : toCm(document.getElementById('add-h').value, addUnit),
    depth:  storedInside ? null : toCm(document.getElementById('add-d').value, addUnit),
    unit: addUnit,
    added: new Date().toISOString(),
  });

  save(); render(); updateStats();
  nEl.value=''; document.getElementById('add-w').value='';
  document.getElementById('add-h').value=''; document.getElementById('add-d').value='';
  document.getElementById('add-group').value='';
  document.getElementById('add-pv').style.display='none';
  // Reset expansion state
  addGameType = 'base'; addGameStorage = 'box';
  document.getElementById('atype-base').classList.add('on');
  document.getElementById('atype-expansion').classList.remove('on');
  document.getElementById('add-expansion-fields').style.display = 'none';
  document.getElementById('add-dims-section').style.display = '';
  nEl.focus(); toast(`Added "${name}"`);
}

/* ── Delete ── */
let _pendingDeleteId = null;

function deleteGame(id) {
  const g = games.find(g=>g.id===id); if(!g) return;
  _pendingDeleteId = id;
  document.getElementById('del-game-name').textContent = g.name;
  document.getElementById('del-backdrop').classList.add('show');
}

function closeDelModal(e) {
  if (e && e.target !== document.getElementById('del-backdrop')) return;
  document.getElementById('del-backdrop').classList.remove('show');
  _pendingDeleteId = null;
  _pendingRemoveKuId = null;
  _pendingDeleteLayoutId = null;
}

function confirmDelete() {
  if (_pendingRemoveKuId) {
    removeKallaxUnit(_pendingRemoveKuId);
    _pendingRemoveKuId = null;
    document.getElementById('del-backdrop').classList.remove('show');
    toast('Kallax unit removed.');
    return;
  }
  if (_pendingDeleteLayoutId) {
    layouts = layouts.filter(l => l.id !== _pendingDeleteLayoutId);
    if (activeLayoutId === _pendingDeleteLayoutId) clearActiveLayout();
    _pendingDeleteLayoutId = null;
    document.getElementById('del-backdrop').classList.remove('show');
    saveLayouts();
    renderSuggestedLayouts(); renderManualLayouts();
    toast('Layout deleted.');
    return;
  }
  if (!_pendingDeleteId) return;
  const g = games.find(g=>g.id===_pendingDeleteId);
  games = games.filter(g=>g.id!==_pendingDeleteId);
  _pendingDeleteId = null;
  document.getElementById('del-backdrop').classList.remove('show');
  save(); render(); updateStats();
  if (g) toast(`Removed "${g.name}"`);
}

/* ── Edit ── */
function startEdit(id) {
  const g = games.find(g=>g.id===id); if(!g) return;
  const card = document.getElementById('card-'+id);
  card.querySelector('.ccwrap').classList.add('editing');
  card.querySelector('.cview').classList.add('off');
  card.querySelector('.cedit').classList.add('on');

  const eu = g.unit||'cm';
  document.getElementById('eu-'+id).value = eu;
  updateEuLabel(id, eu);

  const disp = v => !v ? '' : eu==='in' ? (parseFloat(v)/2.54).toFixed(2) : v;
  document.getElementById('en-'+id).value = g.name;
  document.getElementById('ew-'+id).value = disp(g.width);
  document.getElementById('eh-'+id).value = disp(g.height);
  document.getElementById('ed-'+id).value = disp(g.depth);

  updateEditPv(id);
  document.getElementById('en-'+id).focus();
}

function updateEuLabel(id, u) {
  const btn = document.getElementById('eulbl-'+id);
  if (btn) btn.textContent = u;
  const ph = u==='cm' ? {w:'29.5',h:'29.5',d:'7.5'} : {w:'11.6',h:'11.6',d:'3.0'};
  ['w','h','d'].forEach(k => { const el=document.getElementById(`e${k}-${id}`); if(el) el.placeholder=ph[k]; });
}

function toggleEu(id) {
  const sel = document.getElementById('eu-'+id);
  const oldU = sel.value, newU = oldU==='cm'?'in':'cm';
  sel.value = newU;
  ['w','h','d'].forEach(k => {
    const el = document.getElementById(`e${k}-${id}`);
    const v = parseFloat(el.value);
    if (!isNaN(v) && v>0) el.value = newU==='in' ? (v/2.54).toFixed(2) : (v*2.54).toFixed(1);
  });
  updateEuLabel(id, newU);
  updateEditPv(id);
}

function cancelEdit(id) {
  const card = document.getElementById('card-'+id);
  card.querySelector('.ccwrap').classList.remove('editing');
  card.querySelector('.cview').classList.remove('off');
  card.querySelector('.cedit').classList.remove('on');
}

function saveEdit(id) {
  const g = games.find(g=>g.id===id); if(!g) return;
  const name = document.getElementById('en-'+id).value.trim(); if(!name) return;
  const eu = document.getElementById('eu-'+id).value;
  const isExp = document.getElementById(`etype-exp-${id}`)?.classList.contains('on');
  const baseGameId = isExp ? (document.getElementById(`ebasegame-${id}`)?.value || null) : null;
  const storedInside = isExp && document.getElementById(`estorage-inside-${id}`)?.classList.contains('on');

  const groupName = (document.getElementById(`egroup-${id}`)?.value || '').trim() || undefined;
  g.name   = name;
  g.type   = isExp ? 'expansion' : undefined;
  g.baseGameId = baseGameId || undefined;
  g.storedInside = storedInside || undefined;
  g.groupName = groupName;
  if (!storedInside) {
    g.width  = toCm(document.getElementById('ew-'+id).value, eu);
    g.height = toCm(document.getElementById('eh-'+id).value, eu);
    g.depth  = toCm(document.getElementById('ed-'+id).value, eu);
  }
  g.unit   = eu;
  // Clear dims filter if game now has dimensions and was hidden
  if (hasDims(g)) {
    const f = document.getElementById('dims-filter');
    if (f && f.value === 'missing') f.value = 'all';
  }
  save(); render(); updateStats(); toast(`Updated "${name}"`);
}

/* ── Helpers ── */
function hasDims(g) {
  return g.width && g.height && g.depth &&
    parseFloat(g.width)>0 && parseFloat(g.height)>0 && parseFloat(g.depth)>0;
}
function fmtDims(g) {
  const u = g.unit||'cm';
  const cv = v => u==='in' ? (parseFloat(v)/2.54).toFixed(1) : v;
  return `${cv(g.width)} × ${cv(g.height)} × ${cv(g.depth)} ${u}`;
}
function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function groupNames() {
  return [...new Set(games.map(g => g.groupName).filter(Boolean))].sort();
}

function showGroupSuggest(input) {
  hideGroupSuggest();
  const val = input.value.toLowerCase();
  const matches = groupNames().filter(n => {
    const nl = n.toLowerCase();
    return nl !== val && (!val || nl.includes(val));
  });
  if (!matches.length) return;
  const rect = input.getBoundingClientRect();
  const el = document.createElement('div');
  el.id = 'group-suggest';
  el.className = 'group-suggest';
  el.style.top  = rect.bottom + 2 + 'px';
  el.style.left = rect.left + 'px';
  el.style.width = rect.width + 'px';
  matches.forEach(name => {
    const opt = document.createElement('div');
    opt.className = 'group-suggest-opt';
    opt.textContent = name;
    opt.addEventListener('mousedown', e => {
      e.preventDefault(); // keep focus on input so blur doesn't fire first
      input.value = name;
      hideGroupSuggest();
    });
    el.appendChild(opt);
  });
  document.body.appendChild(el);
}

function hideGroupSuggest() {
  const el = document.getElementById('group-suggest');
  if (el) el.remove();
}

// Event delegation for group inputs (add form + all edit forms)
document.addEventListener('focus', e => {
  if (e.target.id === 'add-group' || e.target.id.startsWith('egroup-')) showGroupSuggest(e.target);
}, true);
document.addEventListener('input', e => {
  if (e.target.id === 'add-group' || e.target.id.startsWith('egroup-')) showGroupSuggest(e.target);
}, true);
document.addEventListener('blur', e => {
  if (e.target.id === 'add-group' || e.target.id.startsWith('egroup-')) setTimeout(hideGroupSuggest, 120);
}, true);

/* ── Render ── */
function getSorted() {
  const q = document.getElementById('srch').value.toLowerCase();
  const s = document.getElementById('srt').value;
  const f = document.getElementById('dims-filter')?.value || 'all';

  const pf = document.getElementById('players-filter')?.value || 'all';
  const tf = document.getElementById('type-filter')?.value || 'all';
  let list = [...games];
  if (q) list = list.filter(g => g.name.toLowerCase().includes(q));
  if (f === 'has')     list = list.filter(g => hasDims(g));
  if (f === 'missing') list = list.filter(g => !hasDims(g));
  if (tf === 'base')      list = list.filter(g => g.type !== 'expansion');
  if (tf === 'expansion') list = list.filter(g => g.type === 'expansion');
  if (pf !== 'all') {
    const n = parseInt(pf);
    list = list.filter(g => {
      if (!g.minPlayers && !g.maxPlayers) return false;
      const mn = parseInt(g.minPlayers) || 1;
      const mx = parseInt(g.maxPlayers) || mn;
      if (n === 6) return mx >= 6;
      return mn <= n && mx >= n;
    });
  }

  list.sort((a,b) => {
    if(s==='name-asc')     return a.name.localeCompare(b.name);
    if(s==='name-desc')    return b.name.localeCompare(a.name);
    if(s==='date-desc')    return new Date(b.added)-new Date(a.added);
    if(s==='date-asc')     return new Date(a.added)-new Date(b.added);
    if(s==='missing-first') return (hasDims(a)?1:0)-(hasDims(b)?1:0);
    return 0;
  });
  return list;
}

function render() {
  const grid = document.getElementById('ggrid');
  const list = getSorted();
  document.getElementById('hct').textContent = games.length===1?'1 game':`${games.length} games`;
  const countEl = document.getElementById('filter-count');
  if (countEl) {
    const n = list.length;
    const total = games.length;
    if (n === total) {
      countEl.textContent = `${total} game${total===1?'':'s'}`;
    } else {
      countEl.textContent = `${n} of ${total} game${total===1?'':'s'}`;
    }
  }

  if (!list.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">♟</div><p>${
      games.length===0 ? 'Your collection is empty.<br>Add your first game using the form.' : 'No games match your search.'
    }</p></div>`;
    return;
  }

  grid.innerHTML = list.map(g => {
    const eu = g.unit||'cm';
    const disp = v => !v?'': eu==='in'?(parseFloat(v)/2.54).toFixed(2):v;
    const isExpansion = g.type === 'expansion';
    const isStoredInside = isExpansion && g.storedInside;
    const baseGame = isExpansion && g.baseGameId ? games.find(bg => bg.id === g.baseGameId) : null;
    const hasExpansions = !isExpansion && games.some(e => e.type === 'expansion' && e.baseGameId === g.id);
    const gc = gameColor(g.id);

    // Dims display
    const dims = isStoredInside
      ? `<span class="exp-stored-badge">stored within${baseGame ? ` ${esc(baseGame.name)}` : ' base game'}</span>`
      : hasDims(g)
        ? `<span class="ddisplay">${fmtDims(g)}</span>`
        : `<span class="dmiss">dims missing</span>`;

    // Type badges
    const typeBadge = isExpansion
      ? `<div class="exp-badge">${baseGame ? `expansion · ${esc(baseGame.name)}` : 'expansion'}</div>`
      : hasExpansions
        ? `<div class="base-badge">base game</div>`
        : '';
    const groupBadge = g.groupName
      ? `<div class="group-badge">group · ${esc(g.groupName)}</div>`
      : '';

    // Canvas strip
    const canvasPart = hasDims(g)
      ? `<canvas id="cc-${g.id}" width="280" height="120"></canvas>`
      : isStoredInside
        ? `<div class="nodims" style="background:${gc.fill.replace(/[\d.]+\)$/, '0.04)')}"><span style="font-size:13px;opacity:0.4;">📦</span><span>stored within base game</span></div>`
        : `<div class="nodims" style="background:${gc.fill.replace(/[\d.]+\)$/, '0.04)')}"><span style="font-size:16px;opacity:0.3;">⬜</span><span>needs dimensions</span></div>`;


    const editTypeFields = `
      <div class="field">
        <label>Type</label>
        <div class="utog">
          <button class="ubtn${!isExpansion?' on':''}" id="etype-base-${g.id}" onclick="setEditType('${g.id}','base')">Base Game</button>
          <button class="ubtn${isExpansion?' on':''}" id="etype-exp-${g.id}" onclick="setEditType('${g.id}','expansion')">Expansion</button>
        </div>
      </div>
      <div id="edit-exp-fields-${g.id}" style="display:${isExpansion?'flex':'none'};flex-direction:column;gap:var(--s2);">
        <div class="field">
          <label>Base Game</label>
          <select id="ebasegame-${g.id}" onchange="updateEditBaseGame('${g.id}')">
            ${baseGameOptionsHTML(g.id, g.baseGameId)}
          </select>
        </div>
        <div class="field" id="edit-storage-field-${g.id}" style="display:${g.baseGameId?'':'none'};">
          <label>Storage</label>
          <div class="utog">
            <button class="ubtn${!g.storedInside?' on':''}" id="estorage-box-${g.id}" onclick="setEditStorage('${g.id}','box')">In Expansion Box</button>
            <button class="ubtn${g.storedInside?' on':''}" id="estorage-inside-${g.id}" onclick="setEditStorage('${g.id}','inside')">Stored Within Base Game</button>
          </div>
        </div>
      </div>`;

    return `<div class="gcard" id="card-${g.id}" style="border-top:3px solid ${gc.stroke};">
  <div class="ccwrap" style="background:${gc.fill.replace(/[\d.]+\)$/, '0.06)')};"><div id="ccwrap-${g.id}">${canvasPart}</div></div>
  <div class="cbody">
    <div class="cview">
      <div class="ctop">
        <div class="gname">${esc(g.name)}</div>
        <div class="cact">
          <button class="ico" onclick="startEdit('${g.id}')" title="Edit">✎</button>
          <button class="ico del" onclick="deleteGame('${g.id}')" title="Delete">✕</button>
        </div>
      </div>
      ${typeBadge}
      ${groupBadge}
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${dims}
        ${g.minPlayers || g.maxPlayers ? `<span class="pcount">${
          g.minPlayers === g.maxPlayers || !g.maxPlayers
            ? g.minPlayers + (parseInt(g.minPlayers)===1?' player':' players')
            : g.minPlayers + '–' + g.maxPlayers + ' players'
        }</span>` : ''}
      </div>
      <div class="cdate">Added ${fmtDate(g.added)}</div>
    </div>
    <div class="cedit">
      <input type="hidden" id="eu-${g.id}" value="${eu}" />
      <div class="field">
        <label>Game name</label>
        <input type="text" id="en-${g.id}" value="${esc(g.name)}" />
      </div>
      ${editTypeFields}
      <div class="field">
        <label>Group <span style="font-family:var(--mono);font-size:10px;color:var(--text-light);font-weight:normal;">(optional)</span></label>
        <input type="text" id="egroup-${g.id}" value="${esc(g.groupName||'')}" placeholder="e.g. Trilogy, Shelf A…" />
      </div>
      <div id="edit-dims-section-${g.id}" style="${isStoredInside?'display:none;':''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s1);">
          <span style="font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.07em;color:var(--text-light);">Dimensions</span>
          <button id="eulbl-${g.id}" onclick="toggleEu('${g.id}')" style="font-family:var(--mono);font-size:11px;padding:2px var(--s2);border:1px solid var(--border-mid);border-radius:20px;background:var(--accent-light);color:var(--accent);cursor:pointer;">${eu}</button>
        </div>
        <div class="edimrow">
          <div class="field"><label>Width</label><input type="number" id="ew-${g.id}" value="${disp(g.width)}" step="0.1" min="0" placeholder="29.5" oninput="updateEditPv('${g.id}')" /></div>
          <div class="field"><label>Height</label><input type="number" id="eh-${g.id}" value="${disp(g.height)}" step="0.1" min="0" placeholder="29.5" oninput="updateEditPv('${g.id}')" /></div>
          <div class="field"><label>Depth</label><input type="number" id="ed-${g.id}" value="${disp(g.depth)}" step="0.1" min="0" placeholder="7.5" oninput="updateEditPv('${g.id}')" /></div>
        </div>
        <div class="ecpv" id="ecpv-${g.id}">
          <canvas id="ec-${g.id}" width="280" height="120"></canvas>
          <div class="ecpvlbl" id="eclbl-${g.id}"></div>
        </div>
      </div>
      <div class="eact">
        <button class="bsave" onclick="saveEdit('${g.id}')">Save</button>
        <button class="bcancel" onclick="cancelEdit('${g.id}')">Cancel</button>
      </div>
    </div>
  </div>
</div>`;
  }).join('');

  // Draw wireframes for cards with dims
  requestAnimationFrame(() => {
    list.filter(hasDims).forEach(g => {
      const c = document.getElementById('cc-'+g.id);
      if (c) drawBox(c, parseFloat(g.width), parseFloat(g.height), parseFloat(g.depth), gameColor(g.id));
    });
  });
}

function updateStats() {
  const tot = games.length;
  const wd  = games.filter(hasDims).length;
  // Estimate cells needed based on current storage mode
  // Exclude storedInside expansions — they have no Kallax footprint
  const KW = KALLAX.w, KH = KALLAX.h, KD = KALLAX.d;
  const withDims = games.filter(g => hasDims(g) && !(g.type === 'expansion' && g.storedInside));
  let cellsEst = '—', modeLabel = '';

  if (withDims.length > 0) {
    if (kallaxMode === 'upright') {
      // Each game uses its depth (spine) as lateral width; fit as many as possible per cell
      const totalSpine = withDims.reduce((s,g) => s + parseFloat(g.depth), 0);
      cellsEst = Math.ceil(totalSpine / KW);
      modeLabel = 'vertical';
    } else {
      // Each game uses its smallest dim as stack height; fit as many as possible per cell
      const totalStack = withDims.reduce((s,g) => {
        return s + Math.min(parseFloat(g.width), parseFloat(g.height), parseFloat(g.depth));
      }, 0);
      cellsEst = Math.ceil(totalStack / KH);
      modeLabel = 'horizontal';
    }
  }

  document.getElementById('st-tot').textContent = tot;
  document.getElementById('st-dim').textContent = wd;
  document.getElementById('st-mis').textContent = tot-wd;
  document.getElementById('st-vol').textContent = cellsEst;
  const modeEl = document.getElementById('st-vol-mode');
  if (modeEl) modeEl.textContent = modeLabel;
}

/* ── 3D Wireframe ── */
// Box lies flat. w=width (left-right), h=length (recedes back), d=thickness (vertical, thin side).
// Strategy: project at origin first, compute actual bounding box, then offset to center in canvas.
function drawBox(canvas, w, h, d, col) {
  col = col || {fill:'rgba(74,124,101,0.10)', stroke:'#4A7C65'};
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  ctx.clearRect(0, 0, CW, CH);

  const ang = Math.PI / 6;
  const cosA = Math.cos(ang), sinA = Math.sin(ang);

  // Raw projection at unit scale, no offset
  function projRaw(x, y, z, sc) {
    return [
      (x - z) * cosA * sc,
      -(y * sc) + (x + z) * sinA * sc
    ];
  }

  // Corner definitions (scale=1 for sizing)
  const corners3d = [
    [0,0,0],[w,0,0],[w,0,h],[0,0,h],
    [0,d,0],[w,d,0],[w,d,h],[0,d,h],
  ];

  // Estimate scale to fit with padding
  const pad = 30;
  const rawPts1 = corners3d.map(([x,y,z]) => projRaw(x,y,z,1));
  const xs1 = rawPts1.map(p=>p[0]), ys1 = rawPts1.map(p=>p[1]);
  const rw = Math.max(...xs1)-Math.min(...xs1);
  const rh = Math.max(...ys1)-Math.min(...ys1);
  const scale = Math.min((CW-pad*2)/rw, (CH-pad*2)/rh) * 0.92;

  // Project all corners at final scale
  const rawPts = corners3d.map(([x,y,z]) => projRaw(x,y,z,scale));

  // Compute bounding box of projected points
  const xs = rawPts.map(p=>p[0]), ys = rawPts.map(p=>p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const bw = maxX - minX, bh = maxY - minY;

  // Offset so bounding box is centered in canvas
  const ox = (CW - bw) / 2 - minX;
  const oy = (CH - bh) / 2 - minY;

  const P = rawPts.map(([x,y]) => [x + ox, y + oy]);

  // Helper to project a 3d point with offset (for labels)
  function proj(x, y, z) {
    const [rx, ry] = projRaw(x, y, z, scale);
    return [rx + ox, ry + oy];
  }

  const E = col.stroke, Eh = '#C5BEB2';
  // Parse fill rgba and build face fills at different opacities
  const fillBase = col.fill.replace(/[\d.]+\)$/, '');
  function fillAt(a) { return fillBase + a + ')'; }

  function face(idx, fill) {
    ctx.beginPath();
    idx.forEach((i,n) => n===0 ? ctx.moveTo(...P[i]) : ctx.lineTo(...P[i]));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function edge(a, b, hidden) {
    ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[b]);
    ctx.strokeStyle = hidden ? Eh : E;
    ctx.lineWidth   = hidden ? 1 : 1.5;
    ctx.setLineDash(hidden ? [3,3] : []);
    ctx.stroke(); ctx.setLineDash([]);
  }

  // Faces — painter's order (back to front)
  face([3,7,6,2], fillAt('0.05')); // back
  face([0,3,7,4], fillAt('0.05')); // left
  face([2,6,5,1], fillAt('0.06')); // right
  face([0,1,2,3], fillAt('0.03')); // bottom
  face([0,1,5,4], fillAt('0.08')); // front
  face([4,5,6,7], fillAt('0.14')); // top (biggest face)

  // Hidden edges (dashed)
  edge(3, 0, true);
  edge(3, 2, true);
  edge(0, 1, true);

  // Visible edges
  edge(4, 5, false); edge(5, 6, false); edge(6, 7, false); edge(7, 4, false); // top face
  edge(4, 0, false); edge(5, 1, false); edge(6, 2, false); edge(7, 3, false); // pillars
  edge(1, 2, false); // front-bottom

  // Dimension labels
  ctx.font = "10px 'DM Mono', monospace";
    ctx.fillStyle = col.stroke; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const wm = proj(w/2, d, 0);  ctx.fillText('W', wm[0], wm[1] - 9);
  const lm = proj(w, d, h/2);  ctx.fillText('L', lm[0] + 11, lm[1]);
  const dm = proj(0, d/2, 0);  ctx.fillText('D', dm[0] - 10, dm[1]);
}

/* ── Add preview ── */
function updateAddPv() {
  const w = parseFloat(document.getElementById('add-w').value)||0;
  const h = parseFloat(document.getElementById('add-h').value)||0;
  const d = parseFloat(document.getElementById('add-d').value)||0;
  const pv = document.getElementById('add-pv');
  if (!w && !h && !d) { pv.style.display='none'; return; }
  pv.style.display = 'block';
  const tc = v => addUnit==='in' ? v*2.54 : v;
  drawBox(document.getElementById('add-cv'), tc(w||1), tc(h||1), tc(d||1));
  const u = addUnit, parts=[];
  if(w) parts.push(w.toFixed(1)+'W');
  if(h) parts.push(h.toFixed(1)+'H');
  if(d) parts.push(d.toFixed(1)+'D');
  document.getElementById('add-pvlbl').textContent = parts.join(' × ')+' '+u;
}

/* ── Edit preview ── */
function updateEditPv(id) {
  const eu = document.getElementById('eu-'+id).value||'cm';
  const w = parseFloat(document.getElementById('ew-'+id).value)||0;
  const h = parseFloat(document.getElementById('eh-'+id).value)||0;
  const d = parseFloat(document.getElementById('ed-'+id).value)||0;
  const pv = document.getElementById('ecpv-'+id);
  if (!pv) return;
  if (!w && !h && !d) { pv.style.display='none'; return; }
  pv.style.display = 'block';
  const tc = v => eu==='in' ? v*2.54 : v;
  const c = document.getElementById('ec-'+id);
  if (c) drawBox(c, tc(w||1), tc(h||1), tc(d||1), gameColor(id));
  const parts=[];
  if(w) parts.push(w.toFixed(1)+'W');
  if(h) parts.push(h.toFixed(1)+'H');
  if(d) parts.push(d.toFixed(1)+'D');
  const lbl = document.getElementById('eclbl-'+id);
  if (lbl) lbl.textContent = parts.join(' × ')+' '+eu;
}

/* ── Export / Import ── */
function exportCSV() {
  if (!games.length) { toast('Nothing to export yet.'); return; }
  const cols = ['id','name','minPlayers','maxPlayers','width','height','depth','unit','type','baseGameId','baseGameName','storedInside','groupName','added'];
  const rows = games.map(g => {
    const baseGame = g.baseGameId ? games.find(bg => bg.id === g.baseGameId) : null;
    const row = {
      ...g,
      type: g.type || 'base',
      baseGameId: g.baseGameId || '',
      baseGameName: baseGame ? baseGame.name : '',
      storedInside: g.storedInside ? 'true' : '',
    };
    return cols.map(k => {
      const v = row[k] == null ? '' : String(row[k]);
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(',');
  });
  dl(new Blob([[cols.join(','),...rows].join('\n')],{type:'text/csv'}), 'game-collection.csv');
}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);}

function importBGGCSV(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => toast('File read error.');
  reader.onload = ev => {
    try {
      const text = ev.target.result;
      if (!text || !text.trim()) { toast('BGG CSV: file is empty.'); return; }

      function parseCSVLine(line) {
        const result = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i+1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
          } else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
          else cur += ch;
        }
        result.push(cur);
        return result;
      }

      const allLines = text.split(/\r?\n/);
      const rawHeader = allLines[0].replace(/^\uFEFF/, '');
      const headers = parseCSVLine(rawHeader).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

      const nameCol = ['objectname','name','gamename','title'].find(k => headers.includes(k));
      if (!nameCol) {
        toast('BGG CSV: no name column. Columns: ' + headers.slice(0,5).join(', '));
        return;
      }
      const nameIdx = headers.indexOf(nameCol);

      // BGG CSV uses various column name formats — try all known variants
      const minPCandidates = ['minplayers','min players','minimum players','minplayers_best','minplaytime','stats.minplayers'];
      const maxPCandidates = ['maxplayers','max players','maximum players','maxplayers_best','maxplaytime','stats.maxplayers'];
      const minPIdx = headers.findIndex(h => minPCandidates.includes(h) || h.includes('minplay') || (h.includes('min') && h.includes('player')));
      const maxPIdx = headers.findIndex(h => maxPCandidates.includes(h) || h.includes('maxplay') || (h.includes('max') && h.includes('player')));

      // Build lookup of existing games by lowercase name for merging
      const existingByName = {};
      games.forEach(g => { existingByName[g.name.toLowerCase().trim()] = g; });
      const seenNames = new Set();

      let added = 0, updated = 0, skipped = 0;
      const newGames = [];
      const ts = Date.now();

      for (let i = 1; i < allLines.length; i++) {
        const line = allLines[i];
        if (!line.trim()) continue;
        const cols = parseCSVLine(line);
        const raw = (cols[nameIdx] || '').trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (seenNames.has(key)) continue; // skip dupes within the CSV itself
        seenNames.add(key);

        const minP = minPIdx >= 0 ? (cols[minPIdx]||'').trim() || null : null;
        const maxP = maxPIdx >= 0 ? (cols[maxPIdx]||'').trim() || null : null;

        if (existingByName[key]) {
          // Merge: update player counts on existing game if we have new data
          const existing = existingByName[key];
          let changed = false;
          if (minP && !existing.minPlayers) { existing.minPlayers = minP; changed = true; }
          if (maxP && !existing.maxPlayers) { existing.maxPlayers = maxP; changed = true; }
          if (changed) updated++;
          else skipped++;
        } else {
          newGames.push({
            id: (ts + i).toString(36) + Math.random().toString(36).slice(2,5),
            name: raw,
            minPlayers: minP,
            maxPlayers: maxP,
            width: null, height: null, depth: null,
            unit: 'cm',
            added: new Date().toISOString(),
          });
          added++;
        }
      }

      if (added === 0 && updated === 0 && skipped === 0) { toast('BGG CSV: no games found.'); return; }

      games = [...newGames, ...games];
      save(); render(); updateStats();

      // Build summary toast
      const parts = [];
      if (added > 0)   parts.push(`${added} new`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (skipped > 0) parts.push(`${skipped} unchanged`);

      // Also report which player columns were found
      const pColInfo = minPIdx >= 0 ? ` · players from "${headers[minPIdx]}"` : ' · no player cols found';
      toast(`BGG import: ${parts.join(', ')}${pColInfo}`);

      if (added > 0) {
        const f = document.getElementById('dims-filter');
        if (f) { f.value = 'missing'; render(); }
      }
    } catch(err) {
      toast('BGG CSV error: ' + (err.message || String(err)));
    }
  };
  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
}

/* ── Keyboard shortcuts ── */
document.getElementById('add-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('add-w').focus();}});
['add-w','add-h'].forEach((id,i)=>document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById(['add-h','add-d'][i]).focus();}}));
document.getElementById('add-d').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addGame();}});
document.addEventListener('keydown', e => {
  if(e.key==='Escape') { closeDelModal(); closeAddKuModal(); }
});

/* ── Tab switching ── */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    const names = ['collection','suggested','manual'];
    t.classList.toggle('on', names[i] === name);
  });
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('on'));
  document.getElementById('tab-'+name).classList.add('on');

  // Swap sidebar panels
  document.getElementById('sb-collection').style.display = name === 'collection' ? '' : 'none';
  document.getElementById('sb-suggested').style.display  = name === 'suggested'  ? '' : 'none';
  document.getElementById('sb-manual').style.display     = name === 'manual'     ? 'flex' : 'none';

  // Sidebar always visible — remove no-sidebar
  document.getElementById('app-layout').classList.remove('no-sidebar');

  if (name === 'suggested') {
    requestAnimationFrame(() => { resizeKallaxCanvas(); renderKallax(); });
    renderSuggestedLayouts();
    renderKallaxTabs();
  }
  if (name === 'manual') {
    if (manualEditingId) {
      showManualEditView(layouts.find(l=>l.id===manualEditingId)?.name || '');
    } else {
      showManualListView();
    }
  }
}

