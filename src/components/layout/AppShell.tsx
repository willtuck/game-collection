import { useState, useEffect } from 'react';
import { Header } from './Header';
import { BottomNav, type TabName } from './BottomNav';
import { CollectionView } from '../collection/CollectionView';
import { SuggestedView } from '../kallax/SuggestedView';
import { Toast } from '../shared/Toast';
import { useAuthInit } from '../../hooks/useAuthInit';
import styles from './AppShell.module.css';

function useOverflowDiag() {
  const [info, setInfo] = useState('');
  useEffect(() => {
    setTimeout(() => {
      const vw = window.innerWidth;
      const sw = document.documentElement.scrollWidth;
      if (sw <= vw) { setInfo(''); return; }
      let worst = { el: 'none', w: 0 };
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > worst.w) {
          worst = { el: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : ''), w: Math.round(r.right) };
        }
      });
      setInfo(`vw:${vw} sw:${sw} → ${worst.el} r:${worst.w}`);
    }, 500);
  }, []);
  return info;
}

export function AppShell() {
  useAuthInit();
  const [activeTab, setActiveTab] = useState<TabName>('collection');
  const diagInfo = useOverflowDiag();

  return (
    <div className={styles.shell}>
      {diagInfo && <div style={{ position:'fixed', top:20, left:0, right:0, background:'red', color:'#fff', fontSize:11, padding:'4px 8px', zIndex:99999, wordBreak:'break-all' }}>{diagInfo}</div>}
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
