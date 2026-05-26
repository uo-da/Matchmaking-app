const loadAuthService = () => {
  let service;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    service = require('../services/authService').default;
  });
  return service;
};

const setLocation = (url) => {
  delete window.location;
  window.location = new URL(url);
};

describe('authService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiBase = process.env.REACT_APP_API_BASE;
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
    global.fetch = jest.fn();
    setLocation('http://localhost/');
    process.env.REACT_APP_API_BASE = '';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.REACT_APP_API_BASE = originalApiBase;
    global.fetch = originalFetch;
    setLocation('http://localhost/');
  });

  test('getAuthHost uses fallback host when running on port 3000', () => {
    process.env.NODE_ENV = 'production';
    setLocation('http://example.com:3000/app');

    const authService = loadAuthService();
    expect(authService.getAuthHost()).toBe('http://example.com:5000');
  });

  test('getAuthHost prefers REACT_APP_API_BASE', () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = 'https://api.example.com';

    const authService = loadAuthService();
    expect(authService.getAuthHost()).toBe('https://api.example.com');
  });

  test('getLogoutRedirectUrl builds URL with explicit and default next values', () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = 'https://api.example.com';
    setLocation('https://app.example.com/chat');

    const authService = loadAuthService();
    expect(authService.getLogoutRedirectUrl('https://foo.example.com/next')).toBe(
      'https://api.example.com/auth/logout?next=https%3A%2F%2Ffoo.example.com%2Fnext'
    );
    expect(authService.getLogoutRedirectUrl()).toBe(
      'https://api.example.com/auth/logout?next=https%3A%2F%2Fapp.example.com'
    );
  });

  test('loginWithGitHub in test mode stores and returns local user', async () => {
    process.env.NODE_ENV = 'test';
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const authService = loadAuthService();
    const user = await authService.loginWithGitHub();

    expect(user).toEqual({
      id: 'octocat',
      githubUsername: 'octocat',
      displayName: 'octocat'
    });
    expect(JSON.parse(window.localStorage.getItem('currentUser'))).toEqual(user);
  });

  test('loginWithGitHub in production mode redirects to GitHub auth endpoint', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = 'https://api.example.com';
    setLocation('https://app.example.com/');

    const authService = loadAuthService();
    await authService.loginWithGitHub();

    expect(window.location.href).toBe('https://api.example.com/auth/github');
  });

  test('getCurrentSession in test mode returns local session', async () => {
    process.env.NODE_ENV = 'test';
    window.localStorage.setItem('currentUser', JSON.stringify({ id: 'u1' }));

    const authService = loadAuthService();
    await expect(authService.getCurrentSession()).resolves.toEqual({ id: 'u1' });
  });

  test('getCurrentSession in production mode returns fetched user and handles non-ok', async () => {
    process.env.NODE_ENV = 'production';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'server-user' })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'server error'
      });

    const authService = loadAuthService();
    await expect(authService.getCurrentSession()).resolves.toEqual({ id: 'server-user' });
    await expect(authService.getCurrentSession()).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('getCurrentSession retries with fallback base on network error', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = '';
    setLocation('https://space-3000.app.github.dev');

    global.fetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fallback-user' })
      });

    const authService = loadAuthService();
    await expect(authService.getCurrentSession()).resolves.toEqual({ id: 'fallback-user' });
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/auth/user',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://space-5000.app.github.dev/auth/user',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  test('logout in test mode clears local session', async () => {
    process.env.NODE_ENV = 'test';
    window.localStorage.setItem('currentUser', JSON.stringify({ id: 'u1' }));

    const authService = loadAuthService();
    await expect(authService.logout()).resolves.toBe(true);
    expect(window.localStorage.getItem('currentUser')).toBeNull();
  });

  test('logout in production mode succeeds when any base succeeds', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = '';
    setLocation('https://space-3000.app.github.dev');

    global.fetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    const authService = loadAuthService();
    await expect(authService.logout()).resolves.toBe(true);
  });

  test('logout in production mode returns false and logs when all attempts fail', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = '';
    setLocation('https://space-3000.app.github.dev');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockRejectedValue(new Error('logout failed'));

    const authService = loadAuthService();
    await expect(authService.logout()).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('Failed to logout: all logout attempts failed');
  });

  test('verifyAge stores local session only in test mode', () => {
    process.env.NODE_ENV = 'test';
    const authServiceTest = loadAuthService();
    const updated = authServiceTest.verifyAge({ id: 'u1', ageVerified: false }, 30);
    expect(updated).toEqual(expect.objectContaining({ age: 30, ageVerified: true }));
    expect(JSON.parse(window.localStorage.getItem('currentUser'))).toEqual(updated);

    process.env.NODE_ENV = 'production';
    window.localStorage.clear();
    const authServiceProd = loadAuthService();
    authServiceProd.verifyAge({ id: 'u2', ageVerified: false }, 25);
    expect(window.localStorage.getItem('currentUser')).toBeNull();
  });

  test('demoLogin uses local demo user on localhost', async () => {
    process.env.NODE_ENV = 'production';
    setLocation('http://localhost/');
    jest.spyOn(Date, 'now').mockReturnValue(123456);
    jest.spyOn(Math, 'random').mockReturnValue(0.8);

    const authService = loadAuthService();
    const user = await authService.demoLogin();

    expect(user.id).toBe('demo-123456');
    expect(user.githubUsername).toBe('sindresorhus');
    expect(JSON.parse(window.localStorage.getItem('currentUser'))).toEqual(user);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('demoLogin retries with fallback base on non-ok response', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = '';
    setLocation('https://space-3000.app.github.dev');
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'down' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'guest-1' }) });

    const authService = loadAuthService();
    await expect(authService.demoLogin()).resolves.toEqual({ id: 'guest-1' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/users/guest',
      expect.objectContaining({ method: 'POST' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://space-5000.app.github.dev/api/users/guest',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('demoLogin retries with fallback base on network error and returns null when guest creation fails', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REACT_APP_API_BASE = '';
    setLocation('https://space-3000.app.github.dev');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'failed' });

    const authService = loadAuthService();
    await expect(authService.demoLogin()).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Failed to create guest user:', expect.any(Error));
  });
});
