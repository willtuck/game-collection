const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy`;
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface BggGame {
  bggId: string;
  name: string;
  type: 'boardgame' | 'boardgameexpansion';
  thumbnail: string;
  yearPublished: string;
  // Populated when the user has a specific version marked on BGG
  knownVersionId?: string;
  widthCm?: string | null;
  heightCm?: string | null;
  depthCm?: string | null;
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
    .map(item => {
      const versionItem = item.querySelector('version > item[type="boardgameversion"]');
      const wIn = versionItem?.querySelector('width')?.getAttribute('value') ?? '';
      const lIn = versionItem?.querySelector('length')?.getAttribute('value') ?? '';
      const dIn = versionItem?.querySelector('depth')?.getAttribute('value') ?? '';
      const a = parseFloat(wIn) || 0;
      const b = parseFloat(lIn) || 0;
      let widthCm: string | null = null, heightCm: string | null = null;
      if (a > 0 && b > 0) {
        widthCm  = inToCm(String(Math.min(a, b)));
        heightCm = inToCm(String(Math.max(a, b)));
      } else {
        const face = a || b;
        widthCm = heightCm = face > 0 ? inToCm(String(face)) : null;
      }
      const depthCm = inToCm(dIn);
      return {
        bggId: item.getAttribute('objectid') ?? '',
        name: item.querySelector('name')?.textContent?.trim() ?? '',
        type,
        thumbnail: (item.querySelector('thumbnail')?.textContent?.trim() ?? '')
          .replace(/^\/\//, 'https://'),
        yearPublished: item.querySelector('yearpublished')?.textContent?.trim() ?? '',
        knownVersionId: versionItem?.getAttribute('id') ?? undefined,
        widthCm,
        heightCm,
        depthCm,
      };
    })
    .filter(g => g.bggId && g.name);
}

export async function fetchBggCollection(username: string): Promise<BggGame[]> {
  const base = `collection?username=${encodeURIComponent(username)}&own=1&stats=1&version=1`;
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

export interface BggSearchResult {
  bggId: string;
  name: string;
  type: 'boardgame' | 'boardgameexpansion';
  yearPublished: string;
}

export async function searchBgg(query: string): Promise<BggSearchResult[]> {
  const doc = await bggFetch(`search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion`);
  return Array.from(doc.querySelectorAll('item'))
    .map(item => ({
      bggId: item.getAttribute('id') ?? '',
      name: item.querySelector('name[type="primary"]')?.getAttribute('value') ?? '',
      type: (item.getAttribute('type') ?? 'boardgame') as 'boardgame' | 'boardgameexpansion',
      yearPublished: item.querySelector('yearpublished')?.getAttribute('value') ?? '',
    }))
    .filter(g => g.bggId && g.name)
    .slice(0, 8);
}

export interface BggGameDetails {
  thumbnail: string;
  versions: BggVersion[];
}

export async function fetchBggGameDetails(bggId: string): Promise<BggGameDetails> {
  const doc = await bggFetch(`thing?id=${bggId}&versions=1`);
  const item = doc.querySelector('item');
  const thumbnail = (item?.querySelector('thumbnail')?.textContent?.trim() ?? '')
    .replace(/^\/\//, 'https://');
  const versions: BggVersion[] = Array.from(doc.querySelectorAll('versions item')).map(v => {
    const wIn = v.querySelector('width')?.getAttribute('value') ?? '';
    const lIn = v.querySelector('length')?.getAttribute('value') ?? '';
    const dIn = v.querySelector('depth')?.getAttribute('value') ?? '';
    const a = parseFloat(wIn) || 0;
    const b = parseFloat(lIn) || 0;
    let widthCm: string | null, heightCm: string | null;
    if (a > 0 && b > 0) {
      widthCm  = inToCm(String(Math.min(a, b)));
      heightCm = inToCm(String(Math.max(a, b)));
    } else {
      const face = a || b;
      widthCm = heightCm = face > 0 ? inToCm(String(face)) : null;
    }
    return {
      id: v.getAttribute('id') ?? '',
      name: v.querySelector('name[type="primary"]')?.getAttribute('value') ?? 'Unknown edition',
      publisher: v.querySelector('link[type="boardgamepublisher"]')?.getAttribute('value') ?? '',
      year: v.querySelector('yearpublished')?.getAttribute('value') ?? '',
      widthCm,
      heightCm,
      depthCm: inToCm(dIn),
    };
  });
  return { thumbnail, versions };
}

export async function fetchBggKnownVersionId(username: string, bggId: string): Promise<string | null> {
  const doc = await bggFetch(
    `collection?username=${encodeURIComponent(username)}&id=${bggId}&own=1&version=1`
  );
  const versionItem = doc.querySelector('item version > item[type="boardgameversion"]');
  return versionItem?.getAttribute('id') ?? null;
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
    // When both face dims are present, normalize so smaller=W and larger=H.
    // When BGG only provides one (the other is 0 or absent), use it for both.
    let widthCm: string | null, heightCm: string | null;
    if (a > 0 && b > 0) {
      widthCm  = inToCm(String(Math.min(a, b)));
      heightCm = inToCm(String(Math.max(a, b)));
    } else {
      const face = a || b;
      widthCm = heightCm = face > 0 ? inToCm(String(face)) : null;
    }
    return {
      id: v.getAttribute('id') ?? '',
      name: v.querySelector('name[type="primary"]')?.getAttribute('value') ?? 'Unknown edition',
      publisher: v.querySelector('link[type="boardgamepublisher"]')?.getAttribute('value') ?? '',
      year: v.querySelector('yearpublished')?.getAttribute('value') ?? '',
      widthCm,
      heightCm,
      depthCm: inToCm(dIn),
    };
  });
}
