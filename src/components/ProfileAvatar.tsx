import type { PlayerProfile } from '../services/profileRepository';

interface ProfileAvatarProps {
  profile: Pick<PlayerProfile, 'name' | 'avatar' | 'isGuest'>;
  size?: 'small' | 'large';
}

export function ProfileAvatar({ profile, size = 'small' }: ProfileAvatarProps) {
  const initial = profile.isGuest ? '🎒' : (Array.from(profile.name)[0] ?? '★');
  let hash = 0;
  for (const character of profile.avatar.seed) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;

  return (
    <span
      className={`profile-avatar profile-avatar-${size}`}
      style={{ '--avatar-hue': hue } as React.CSSProperties}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
