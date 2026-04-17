import { GameCard } from './GameCard';
import type { Game } from '../../lib/types';
import styles from './GameGrid.module.css';

interface GameGridProps {
  games: Game[];
  allGamesCount: number;
  onDeleteRequest: (id: string) => void;
}

export function GameGrid({ games, allGamesCount, onDeleteRequest }: GameGridProps) {
  if (allGamesCount === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>♟</div>
        <p>Your collection is empty.<br />Tap + to add your first game.</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔍</div>
        <p>No games match your search.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {games.map(g => (
        <GameCard key={g.id} game={g} onDeleteRequest={onDeleteRequest} />
      ))}
    </div>
  );
}
