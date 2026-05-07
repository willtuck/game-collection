import { useState, useEffect } from 'react';
import { Header } from './Header';
import { BottomNav, type TabName } from './BottomNav';
import { CollectionView } from '../collection/CollectionView';
import { SuggestedView } from '../kallax/SuggestedView';
import { ManualView } from '../manual/ManualView';
import { ImportSheet } from '../sheets/ImportSheet';
import { BggImportSheet } from '../bgg/BggImportSheet';
import { Toast } from '../shared/Toast';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from '../shared/Toast';
import styles from './AppShell.module.css';

export function AppShell() {
  const [activeTab, setActiveTab]   = useState<TabName>('collection');
  const [importOpen, setImportOpen] = useState(false);
  const [bggImportOpen, setBggImportOpen] = useState(false);
  const pendingManualNav  = useGameStore(s => s.pendingManualNav);
  const pendingManualView = useGameStore(s => s.pendingManualView);
  const games = useGameStore(s => s.games);
  const user    = useAuthStore(s => s.user);
  const session = useAuthStore(s => s.session);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') !== 'true') return;
    const sessionId = params.get('session_id');
    window.history.replaceState({}, '', '/app');
    if (!user || !sessionId || !session?.access_token) return;
    fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          useAuthStore.getState().setIsPremium(true);
          toast('Welcome to Premium! 🎉');
        }
      });
  }, [user]);

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
      <Header onImportCSV={() => setImportOpen(true)} onExportCSV={handleExportCSV} onImportBgg={() => setBggImportOpen(true)} />
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
      <BggImportSheet open={bggImportOpen} onClose={() => setBggImportOpen(false)} />
      <Toast />
    </div>
  );
}
