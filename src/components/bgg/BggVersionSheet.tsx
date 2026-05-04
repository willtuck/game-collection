import { useState, useEffect } from 'react';
import { Sheet } from '../shared/Sheet';
import { fetchBggVersions, type BggGame, type BggVersion } from '../../lib/bggApi';
import { useGameStore } from '../../store/useGameStore';
import type { Game } from '../../lib/types';
import styles from './BggVersionSheet.module.css';

interface BggVersionSheetProps {
  open: boolean;
  game: BggGame;
  onAdded: () => void;
  onClose: () => void;
}

export function BggVersionSheet({ open, game, onAdded, onClose }: BggVersionSheetProps) {
  const addGame = useGameStore(s => s.addGame);

  const [versions, setVersions] = useState<BggVersion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    setVersions([]);
    fetchBggVersions(game.bggId)
      .then(setVersions)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load versions'))
      .finally(() => setLoading(false));
  }, [open, game.bggId]);

  function handleSelect(v: BggVersion) {
    const hasDims = v.widthCm && v.heightCm && v.depthCm;
    const newGame: Game = {
      id: 'g' + Date.now().toString(36),
      bggId: game.bggId,
      name: game.name,
      type: game.type === 'boardgameexpansion' ? 'expansion' : undefined,
      width:  hasDims ? v.widthCm  : null,
      height: hasDims ? v.heightCm : null,
      depth:  hasDims ? v.depthCm  : null,
      unit: 'cm',
      minPlayers: game.minPlayers || undefined,
      maxPlayers: game.maxPlayers || undefined,
      added: new Date().toISOString(),
    };
    addGame(newGame);
    onAdded();
  }

  function hasDims(v: BggVersion) {
    return !!(v.widthCm && v.heightCm && v.depthCm);
  }

  function fmtDims(v: BggVersion) {
    return `${v.widthCm} × ${v.heightCm} × ${v.depthCm} cm`;
  }

  return (
    <Sheet open={open} onClose={onClose} title={game.name}>
      {game.yearPublished && (
        <div className={styles.gameMeta}>
          {game.type === 'boardgameexpansion' && (
            <span className={styles.expansionBadge}>Expansion</span>
          )}
          <span className={styles.year}>{game.yearPublished}</span>
          {(game.minPlayers || game.maxPlayers) && (
            <span className={styles.players}>
              {game.minPlayers === game.maxPlayers || !game.maxPlayers
                ? `${game.minPlayers} player${parseInt(game.minPlayers) === 1 ? '' : 's'}`
                : `${game.minPlayers}–${game.maxPlayers} players`}
            </span>
          )}
        </div>
      )}

      <div className={styles.sectionLabel}>Select your edition</div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading editions…</span>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && versions.length === 0 && (
        <p className={styles.noVersions}>No editions found for this game.</p>
      )}

      {!loading && !error && versions.length > 0 && (
        <div className={styles.list}>
          {versions.map(v => (
            <button
              key={v.id}
              className={styles.versionRow}
              onClick={() => handleSelect(v)}
            >
              <div className={styles.versionInfo}>
                <span className={styles.versionName}>{v.name}</span>
                <span className={styles.versionDetail}>
                  {[v.publisher, v.year].filter(Boolean).join(' · ')}
                </span>
              </div>
              {hasDims(v) ? (
                <span className={styles.dims}>{fmtDims(v)}</span>
              ) : (
                <span className={styles.noDims}>no dims</span>
              )}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
