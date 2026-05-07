export interface ImportRow {
  name: string;
  width?: string;
  height?: string;
  depth?: string;
  unit?: 'cm' | 'in';
  type?: 'expansion';
  groupName?: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      fields.push(field); field = '';
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

function findKey(keys: string[], candidates: string[]): string | undefined {
  for (const c of candidates) {
    const found = keys.find(k => k === c);
    if (found) return found;
  }
  return undefined;
}

export function parseImportCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const rawHeaders = parseCSVLine(lines[0]);
  // Map normalised key → original key (preserving case for value lookup)
  const normToRaw: Record<string, string> = {};
  rawHeaders.forEach(h => { normToRaw[h.trim().toLowerCase()] = h.trim(); });
  const normKeys = Object.keys(normToRaw);

  // Column detection — try BGG names first, then generic names, then our own export names
  const nameKey   = findKey(normKeys, ['objectname', 'name', 'game name', 'game', 'title']);
  const wKey      = findKey(normKeys, ['width']);
  const hKey      = findKey(normKeys, ['height']);
  const dKey      = findKey(normKeys, ['depth']);
  const unitKey   = findKey(normKeys, ['unit']);
  const typeKey   = findKey(normKeys, ['type', 'objecttype']);
  const groupKey  = findKey(normKeys, ['groupname', 'group_name', 'group name', 'group']);

  if (!nameKey) return [];

  const headerCount = rawHeaders.length;

  return lines
    .slice(1)
    .map(line => {
      const vals = parseCSVLine(line);
      const get = (normKey: string | undefined): string => {
        if (!normKey) return '';
        const rawKey = normToRaw[normKey];
        const idx = rawHeaders.findIndex(h => h.trim() === rawKey);
        return idx >= 0 && idx < vals.length ? vals[idx].trim() : '';
      };

      const name = get(nameKey);
      if (!name || name === headerCount.toString()) return null; // skip blank rows

      const row: ImportRow = { name };
      const w   = get(wKey);   if (w   && parseFloat(w)   > 0) row.width   = w;
      const h   = get(hKey);   if (h   && parseFloat(h)   > 0) row.height  = h;
      const d   = get(dKey);   if (d   && parseFloat(d)   > 0) row.depth   = d;
      const u   = get(unitKey); if (u === 'cm' || u === 'in') row.unit = u;
      const t   = get(typeKey); if (t === 'expansion') row.type = 'expansion';
      const g   = get(groupKey); if (g) row.groupName = g;

      return row;
    })
    .filter((r): r is ImportRow => r !== null && r.name.length > 0);
}
