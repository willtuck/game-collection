import { useState, useEffect } from 'react';
import { Header } from './Header';
import { BottomNav, type TabName } from './BottomNav';
import { CollectionView } from '../collection/CollectionView';
import { SuggestedView } from '../kallax/SuggestedView';
import { ManualView } from '../manual/ManualView';
import { Toast } from '../shared/Toast';
import { useAuthInit } from '../../hooks/useAuthInit';
import { useGameStore } from '../../store/useGameStore';
import styles from './AppShell.module.css';

export function AppShell() {
  useAuthInit();
  const [activeTab, setActiveTab] = useState<TabName>('collection');
  const pendingManualNav  = useGameStore(s => s.pendingManualNav);
  const pendingManualView = useGameStore(s => s.pendingManualView);

  // Switch to Manual tab when either nav signal fires
  useEffect(() => {
    if (pendingManualNav)  setActiveTab('manual');
  }, [pendingManualNav]);

  useEffect(() => {
    if (pendingManualView) setActiveTab('manual');
  }, [pendingManualView]);

  return (
    <div className={styles.shell}>
      <Header />
      <BottomNav active={activeTab} onChange={setActiveTab} />
      <main className={styles.main}>
        {activeTab === 'collection' && <CollectionView />}
        {activeTab === 'suggested'  && <SuggestedView />}
        {activeTab === 'manual'     && <ManualView />}
      </main>
      <Toast />
    </div>
  );
}
