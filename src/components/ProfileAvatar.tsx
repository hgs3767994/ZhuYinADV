import type { PlayerProfile } from '../services/profileRepository';
import { AvatarCanvas } from './AvatarCanvas';

interface ProfileAvatarProps {
  profile: Pick<PlayerProfile, 'name' | 'avatar' | 'isGuest'>;
  size?: 'small' | 'large';
  frameless?: boolean;
}

export function ProfileAvatar({
  profile,
  size = 'small',
  frameless = false
}: ProfileAvatarProps) {
  const frameClass = frameless ? ' profile-avatar-frameless' : '';
  if (!profile.isGuest) {
    return (
      <span className={`profile-avatar profile-avatar-${size}${frameClass}`} aria-hidden="true">
        <AvatarCanvas
          recipe={profile.avatar}
          className="profile-avatar-art"
          label=""
          showBackground={!frameless}
        />
      </span>
    );
  }

  return (
    <span
      className={`profile-avatar profile-avatar-${size} guest-avatar${frameClass}`}
      aria-hidden="true"
    >
      🎒
    </span>
  );
}
