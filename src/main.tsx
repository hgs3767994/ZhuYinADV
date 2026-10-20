import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SoundMazeFourFixesPreview } from './components/SoundMazeFourFixesPreview';
import { SoundMazePrototypePreview } from './components/SoundMazePrototypePreview';
import './styles.css';

const preview = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

createRoot(document.getElementById('root')!).render(
  preview === 'sound-maze-four-fixes' ? (
    <SoundMazeFourFixesPreview />
  ) : preview === 'sound-maze-corridor' ? (
    <SoundMazePrototypePreview />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  )
);
