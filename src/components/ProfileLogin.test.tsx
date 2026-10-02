import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_RECIPE } from '../avatar/model';
import { ProfileLogin } from './ProfileLogin';

describe('ProfileLogin', () => {
  it('shows the complete avatar without a circular frame', () => {
    const markup = renderToStaticMarkup(
      <ProfileLogin
        profile={{
          id: 'profile-1',
          name: '測試帳號',
          avatar: DEFAULT_AVATAR_RECIPE,
          isGuest: false,
          createdAt: '2026-10-02T00:00:00.000Z'
        }}
        onLogin={async () => undefined}
        onForgotPassword={() => undefined}
        onBack={() => undefined}
      />
    );

    expect(markup).toContain('profile-avatar-frameless');
    expect(markup).not.toContain('fill="#dff4f0"');
  });
});
