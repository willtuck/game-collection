import { useEffect, useRef, useId } from 'react';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const sheetRef     = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const titleId      = useId();

  // Save focused element on open; restore it on close
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement;
    } else {
      prevFocusRef.current?.focus();
      prevFocusRef.current = null;
    }
  }, [open]);

  // Auto-focus first focusable element + trap focus inside the sheet
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const getFocusable = () =>
      Array.from(sheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ));

    // Skip auto-focus on touch devices — would immediately raise the keyboard
    if (window.matchMedia('(hover: hover)').matches) {
      const focusable = getFocusable();
      focusable[0]?.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = getFocusable();
      const first = els[0];
      const last  = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={sheetRef}
        className={styles.modal}
        onClick={e => e.stopPropagation()}
      >
        {title && <h2 id={titleId} className={styles.title}>{title}</h2>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
