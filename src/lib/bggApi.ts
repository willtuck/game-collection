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
    headers: { apikey: API_KEY },
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

export async function fetchBggCollection(username: string): Promise<BggGame[]> {
  const doc = await bggFetch(
    `collection?username=${encodeURIComponent(username)}&own=1&stats=1`,
  );
  return Array.from(doc.querySelectorAll('item'))
    .map(item => ({
      bggId: item.getAttribute('objectid') ?? '',
      name: item.querySelector('name')?.textContent?.trim() ?? '',
      type: (item.getAttribute('subtype') ?? 'boardgame') as BggGame['type'],
      thumbnail: (item.querySelector('thumbnail')?.textContent?.trim() ?? '')
        .replace(/^\/\//, 'https://'),
      yearPublished: item.querySelector('yearpublished')?.textContent?.trim() ?? '',
      minPlayers: item.querySelector('stats')?.getAttribute('minplayers') ?? '',
      maxPlayers: item.querySelector('stats')?.getAttribute('maxplayers') ?? '',
    }))
    .filter(g => g.bggId && g.name);
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
