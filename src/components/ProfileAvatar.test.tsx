import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import { ProfileAvatar } from './ProfileAvatar';

describe('ProfileAvatar', () => {
  it('renders the full avatar without a circular frame when requested', () => {
    const markup = renderToStaticMarkup(
      <ProfileAvatar
        profile={{
          name: '測試',
          avatar: DEFAULT_AVATAR_RECIPE,
          isGuest: false
        }}
        size="large"
        frameless
      />
    );

    expect(markup).toContain('profile-avatar-frameless');
    expect(markup).not.toContain('fill="#dff4f0"');
  });
});
