const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`;
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface BggGame {
  bggId: string;
  name: string;
  type: 'boardgame' | 'boardgameexpansion';
  thumbnail: string;
  yearPublished: string;
  minPlayers: string;
  maxPlayers: string;
}

export interface BggVersion {
  id: string;
  name: string;
  publisher: string;
  year: string;
  widthCm: string | null;
  heightCm: string | null;
  depthCm: string | null;
}

async function bggFetch(path: string): Promise<Document> {
  const res = await fetch(`${PROXY}?path=${encodeURIComponent(path)}`, {
    headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
  });
  if (res.status === 202) throw new Error('BGG_QUEUED');
  if (!res.ok) throw new Error(`BGG request failed (${res.status})`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const err = doc.querySelector('error message');
  if (err) throw new Error(err.textContent ?? 'BGG error');
  return doc;
}

function inToCm(val: string | null | undefined): string | null {
  if (!val) return null;
  const n = parseFloat(val);
  if (!n || n <= 0) return null;
  return (n * 2.54).toFixed(1);
}

function parseCollectionItems(doc: Document, type: BggGame['type']): BggGame[] {
  return Array.from(doc.querySelectorAll('item'))
    .map(item => ({
      bggId: item.getAttribute('objectid') ?? '',
      name: item.querySelector('name')?.textContent?.trim() ?? '',
      type,
      thumbnail: (item.querySelector('thumbnail')?.textContent?.trim() ?? '')
        .replace(/^\/\//, 'https://'),
      yearPublished: item.querySelector('yearpublished')?.textContent?.trim() ?? '',
      minPlayers: item.querySelector('stats')?.getAttribute('minplayers') ?? '',
      maxPlayers: item.querySelector('stats')?.getAttribute('maxplayers') ?? '',
    }))
    .filter(g => g.bggId && g.name);
}

export async function fetchBggCollection(username: string): Promise<BggGame[]> {
  const base = `collection?username=${encodeURIComponent(username)}&own=1&stats=1`;
  // BGG returns correct subtypes only when filtered per type — fetch both in parallel
  const [baseDoc, expansionDoc] = await Promise.all([
    bggFetch(`${base}&subtype=boardgame`),
    bggFetch(`${base}&subtype=boardgameexpansion`),
  ]);
  const baseGames  = parseCollectionItems(baseDoc,      'boardgame');
  const expansions = parseCollectionItems(expansionDoc, 'boardgameexpansion');
  // Deduplicate by bggId (expansions take precedence for typing)
  const seen = new Set(expansions.map(g => g.bggId));
  return [...baseGames.filter(g => !seen.has(g.bggId)), ...expansions];
}

// Returns a map of expansion bggId → parent game bggIds (inbound links).
// Accepts up to 50 IDs per call; caller should chunk if needed.
export async function fetchExpansionParents(bggIds: string[]): Promise<Map<string, string[]>> {
  if (!bggIds.length) return new Map();
  const doc = await bggFetch(`thing?id=${bggIds.join(',')}`);
  const result = new Map<string, string[]>();
  doc.querySelectorAll('item').forEach(item => {
    const id = item.getAttribute('id') ?? '';
    const parents = Array.from(
      item.querySelectorAll('link[type="boardgameexpansion"][inbound="true"]')
    )
      .map(l => l.getAttribute('id') ?? '')
      .filter(Boolean);
    if (id && parents.length) result.set(id, parents);
  });
  return result;
}

export async function fetchBggVersions(bggId: string): Promise<BggVersion[]> {
  const doc = await bggFetch(`thing?id=${bggId}&versions=1`);
  return Array.from(doc.querySelectorAll('versions item')).map(v => {
    const wIn = v.querySelector('width')?.getAttribute('value') ?? '';
    const lIn = v.querySelector('length')?.getAttribute('value') ?? '';
    const dIn = v.querySelector('depth')?.getAttribute('value') ?? '';
    // BGG width+length are the two face dimensions; larger becomes H, smaller becomes W
    const a = parseFloat(wIn) || 0;
    const b = parseFloat(lIn) || 0;
    return {
      id: v.getAttribute('id') ?? '',
      name: v.querySelector('name[type="primary"]')?.getAttribute('value') ?? 'Unknown edition',
      publisher: v.querySelector('link[type="boardgamepublisher"]')?.getAttribute('value') ?? '',
      year: v.querySelector('yearpublished')?.getAttribute('value') ?? '',
      widthCm:  inToCm(String(Math.min(a, b) || '')),
      heightCm: inToCm(String(Math.max(a, b) || '')),
      depthCm:  inToCm(dIn),
    };
  });
}
