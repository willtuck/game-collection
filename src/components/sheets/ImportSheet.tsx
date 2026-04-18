import { useState, useRef } from 'react';
import { Sheet } from '../shared/Sheet';
import { useGameStore } from '../../store/useGameStore';
import { parseImportCSV } from '../../lib/csvImport';
import { toCm } from '../../lib/helpers';
import { toast } from '../shared/Toast';
import type { Game } from '../../lib/types';
import type { ImportRow } from '../../lib/csvImport';
import styles from './ImportSheet.module.css';

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
}

type Phase = 'pick' | 'preview';

export function ImportSheet({ open, onClose }: ImportSheetProps) {
  const games   = useGameStore(s => s.games);
  const addGame = useGameStore(s => s.addGame);

  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('pick');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState('');

  const existingNames = new Set(games.map(g => g.name.toLowerCase().trim()));
  const newRows    = rows.filter(r => !existingNames.has(r.name.toLowerCase().trim()));
  const skipCount  = rows.length - newRows.length;

  function handleFile(file: File) {
    setError('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseImportCSV(text);
      if (!parsed.length) {
        setError("Couldn't find any games in this file. Make sure it has a column named 'name' or 'objectname'.");
        return;
      }
      setRows(parsed);
      setPhase('preview');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    const now = new Date().toISOString();
    newRows.forEach(r => {
      const u = r.unit ?? 'cm';
      const game: Game = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: r.name,
        type: r.type,
        width:  r.width  ? toCm(r.width,  u) : null,
        height: r.height ? toCm(r.height, u) : null,
        depth:  r.depth  ? toCm(r.depth,  u) : null,
        unit: 'cm',
        minPlayers: r.minPlayers,
        maxPlayers: r.maxPlayers,
        groupName: r.groupName,
        added: now,
      };
      addGame(game);
    });
    toast(`Imported ${newRows.length} ${newRows.length === 1 ? 'game' : 'games'}`);
    handleClose();
  }

  function handleClose() {
    setPhase('pick');
    setRows([]);
    setError('');
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Import CSV">
      {phase === 'pick' ? (
        <>
          <div
            className={styles.dropZone}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <div className={styles.dropIcon}>↑</div>
            <div className={styles.dropTitle}>Choose a CSV file</div>
            <div className={styles.dropBody}>
              Drag &amp; drop or tap to browse.<br />
              Works with BGG exports and the app's own CSV export.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className={styles.hiddenInput}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </>
      ) : (
        <>
          <div className={styles.summary}>
            <span className={styles.found}>{newRows.length} new {newRows.length === 1 ? 'game' : 'games'}</span>
            {skipCount > 0 && (
              <span className={styles.skip}>{skipCount} already in collection</span>
            )}
          </div>

          <div className={styles.previewList}>
            {rows.map((r, i) => {
              const isDupe = existingNames.has(r.name.toLowerCase().trim());
              return (
                <div key={i} className={`${styles.previewItem} ${isDupe ? styles.dupe : ''}`}>
                  <span className={styles.previewName}>{r.name}</span>
                  <span className={styles.previewMeta}>
                    {r.minPlayers && r.maxPlayers
                      ? `${r.minPlayers}–${r.maxPlayers}p`
                      : r.minPlayers
                      ? `${r.minPlayers}p`
                      : ''}
                    {r.width && r.height && r.depth
                      ? ` · ${r.width}×${r.height}×${r.depth}${r.unit ?? 'cm'}`
                      : ''}
                  </span>
                  {isDupe && <span className={styles.dupeTag}>skip</span>}
                </div>
              );
            })}
          </div>

          <div className={styles.actions}>
            <button className={styles.importBtn} onClick={handleImport} disabled={newRows.length === 0}>
              Import {newRows.length} {newRows.length === 1 ? 'game' : 'games'}
            </button>
            <button className={styles.backBtn} onClick={() => { setPhase('pick'); setRows([]); }}>
              Back
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
