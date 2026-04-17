import type { Game, PackableGame, KallaxSort } from './types';
import { hasDims } from './helpers';

export function getSortedForKallax(games: Game[], kallaxSort: KallaxSort): PackableGame[] {
  const eligible = games.filter(
    g => hasDims(g) && !(g.type === 'expansion' && g.storedInside)
  );

  function vol(g: Game) {
    return parseFloat(g.width!) * parseFloat(g.height!) * parseFloat(g.depth!);
  }

  const sorted = [...eligible];
  switch (kallaxSort) {
    case 'alpha':      sorted.sort((a,b) => a.name.localeCompare(b.name)); break;
    case 'alpha-desc': sorted.sort((a,b) => b.name.localeCompare(a.name)); break;
    case 'players':
      sorted.sort((a,b) => {
        const am = parseInt(a.minPlayers ?? '') || 99;
        const bm = parseInt(b.minPlayers ?? '') || 99;
        return am !== bm ? am - bm : a.name.localeCompare(b.name);
      });
      break;
    case 'size-desc': sorted.sort((a,b) => vol(b) - vol(a)); break;
    case 'size-asc':  sorted.sort((a,b) => vol(a) - vol(b)); break;
    case 'date-new':  sorted.sort((a,b) => new Date(b.added).getTime() - new Date(a.added).getTime()); break;
    case 'date-old':  sorted.sort((a,b) => new Date(a.added).getTime() - new Date(b.added).getTime()); break;
    case 'dims-last': break;
  }

  // Group: each game immediately followed by its boxed expansions, then all group-mates
  const placedIds = new Set<string>();
  const result: Game[] = [];

  function placeWithExpansions(g: Game) {
    if (placedIds.has(g.id)) return;
    placedIds.add(g.id);
    result.push(g);
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
    if (g.groupName) {
      for (const member of sorted) {
        if (!placedIds.has(member.id) && member.groupName === g.groupName) {
          placeWithExpansions(member);
        }
      }
    }
  }

  // Annotate with _cellGroup
  const baseIdsWithBoxedExpansions = new Set(
    result.filter(g => g.type === 'expansion' && g.baseGameId).map(g => g.baseGameId!)
  );

  return result.map(g => {
    const cg = g.groupName
      || (g.type === 'expansion' && g.baseGameId ? `__base__${g.baseGameId}` : null)
      || (baseIdsWithBoxedExpansions.has(g.id) ? `__base__${g.id}` : null);
    return cg ? { ...g, _cellGroup: cg } : g;
  });
}
