import { useRef, useEffect } from 'react';
import { drawBox } from '../../lib/rendering';
import { gameColor } from '../../lib/colors';
import type { GameColor } from '../../lib/types';
import styles from './BoxPreview.module.css';

interface BoxPreviewProps {
  w: number;
  h: number;
  d: number;
  gameId?: string;
  color?: GameColor;
}

export function BoxPreview({ w, h, d, gameId, color }: BoxPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const col = color ?? (gameId ? gameColor(gameId) : undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !w || !h || !d) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = 280 * dpr;
    canvas.height = 120 * dpr;
    drawBox(canvas, w, h, d, col);
  }, [w, h, d, col]);

  if (!w && !h && !d) return null;

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      width={280}
      height={120}
    />
  );
}
