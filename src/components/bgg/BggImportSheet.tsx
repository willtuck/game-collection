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

type Phase = 'username' | 'loading' | 'collection' | 'error' | 'adding';

interface AddProgress {
  gamesTotal: number;
  linkingBatches: number;
  linkingBatchDone: number;
  linkedCount: number;
  done: boolean;
}

export function BggImportSheet({ open, onClose }: BggImportSheetProps) {
  const games      = useGameStore(s => s.games);
  const addGame    = useGameStore(s => s.addGame);
  const updateGame = useGameStore(s => s.updateGame);
  const deleteGame = useGameStore(s => s.deleteGame);

  const [phase, setPhase]           = useState<Phase>('username');
  const [username, setUsername]     = useState('');
  const [collection, setCollection] = useState<BggGame[]>([]);
  const [errorMsg, setErrorMsg]     = useState('');
  const [addedIds, setAddedIds]     = useState<Set<string>>(new Set());
  const [removedGames, setRemovedGames] = useState<Game[]>([]);
  const [versionGame, setVersionGame] = useState<BggGame | null>(null);
  const [addProgress, setAddProgress] = useState<AddProgress>({
    gamesTotal: 0, linkingBatches: 0, linkingBatchDone: 0, linkedCount: 0, done: false,
  });

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

      // Games in ShelfGeek that have a bggId but aren't in the fetched collection
      const fetchedIds = new Set(list.map(g => g.bggId));
      setRemovedGames(games.filter(g => g.bggId && !fetchedIds.has(g.bggId)));

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
    setRemovedGames([]);
    setVersionGame(null);
    setAddProgress({ gamesTotal: 0, linkingBatches: 0, linkingBatchDone: 0, linkedCount: 0, done: false });
    onClose();
  }

  function markAdded(bggId: string) {
    setAddedIds(s => new Set([...s, bggId]));
    setVersionGame(null);
  }

  function removeRemovedGame(id: string) {
    deleteGame(id);
    setRemovedGames(r => r.filter(g => g.id !== id));
  }

  function removeAllRemovedGames() {
    removedGames.forEach(g => deleteGame(g.id));
    setRemovedGames([]);
  }

  // Games from BGG not yet in the ShelfGeek collection
  const newGames   = collection.filter(g => !existingBggIds.has(g.bggId));
  const baseGames  = newGames.filter(g => g.type === 'boardgame');
  const expansions = newGames.filter(g => g.type === 'boardgameexpansion');

  async function addAllGames() {
    const toAdd = newGames.filter(g => !addedIds.has(g.bggId));
    const expansionBggIds = toAdd
      .filter(g => g.type === 'boardgameexpansion')
      .map(g => g.bggId);
    const totalBatches = Math.ceil(expansionBggIds.length / 20);

    setPhase('adding');
    setAddProgress({
      gamesTotal: toAdd.length,
      linkingBatches: totalBatches,
      linkingBatchDone: 0,
      linkedCount: 0,
      done: false,
    });

    const bggIdToLocalId = new Map<string, string>();
    const newIds: string[] = [];
    const ts = Date.now().toString(36);
    toAdd.forEach((g, i) => {
      const localId = `g${ts}${i.toString(36)}`;
      addGame({
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
      });
      bggIdToLocalId.set(g.bggId, localId);
      newIds.push(g.bggId);
    });
    setAddedIds(s => new Set([...s, ...newIds]));

    if (!expansionBggIds.length) {
      await Promise.resolve();
      setAddProgress(p => ({ ...p, done: true }));
      return;
    }

    try {
      const parentMap = new Map<string, string[]>();
      for (let i = 0; i < expansionBggIds.length; i += 20) {
        const chunk = expansionBggIds.slice(i, i + 20);
        const chunkMap = await fetchExpansionParents(chunk);
        chunkMap.forEach((v, k) => parentMap.set(k, v));
        setAddProgress(p => ({ ...p, linkingBatchDone: p.linkingBatchDone + 1 }));
      }

      const currentGames = useGameStore.getState().games;
      let linkedCount = 0;

      parentMap.forEach((parentBggIds, expansionBggId) => {
        const localExpansionId = bggIdToLocalId.get(expansionBggId);
        if (!localExpansionId) return;
        for (const parentBggId of parentBggIds) {
          const localParentId =
            bggIdToLocalId.get(parentBggId) ??
            currentGames.find(g => g.bggId === parentBggId)?.id;
          if (localParentId) {
            updateGame(localExpansionId, { baseGameId: localParentId });
            linkedCount++;
            break;
          }
        }
      });

      setAddProgress(p => ({ ...p, linkedCount, done: true }));
    } catch {
      setAddProgress(p => ({ ...p, done: true }));
    }
  }

  return (
    <>
      <Sheet
        open={open && !versionGame}
        onClose={handleClose}
        title="Import from BGG"
        disableClose={phase === 'adding' && !addProgress.done}
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

        {phase === 'adding' && (
          <div className={styles.addingPhase}>
            <div className={styles.addingTitle}>
              {addProgress.done ? 'All done!' : 'Adding your games…'}
            </div>
            <div className={styles.addingStep}>
              <span className={styles.stepLabel}>
                {addProgress.gamesTotal} game{addProgress.gamesTotal !== 1 ? 's' : ''} added
              </span>
              <span className={styles.stepCheck}>✓</span>
            </div>
            {addProgress.linkingBatches > 0 && (
              <div className={styles.addingStep}>
                <span className={styles.stepLabel}>
                  {addProgress.done
                    ? `${addProgress.linkedCount} expansion connection${addProgress.linkedCount !== 1 ? 's' : ''} made`
                    : `Connecting expansions… (${addProgress.linkingBatchDone}/${addProgress.linkingBatches})`
                  }
                </span>
                {addProgress.linkingBatchDone >= addProgress.linkingBatches
                  ? <span className={styles.stepCheck}>✓</span>
                  : <div className={styles.spinner} />
                }
              </div>
            )}
            {addProgress.done ? (
              <button className={styles.doneBtn} onClick={handleClose}>Done</button>
            ) : (
              <p className={styles.addingHint}>Please wait…</p>
            )}
          </div>
        )}

        {phase === 'collection' && (
          <div className={styles.collectionPhase}>
            <div className={styles.collectionMeta}>
              <span className={styles.collectionUser}>{username}</span>
              <span className={styles.collectionCount}>{collection.length} games on BGG</span>
            </div>

            {/* New games to add */}
            {newGames.length > 0 ? (
              <>
                {newGames.some(g => !addedIds.has(g.bggId)) && (
                  <button className={styles.addAllBtn} onClick={() => { void addAllGames(); }}>
                    Add all new games
                  </button>
                )}
                {baseGames.length > 0 && (
                  <GameSection
                    title="Base Games"
                    games={baseGames}
                    addedIds={addedIds}
                    onSelect={setVersionGame}
                  />
                )}
                {expansions.length > 0 && (
                  <GameSection
                    title="Expansions"
                    games={expansions}
                    addedIds={addedIds}
                    onSelect={setVersionGame}
                  />
                )}
              </>
            ) : (
              <p className={styles.allSynced}>
                All your BGG games are already in your collection.
              </p>
            )}

            {/* Games removed from BGG */}
            {removedGames.length > 0 && (
              <div className={styles.removedSection}>
                <div className={styles.removedHeader}>
                  <span className={styles.removedTitle}>Removed from BGG</span>
                  <button className={styles.removeAllBtn} onClick={removeAllRemovedGames}>
                    Remove all
                  </button>
                </div>
                <p className={styles.removedHint}>
                  These games are in your ShelfGeek collection but no longer marked as owned on BGG.
                </p>
                {removedGames.map(g => (
                  <div key={g.id} className={styles.removedRow}>
                    {g.thumbnail ? (
                      <img src={g.thumbnail} alt="" className={styles.thumb} loading="lazy" />
                    ) : (
                      <div className={styles.thumbPlaceholder} />
                    )}
                    <span className={styles.removedName}>{g.name}</span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeRemovedGame(g.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
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
  addedIds: Set<string>;
  onSelect: (g: BggGame) => void;
}

function GameSection({ title, games, addedIds, onSelect }: GameSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {games.map(g => {
        const done = addedIds.has(g.bggId);
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
