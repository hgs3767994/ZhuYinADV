import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SequenceLockPrototypePreview } from './components/SequenceLockPrototypePreview';
import { SoundMazePrototypePreview } from './components/SoundMazePrototypePreview';
import { MemoryExplorePrototypePreview } from './components/MemoryExplorePrototypePreview';
import { PursuitEscortPrototypePreview } from './components/PursuitEscortPrototypePreview';
import { BattlePrototypePreview } from './components/BattlePrototypePreview';
import './styles.css';

const previewEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PREVIEWS === 'true';
const preview = previewEnabled
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

createRoot(document.getElementById('root')!).render(
  preview === 'sequence-lock-gate' ? (
    <SequenceLockPrototypePreview />
  ) : preview === 'sequence-lock-magic-door' ? (
    <SequenceLockPrototypePreview variant="magic-door" />
  ) : preview === 'sound-maze-corridor' || preview === 'sound-maze-dungeon' ? (
    <SoundMazePrototypePreview />
  ) : preview === 'memory-village' ? (
    <MemoryExplorePrototypePreview />
  ) : preview === 'memory-barrier' ? (
    <MemoryExplorePrototypePreview variant="battle" />
  ) : preview === 'pursuit-escort' ? (
    <PursuitEscortPrototypePreview />
  ) : preview === 'zhuyin-battle' ? (
    <BattlePrototypePreview />
  ) : preview === 'castle-battle' ? (
    <BattlePrototypePreview variant="castle" />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  )
);
