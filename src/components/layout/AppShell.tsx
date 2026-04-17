import { useState } from 'react';
import { Header } from './Header';
import { BottomNav, type TabName } from './BottomNav';
import { CollectionView } from '../collection/CollectionView';
import { SuggestedView } from '../kallax/SuggestedView';
import { Toast } from '../shared/Toast';
import { useAuthInit } from '../../hooks/useAuthInit';
import styles from './AppShell.module.css';

export function AppShell() {
  useAuthInit();
  const [activeTab, setActiveTab] = useState<TabName>('collection');

  return (
    <div className={styles.shell}>
      <Header />
      <BottomNav active={activeTab} onChange={setActiveTab} />
      <main className={styles.main}>
        {activeTab === 'collection' && <CollectionView />}
        {activeTab === 'suggested'  && <SuggestedView />}
      </main>
      <Toast />
    </div>
  );
}
