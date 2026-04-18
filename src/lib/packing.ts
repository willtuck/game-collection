import type { PackableGame, PackedGame } from './types';

export const KALLAX = { w: 33, h: 33, d: 38 }; // cm, interior dimensions
export const MAX_TOP_HEIGHT = 25; // cm — max stack height on top of a unit

/**
 * Packs games on top of a Kallax unit in stacked orientation.
 * Games are always laid flat regardless of the in-unit storage mode setting.
 * Max combined stack height is MAX_TOP_HEIGHT cm.
 */
export function packTop(
  games: PackableGame[],
  cols: number,
): { topPacked: PackedGame[]; remaining: PackableGame[] } {
  const { w: KW, d: KD } = KALLAX;
  const totalW = cols * KW;
  const topPacked: PackedGame[] = [];
  const remaining: PackableGame[] = [];
  let heightUsed = 0;

  for (const g of games) {
    if (!g.width || !g.height || !g.depth) { remaining.push(g); continue; }
    const rawDims = [parseFloat(g.width), parseFloat(g.height), parseFloat(g.depth)].sort((a, b) => a - b);
    const thickness = rawDims[0];
    // Orient footprint to fit on the Kallax top surface (totalW × KD)
    const footW = rawDims[1] <= totalW ? rawDims[1] : rawDims[2];
    const footD = rawDims[1] <= totalW ? rawDims[2] : rawDims[1];
    if (footW > totalW || footD > KD || heightUsed + thickness > MAX_TOP_HEIGHT) {
      remaining.push(g);
      continue;
    }
    topPacked.push({
      ...g,
      xOffset: (totalW - footW) / 2,
      yOffset: -(heightUsed + thickness), // y of top face (negative = above kallax)
      mode: 'stacked',
      _thickness: thickness,
      _footW: footW,
      _footD: footD,
    });
    heightUsed += thickness;
  }

  return { topPacked, remaining };
}

export function packCell(
  gamesPool: PackableGame[],
  isStacked: boolean,
  startUsed = 0,
): PackedGame[] {
  const { w: KW, h: KH, d: KD } = KALLAX;
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
    function stackDims(g: PackableGame) {
      const dims = [parseFloat(g.width!), parseFloat(g.height!), parseFloat(g.depth!)].sort((a, b) => a - b);
      const thickness = dims[0];
      const footW = dims[1] <= KW ? dims[1] : dims[2];
      const footD = dims[1] <= KW ? dims[2] : dims[1];
      return { thickness, footW, footD, area: footW * footD };
    }
    const sorted = [...gamesPool]
      .filter(g => {
        const dims = [parseFloat(g.width!), parseFloat(g.height!), parseFloat(g.depth!)].sort((a, b) => a - b);
        return (dims[1] <= KW && dims[2] <= KD) || (dims[1] <= KD && dims[2] <= KW);
      })
      .sort((a, b) => stackDims(b).area - stackDims(a).area);

    let heightUsed = startUsed;
    for (const g of sorted) {
      const sd = stackDims(g);
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
        const allPacked = packCell([...groupGames, ...fillCandidates], isStacked);
        const groupIdSet = new Set(groupGames.map(g => g.id));
        const packedGroupIds = new Set(allPacked.filter(g => groupIdSet.has(g.id)).map(g => g.id));
        notPackedGroup = groupGames.filter(g => !packedGroupIds.has(g.id));
        fillIds = new Set(allPacked.filter(g => !groupIdSet.has(g.id)).map(g => g.id));
        cellResult = allPacked;
      } else {
        const groupPacked = packCell(groupGames, isStacked);
        const groupIdSet = new Set(groupPacked.map(g => g.id));
        notPackedGroup = groupGames.filter(g => !groupIdSet.has(g.id));
        const usedByGroup = groupPacked.reduce((s, g) => s + parseFloat(g.depth!), 0);
        const fillPacked = packCell(fillCandidates, isStacked, usedByGroup);
        fillIds = new Set(fillPacked.map(g => g.id));
        cellResult = [...groupPacked, ...fillPacked];
      }

      cellPacked.push(cellResult);
      queue = [...notPackedGroup, ...afterGroup.filter(g => !fillIds.has(g.id))];

    } else {
      const nextGroupIdx = queue.findIndex(g => g._cellGroup);
      const leadingNonGroup = nextGroupIdx === -1 ? queue : queue.slice(0, nextGroupIdx);
      const afterNonGroup   = nextGroupIdx === -1 ? []    : queue.slice(nextGroupIdx);

      const packed = packCell(leadingNonGroup, isStacked);
      const packedIds = new Set(packed.map(g => g.id));

      cellPacked.push(packed);
      if (packed.length === 0) {
        queue = [...afterNonGroup, ...leadingNonGroup];
      } else {
        queue = [...leadingNonGroup.filter(g => !packedIds.has(g.id)), ...afterNonGroup];
      }
    }
  }

  return { cellPacked, remaining: queue };
}
