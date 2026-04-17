# Game Collection — Roadmap

## Shipped

### Core collection
- Add / edit / delete games
- Fields: name, type (base / expansion), min/max players, box dimensions (cm or in), group name
- Filter by type, dimensions, player count; sort by name or date added or missing-dims-first
- Search / highlight within collection view

### Import & Export
- CSV export (own format)
- CSV import — supports BGG collection exports and own format
  - Drag-and-drop or file picker
  - Preview phase shows new vs already-in-collection before committing

### Kallax 3D viewer
- Isometric 3-D canvas render of one or more Kallax units
- Packing algorithm: upright and stacked modes
- Multi-unit sequential packing — overflow from unit N feeds unit N+1
- Drag left/right to rotate the view (azimuth clamped so you can't spin to the back)
- Hover / tap tooltips showing game name
- Search bar highlights matching games across all cells
- Sort order: alphabetical, by box width, by box height
- Kallax manager: add (1×1 → 5×5 models), rename, and delete units

---

## Up Next

### Phase 2 — Accounts & cloud sync
- Sign in with Google (Supabase Auth)
- Games and Kallax units stored in Supabase (Postgres), synced across devices
- Offline-first: local Zustand state as cache, sync on reconnect

### Phase 3 — Richer game data
- Cover art / thumbnail (fetched from BGG API or user-uploaded)
- BGG rating and weight pulled in on import
- Expansion → base game linking in the UI
- "Stored inside" flag (expansion fits inside base game box)
- Shared dimension database: when editing a game, surface crowd-sourced dimension
  suggestions from other users (by game name). Importing always creates a clean
  personal record — no dimensions auto-filled. Users explicitly accept or enter
  their own values when editing.

### Phase 4 — Manual Kallax layout
- Drag-and-drop to manually reorder games within cells
- Pin a game to a specific cell / unit
- Save named layout snapshots

### Phase 5 — Social / sharing
- Public shareable link to view a collection (read-only)
- Shared game database so dimensions only need to be entered once
- Wishlist mode (track games you want, not just games you own)

---

## Backlog / ideas
- Dark / light theme toggle
- Barcode scanner to look up games by ISBN/EAN
- Print-friendly shelf label export
