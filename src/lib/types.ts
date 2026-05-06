/* ── Core domain types ── */

export interface Game {
  id: string;
  bggId?: string;
  thumbnail?: string;
  accentColor?: string; // dominant color extracted from thumbnail, stored locally
  name: string;
  type?: 'expansion';
  baseGameId?: string;
  storedInside?: boolean;
  groupName?: string;
  width: string | null;
  height: string | null;
  depth: string | null;
  unit: 'cm' | 'in';
  minPlayers?: string | null;
  maxPlayers?: string | null;
  added: string; // ISO date string
}

// Game annotated with packing metadata — used only during Kallax layout
export interface PackableGame extends Game {
  _cellGroup?: string;
}

export interface PackedGame extends PackableGame {
  xOffset: number;
  yOffset: number;
  mode: 'upright' | 'stacked';
  _thickness?: number;
  _footW?: number;
  _footD?: number;
}

export interface KallaxUnit {
  id: string;
  model: string; // e.g. '2x4'
  label: string;
}

export type StorageMode = 'upright' | 'stacked';
export type KallaxSort =
  | 'alpha'
  | 'alpha-desc'
  | 'players'
  | 'size-desc'
  | 'size-asc'
  | 'date-new'
  | 'date-old'
  | 'dims-last';

export interface GameColor {
  fill: string;   // vivid accent — used for the outlined box preview in the card
  stroke: string; // darkened accent — used for box edges and strokes
  light: string;  // very pale tint (L≈93%) — used for strip background
  mid: string;    // medium tint (L≈78%) — used for shelf box fill
}

export interface Layout {
  id: string;
  name: string;
  type: 'suggested' | 'manual';
  createdAt: string;
  updatedAt: string;
  sortScheme?: KallaxSort;
  storageMode?: StorageMode;
  units: Pick<KallaxUnit, 'id' | 'model' | 'label'>[];
  placements: Placement[];
  collectionSnapshot?: { id: string; name: string }[];
}

export interface Placement {
  gameId: string;
  unitId: string;
  cellIndex: number;
  storageMode: StorageMode;
}

export interface ManualPlacement {
  id: string;
  gameId: string;
  unitId: string;
  cellIndex: number;
  storageMode: StorageMode;
}
