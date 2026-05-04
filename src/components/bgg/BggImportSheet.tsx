import { useState, useRef } from 'react';
import { Sheet } from '../shared/Sheet';
import { BggVersionSheet } from './BggVersionSheet';
import { fetchBggCollection, fetchExpansionParents, type BggGame } from '../../lib/bggApi';
import { useGameStore } from '../../store/useGameStore';
import type { Game } from '../../lib/types';
import styles from './BggImportSheet.module.css';

interface BggImportSheetProps {
  open: boolean;
  onClose: () => void;
}

type Phase = 'username' | 'loading' | 'collection' | 'error';

export function BggImportSheet({ open, onClose }: BggImportSheetProps) {
  const games      = useGameStore(s => s.games);
  const addGame    = useGameStore(s => s.addGame);
  const updateGame = useGameStore(s => s.updateGame);

  const [phase, setPhase]           = useState<Phase>('username');
  const [username, setUsername]     = useState('');
  const [collection, setCollection] = useState<BggGame[]>([]);
  const [errorMsg, setErrorMsg]     = useState('');
  const [addedIds, setAddedIds]     = useState<Set<string>>(new Set());
  const [versionGame, setVersionGame] = useState<BggGame | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // BGG IDs already in local collection
  const existingBggIds = new Set(games.map(g => g.bggId).filter(Boolean) as string[]);

  async function fetchCollection() {
    const u = username.trim();
    if (!u) return;
    setPhase('loading');
    try {
      const list = await fetchBggCollection(u);
      setCollection(list);
      setAddedIds(new Set());
      setPhase('collection');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setErrorMsg(
        msg.includes('BGG_QUEUED')
          ? 'BGG is still processing your collection — wait a moment and try again.'
          : msg.includes('Invalid username')
          ? `Username "${u}" not found on BGG.`
          : `Could not fetch collection: ${msg}`,
      );
      setPhase('error');
    }
  }

  function handleClose() {
    setPhase('username');
    setUsername('');
    setCollection([]);
    setErrorMsg('');
    setAddedIds(new Set());
    setVersionGame(null);
    onClose();
  }

  function markAdded(bggId: string) {
    setAddedIds(s => new Set([...s, bggId]));
    setVersionGame(null);
  }

  async function addAllGames() {
    const toAdd = collection.filter(g => !alreadyIn(g));

    // Add all games, track bggId → local id for linking
    const bggIdToLocalId = new Map<string, string>();
    const newIds: string[] = [];
    const ts = Date.now().toString(36);
    toAdd.forEach((g, i) => {
      const localId = `g${ts}${i.toString(36)}`;
      const newGame: Game = {
        id: localId,
        bggId: g.bggId,
        thumbnail: g.thumbnail || undefined,
        name: g.name,
        type: g.type === 'boardgameexpansion' ? 'expansion' : undefined,
        width: null, height: null, depth: null,
        unit: 'cm',
        minPlayers: g.minPlayers || undefined,
        maxPlayers: g.maxPlayers || undefined,
        added: new Date().toISOString(),
      };
      addGame(newGame);
      bggIdToLocalId.set(g.bggId, localId);
      newIds.push(g.bggId);
    });
    setAddedIds(s => new Set([...s, ...newIds]));

    // Auto-link expansions to their parent games (non-blocking)
    const expansionBggIds = toAdd
      .filter(g => g.type === 'boardgameexpansion')
      .map(g => g.bggId);
    if (!expansionBggIds.length) return;

    try {
      // Sequential batches of 20 to avoid proxy timeouts
      const parentMap = new Map<string, string[]>();
      for (let i = 0; i < expansionBggIds.length; i += 20) {
        const chunk = expansionBggIds.slice(i, i + 20);
        const chunkMap = await fetchExpansionParents(chunk);
        chunkMap.forEach((v, k) => parentMap.set(k, v));
      }

      // Read fresh store state — the `games` closure is stale after addGame calls
      const currentGames = useGameStore.getState().games;

      parentMap.forEach((parentBggIds, expansionBggId) => {
        const localExpansionId = bggIdToLocalId.get(expansionBggId);
        if (!localExpansionId) return;
        for (const parentBggId of parentBggIds) {
          const localParentId =
            bggIdToLocalId.get(parentBggId) ??
            currentGames.find(g => g.bggId === parentBggId)?.id;
          if (localParentId) {
            updateGame(localExpansionId, { baseGameId: localParentId });
            break;
          }
        }
      });
    } catch {
      // Non-fatal — games were imported, linking just didn't complete
    }
  }

  const alreadyIn  = (g: BggGame) => existingBggIds.has(g.bggId) || addedIds.has(g.bggId);
  const baseGames  = collection.filter(g => g.type === 'boardgame');
  const expansions = collection.filter(g => g.type === 'boardgameexpansion');

  return (
    <>
      <Sheet
        open={open && !versionGame}
        onClose={handleClose}
        title="Import from BGG"
      >
        {phase === 'username' && (
          <div className={styles.usernamePhase}>
            <p className={styles.hint}>
              Enter your BoardGameGeek username to import your owned games.
            </p>
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                className={styles.input}
                type="text"
                placeholder="BGG username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchCollection()}
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button
                className={styles.fetchBtn}
                onClick={fetchCollection}
                disabled={!username.trim()}
              >
                Fetch
              </button>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Fetching {username}'s collection…</span>
          </div>
        )}

        {phase === 'error' && (
          <div className={styles.errorPhase}>
            <p className={styles.errorMsg}>{errorMsg}</p>
            <button className={styles.retryBtn} onClick={() => setPhase('username')}>
              Try again
            </button>
          </div>
        )}

        {phase === 'collection' && (
          <div className={styles.collectionPhase}>
            <div className={styles.collectionMeta}>
              <span className={styles.collectionUser}>{username}</span>
              <span className={styles.collectionCount}>{collection.length} games</span>
            </div>

            {collection.some(g => !alreadyIn(g)) && (
              <button className={styles.addAllBtn} onClick={() => { void addAllGames(); }}>
                Add all games
              </button>
            )}

            {baseGames.length > 0 && (
              <GameSection
                title="Base Games"
                games={baseGames}
                alreadyIn={alreadyIn}
                onSelect={setVersionGame}
              />
            )}
            {expansions.length > 0 && (
              <GameSection
                title="Expansions"
                games={expansions}
                alreadyIn={alreadyIn}
                onSelect={setVersionGame}
              />
            )}
          </div>
        )}
      </Sheet>

      {versionGame && (
        <BggVersionSheet
          open
          game={versionGame}
          onAdded={() => markAdded(versionGame.bggId)}
          onClose={() => setVersionGame(null)}
        />
      )}
    </>
  );
}

interface GameSectionProps {
  title: string;
  games: BggGame[];
  alreadyIn: (g: BggGame) => boolean;
  onSelect: (g: BggGame) => void;
}

function GameSection({ title, games, alreadyIn, onSelect }: GameSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {games.map(g => {
        const done = alreadyIn(g);
        return (
          <div key={g.bggId} className={`${styles.gameRow} ${done ? styles.done : ''}`}>
            {g.thumbnail ? (
              <img src={g.thumbnail} alt="" className={styles.thumb} loading="lazy" />
            ) : (
              <div className={styles.thumbPlaceholder} />
            )}
            <div className={styles.gameInfo}>
              <span className={styles.gameName}>{g.name}</span>
              <span className={styles.gameMeta}>
                {g.yearPublished}
                {(g.minPlayers || g.maxPlayers) && (
                  <>
                    {' · '}
                    {g.minPlayers === g.maxPlayers || !g.maxPlayers
                      ? `${g.minPlayers}p`
                      : `${g.minPlayers}–${g.maxPlayers}p`}
                  </>
                )}
              </span>
            </div>
            {done ? (
              <span className={styles.addedBadge}>✓ Added</span>
            ) : (
              <button className={styles.addBtn} onClick={() => onSelect(g)}>
                Add →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
