export function shouldPlayBackgroundMusic(screen: string): boolean {
  return screen !== 'game' && !screen.startsWith('campaign-');
}
