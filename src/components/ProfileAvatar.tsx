import type { PlayerProfile } from '../services/profileRepository';
import { AvatarCanvas } from './AvatarCanvas';

interface ProfileAvatarProps {
  profile: Pick<PlayerProfile, 'name' | 'avatar' | 'isGuest'>;
  size?: 'small' | 'large';
}

export function ProfileAvatar({ profile, size = 'small' }: ProfileAvatarProps) {
  if (!profile.isGuest) {
    return (
      <span className={`profile-avatar profile-avatar-${size}`} aria-hidden="true">
        <AvatarCanvas recipe={profile.avatar} className="profile-avatar-art" label="" />
      </span>
    );
  }

  return (
    <span
      className={`profile-avatar profile-avatar-${size} guest-avatar`}
      aria-hidden="true"
    >
      🎒
    </span>
  );
}
