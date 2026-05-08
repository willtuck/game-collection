import type { PackableGame, PackedGame } from './types';

export const KALLAX = { w: 33, h: 33, d: 38 }; // cm, interior dimensions
export const MAX_TOP_HEIGHT = 25; // cm — max stack height on top of a unit

/** Returns true if the game can physically fit inside a cell in any orientation. */
export function fitsInCell(g: PackableGame, dims = KALLAX): boolean {
  if (!g.width || !g.height || !g.depth) return false;
  const { w: KW, h: KH, d: KD } = dims;
  const gw = parseFloat(g.width), gh = parseFloat(g.height), gd = parseFloat(g.depth);
  // Upright: height vertical, width as depth-in-shelf, depth as spine width
  if (gh <= KH && gw <= KD && gd <= KW) return true;
  // Stacked: sorted dims, two footprint orientations
  const sorted = [gw, gh, gd].sort((a, b) => a - b);
  if ((sorted[1] <= KW && sorted[2] <= KD) || (sorted[1] <= KD && sorted[2] <= KW)) return true;
  return false;
}

/** Returns true if the game can stand upright inside a cell (used for upright storage mode). */
export function fitsUprightInCell(g: PackableGame, dims = KALLAX): boolean {
  if (!g.width || !g.height || !g.depth) return false;
  const { w: KW, h: KH, d: KD } = dims;
  const gw = parseFloat(g.width), gh = parseFloat(g.height), gd = parseFloat(g.depth);
  return gh <= KH && gw <= KD && gd <= KW;
}

/**
 * Packs games on top of a shelf unit in stacked orientation.
 * Placement strategy:
 *   1. Fill a side-by-side base row from left to right; center the row when done.
 *   2. Games that don't fit in the row try to stack on an existing base-row game
 *      whose footprint can contain them (max combined height MAX_TOP_HEIGHT cm).
 * Games are always laid flat regardless of in-unit storage mode.
 */
export function packTop(
  games: PackableGame[],
  cols: number,
  rows: number,
  dims = KALLAX,
): { topPacked: PackedGame[]; remaining: PackableGame[] } {
  const { w: KW, h: KH, d: KD } = dims;
  const yBase = rows * KH; // y=rows*KH is the visual top surface of the unit
  const totalW = cols * KW;

  // All valid flat orientations for a game on this unit's top surface
  function orientations(g: PackableGame): { thickness: number; footW: number; footD: number }[] {
    if (!g.width || !g.height || !g.depth) return [];
    const [d0, d1, d2] = [parseFloat(g.width), parseFloat(g.height), parseFloat(g.depth)]
      .sort((a, b) => a - b);
    const out: { thickness: number; footW: number; footD: number }[] = [];
    if (d2 <= totalW && d1 <= KD) out.push({ thickness: d0, footW: d2, footD: d1 });
    if (d1 <= totalW && d2 <= KD) out.push({ thickness: d0, footW: d1, footD: d2 });
    return out;
  }

  interface RowItem { g: PackableGame; thickness: number; footW: number; footD: number }
  interface Slot    { x: number; footW: number; footD: number; heightUsed: number }

  // ── Pass 1: build side-by-side base row ──
  const rowItems: RowItem[] = [];
  const overflowGames: PackableGame[] = [];
  const cantFit: PackableGame[] = [];
  let rowWidth = 0;

  for (const g of games) {
    const opts = orientations(g);
    if (opts.length === 0) { cantFit.push(g); continue; }
    // Prefer the orientation with the smallest footW that still fits in the remaining row
    const fitting = opts
      .filter(o => rowWidth + o.footW <= totalW)
      .sort((a, b) => a.footW - b.footW);
    if (fitting.length > 0) {
      const { thickness, footW, footD } = fitting[0];
      rowItems.push({ g, thickness, footW, footD });
      rowWidth += footW;
    } else {
      overflowGames.push(g);
    }
  }

  // Center the base row on the top surface
  const startX = (totalW - rowWidth) / 2;
  const topPacked: PackedGame[] = [];
  const slots: Slot[] = [];
  let x = startX;

  for (const item of rowItems) {
    topPacked.push({
      ...item.g,
      xOffset: x,
      yOffset: yBase,                   // bottom of game box sits on the shelf top surface
      mode: 'stacked',
      _thickness: item.thickness,
      _footW: item.footW,
      _footD: item.footD,
    });
    slots.push({ x, footW: item.footW, footD: item.footD, heightUsed: item.thickness });
    x += item.footW;
  }

  // ── Pass 2: stack overflow games onto base-row games ──
  const remaining: PackableGame[] = [];
  for (const g of overflowGames) {
    if (!g.width || !g.height || !g.depth) { remaining.push(g); continue; }
    const [d0, d1, d2] = [parseFloat(g.width), parseFloat(g.height), parseFloat(g.depth)]
      .sort((a, b) => a - b);
    const thickness = d0;
    let placed = false;

    for (const slot of slots) {
      if (slot.heightUsed + thickness > MAX_TOP_HEIGHT) continue;
      // Orientations that fit within the slot's footprint
      const opts = [
        d2 <= slot.footW && d1 <= slot.footD ? { footW: d2, footD: d1 } : null,
        d1 <= slot.footW && d2 <= slot.footD ? { footW: d1, footD: d2 } : null,
      ].filter(Boolean) as { footW: number; footD: number }[];

      if (opts.length > 0) {
        const { footW, footD } = opts[0];
        topPacked.push({
          ...g,
          xOffset: slot.x + (slot.footW - footW) / 2, // center on the base game
          yOffset: yBase + slot.heightUsed,             // sits on top of whatever is already stacked
          mode: 'stacked',
          _thickness: thickness,
          _footW: footW,
          _footD: footD,
        });
        slot.heightUsed += thickness;
        placed = true;
        break;
      }
    }
    if (!placed) remaining.push(g);
  }

  return { topPacked, remaining: [...remaining, ...cantFit] };
}

function stackDims(g: PackableGame, dims = KALLAX) {
  const { w: KW } = dims;
  const sorted = [parseFloat(g.width!), parseFloat(g.height!), parseFloat(g.depth!)].sort((a, b) => a - b);
  const thickness = sorted[0];
  const footW = sorted[1] <= KW ? sorted[1] : sorted[2];
  const footD = sorted[1] <= KW ? sorted[2] : sorted[1];
  return { thickness, footW, footD, area: footW * footD };
}

function canStackInCell(g: PackableGame, dims = KALLAX): boolean {
  if (!g.width || !g.height || !g.depth) return false;
  const { w: KW, d: KD } = dims;
  const sorted = [parseFloat(g.width), parseFloat(g.height), parseFloat(g.depth)].sort((a, b) => a - b);
  return (sorted[1] <= KW && sorted[2] <= KD) || (sorted[1] <= KD && sorted[2] <= KW);
}

/** Pack a pre-ordered list of games into a stack without re-sorting by area. */
function packStackedOrdered(
  ordered: PackableGame[],
  startUsed: number,
  dims = KALLAX,
): PackedGame[] {
  const { h: KH } = dims;
  const packed: PackedGame[] = [];
  let heightUsed = startUsed;
  for (const g of ordered) {
    if (!canStackInCell(g, dims)) continue;
    const sd = stackDims(g, dims);
    if (heightUsed + sd.thickness <= KH) {
      packed.push({
        ...g, yOffset: heightUsed, xOffset: 0, mode: 'stacked',
        _thickness: sd.thickness, _footW: sd.footW, _footD: sd.footD,
      });
      heightUsed += sd.thickness;
    }
  }
  return packed;
}

export function packCell(
  gamesPool: PackableGame[],
  isStacked: boolean,
  startUsed = 0,
  dims = KALLAX,
): PackedGame[] {
  const { w: KW, h: KH, d: KD } = dims;
  const packed: PackedGame[] = [];

  if (!isStacked) {
    let widthUsed = startUsed;
    for (const g of gamesPool) {
      const gw = parseFloat(g.width!), gh = parseFloat(g.height!), gd = parseFloat(g.depth!);
      if (gh > KH || gw > KD) continue;
      if (widthUsed + gd <= KW) {
        packed.push({ ...g, xOffset: widthUsed, yOffset: 0, mode: 'upright' });
        widthUsed += gd;
      }
    }
  } else {
    const sorted = [...gamesPool]
      .filter(g => canStackInCell(g, dims))
      .sort((a, b) => stackDims(b, dims).area - stackDims(a, dims).area);

    let heightUsed = startUsed;
    for (const g of sorted) {
      const sd = stackDims(g, dims);
      if (heightUsed + sd.thickness <= KH) {
        packed.push({
          ...g, yOffset: heightUsed, xOffset: 0, mode: 'stacked',
          _thickness: sd.thickness, _footW: sd.footW, _footD: sd.footD,
        });
        heightUsed += sd.thickness;
      }
    }
  }
  return packed;
}

export function packCellsGroupAware(
  inputQueue: PackableGame[],
  numCells: number,
  isStacked: boolean,
  dims = KALLAX,
): { cellPacked: PackedGame[][]; remaining: PackableGame[] } {
  let queue = [...inputQueue];
  const cellPacked: PackedGame[][] = [];

  for (let i = 0; i < numCells; i++) {
    if (!queue.length) { cellPacked.push([]); continue; }

    if (queue[0]._cellGroup) {
      const cellGroup = queue[0]._cellGroup;
      const groupGames: PackableGame[] = [];
      const afterGroup: PackableGame[] = [];
      let pastGroup = false;
      for (const g of queue) {
        if (!pastGroup && g._cellGroup === cellGroup) groupGames.push(g);
        else { pastGroup = true; afterGroup.push(g); }
      }

      const fillCandidates = afterGroup.filter(g => !g._cellGroup);
      let cellResult: PackedGame[];
      let notPackedGroup: PackableGame[];
      let fillIds: Set<string>;

      if (isStacked) {
        // Sort group and fill candidates separately by area descending, then insert
        // the group as a contiguous block at the position where its largest game
        // naturally falls in the overall area order. This keeps the group together
        // while still maximising cell space and placing larger items lower.
        const sortedGroup = [...groupGames]
          .filter(g => canStackInCell(g, dims))
          .sort((a, b) => stackDims(b, dims).area - stackDims(a, dims).area);
        const sortedFills = [...fillCandidates]
          .filter(g => canStackInCell(g, dims))
          .sort((a, b) => stackDims(b, dims).area - stackDims(a, dims).area);

        const groupMaxArea = sortedGroup.length > 0 ? stackDims(sortedGroup[0], dims).area : 0;
        // Find the first fill candidate whose area is ≤ the group's largest game;
        // that is where the group block is inserted.
        const insertIdx = sortedFills.findIndex(f => stackDims(f, dims).area <= groupMaxArea);
        const combined = insertIdx === -1
          ? [...sortedFills, ...sortedGroup]
          : [...sortedFills.slice(0, insertIdx), ...sortedGroup, ...sortedFills.slice(insertIdx)];

        const allPacked = packStackedOrdered(combined, 0, dims);
        const groupIdSet = new Set(groupGames.map(g => g.id));
        const packedIds = new Set(allPacked.map(g => g.id));
        notPackedGroup = groupGames.filter(g => !packedIds.has(g.id));
        fillIds = new Set(allPacked.filter(g => !groupIdSet.has(g.id)).map(g => g.id));
        cellResult = allPacked;
      } else {
        const groupPacked = packCell(groupGames, isStacked, 0, dims);
        const groupIdSet = new Set(groupPacked.map(g => g.id));
        notPackedGroup = groupGames.filter(g => !groupIdSet.has(g.id));
        const usedByGroup = groupPacked.reduce((s, g) => s + parseFloat(g.depth!), 0);
        const fillPacked = packCell(fillCandidates, isStacked, usedByGroup, dims);
        fillIds = new Set(fillPacked.map(g => g.id));
        cellResult = [...groupPacked, ...fillPacked];
      }

      cellPacked.push(cellResult);
      queue = [...notPackedGroup, ...afterGroup.filter(g => !fillIds.has(g.id))];

    } else {
      const nextGroupIdx = queue.findIndex(g => g._cellGroup);
      const leadingNonGroup = nextGroupIdx === -1 ? queue : queue.slice(0, nextGroupIdx);
      const afterNonGroup   = nextGroupIdx === -1 ? []    : queue.slice(nextGroupIdx);

      const packed = packCell(leadingNonGroup, isStacked, 0, dims);
      const packedIds = new Set(packed.map(g => g.id));
      const unpackedNonGroup = leadingNonGroup.filter(g => !packedIds.has(g.id));

      let cellResult: PackedGame[] = packed;
      let nextQueue: PackableGame[];

      // In upright mode, fill remaining cell width by starting the next group early.
      // The group can overflow naturally into subsequent cells.
      if (!isStacked && packed.length > 0 && afterNonGroup.length > 0) {
        const usedWidth = packed.reduce((s, g) => s + parseFloat(g.depth!), 0);
        const nextGroupId = afterNonGroup[0]._cellGroup;
        if (nextGroupId) {
          const nextGroupGames = afterNonGroup.filter(g => g._cellGroup === nextGroupId);
          const afterNextGroup  = afterNonGroup.filter(g => g._cellGroup !== nextGroupId);
          const fillPacked = packCell(nextGroupGames, false, usedWidth, dims);
          const fillIds = new Set(fillPacked.map(g => g.id));
          cellResult = [...packed, ...fillPacked];
          nextQueue  = [...unpackedNonGroup, ...nextGroupGames.filter(g => !fillIds.has(g.id)), ...afterNextGroup];
        } else {
          nextQueue = [...unpackedNonGroup, ...afterNonGroup];
        }
      } else if (packed.length === 0) {
        nextQueue = [...afterNonGroup, ...leadingNonGroup];
      } else {
        nextQueue = [...unpackedNonGroup, ...afterNonGroup];
      }

      cellPacked.push(cellResult);
      queue = nextQueue;
    }
  }

  return { cellPacked, remaining: queue };
}
