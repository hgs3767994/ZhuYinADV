import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SequenceLockPrototypePreview } from './components/SequenceLockPrototypePreview';
import { SoundMazePrototypePreview } from './components/SoundMazePrototypePreview';
import './styles.css';

const previewEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PREVIEWS === 'true';
const preview = previewEnabled
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

createRoot(document.getElementById('root')!).render(
  preview === 'sequence-lock-gate' ? (
    <SequenceLockPrototypePreview />
  ) : preview === 'sound-maze-corridor' ? (
    <SoundMazePrototypePreview />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  )
);
