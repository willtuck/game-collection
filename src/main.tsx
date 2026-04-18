import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Reset iOS zoom after input blur. iOS auto-zooms when inputs have
// font-size < 16px and doesn't reliably zoom back out on blur.
// Toggling initial-scale to 1 forces the viewport back to 1×.
const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
if (meta) {
  document.addEventListener('focusout', () => {
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1';
    requestAnimationFrame(() => {
      meta.content = 'width=device-width, initial-scale=1';
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
