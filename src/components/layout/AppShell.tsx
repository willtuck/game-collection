import { useState, useEffect } from 'react';
import { Header } from './Header';
import { BottomNav, type TabName } from './BottomNav';
import { CollectionView } from '../collection/CollectionView';
import { SuggestedView } from '../kallax/SuggestedView';
import { ManualView } from '../manual/ManualView';
import { ImportSheet } from '../sheets/ImportSheet';
import { Toast } from '../shared/Toast';
import { useGameStore } from '../../store/useGameStore';
import { toast } from '../shared/Toast';
import styles from './AppShell.module.css';

export function AppShell() {
  const [activeTab, setActiveTab]   = useState<TabName>('collection');
  const [importOpen, setImportOpen] = useState(false);
  const pendingManualNav  = useGameStore(s => s.pendingManualNav);
  const pendingManualView = useGameStore(s => s.pendingManualView);
  const games = useGameStore(s => s.games);

  useEffect(() => {
    if (pendingManualNav)  setActiveTab('manual');
  }, [pendingManualNav]);

  useEffect(() => {
    if (pendingManualView) setActiveTab('manual');
  }, [pendingManualView]);

  function handleExportCSV() {
    if (!games.length) { toast('Nothing to export yet.'); return; }
    const cols = ['id','name','minPlayers','maxPlayers','width','height','depth','unit','type','baseGameId','storedInside','groupName','added'];
    const rows = games.map(g => cols.map(k => {
      const v = g[k as keyof typeof g];
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shelfgeek.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className={styles.shell}>
      <Header onImportCSV={() => setImportOpen(true)} onExportCSV={handleExportCSV} />
      <BottomNav active={activeTab} onChange={setActiveTab} />
      <main className={styles.main}>
        <div className={`${styles.tabPanel} ${activeTab === 'collection' ? styles.tabPanelActive : ''}`}>
          <CollectionView />
        </div>
        <div className={`${styles.tabPanel} ${activeTab === 'suggested' ? styles.tabPanelActive : ''}`}>
          <SuggestedView />
        </div>
        <div className={`${styles.tabPanel} ${activeTab === 'manual' ? styles.tabPanelActive : ''}`}>
          <ManualView />
        </div>
      </main>
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <Toast />
    </div>
  );
}
