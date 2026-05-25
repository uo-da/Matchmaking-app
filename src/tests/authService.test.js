import authService from '../services/authService';

describe('authService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    global.fetch = originalFetch;
  });

  test('loginWithGitHub in test mode stores and returns local user', async () => {
    process.env.NODE_ENV = 'test';

    const user = await authService.loginWithGitHub();

    expect(user).toEqual(expect.objectContaining({
      id: expect.any(String),
      githubUsername: expect.any(String),
      displayName: expect.any(String)
    }));

    const stored = JSON.parse(window.localStorage.getItem('currentUser'));
    expect(stored.id).toBe(user.id);
  });

  test('getCurrentSession in test mode returns saved user', async () => {
    process.env.NODE_ENV = 'test';
    window.localStorage.setItem('currentUser', JSON.stringify({ id: 'u1' }));

    await expect(authService.getCurrentSession()).resolves.toEqual({ id: 'u1' });
  });

  test('logout in test mode clears local session', async () => {
    process.env.NODE_ENV = 'test';
    window.localStorage.setItem('currentUser', JSON.stringify({ id: 'u1' }));

    await expect(authService.logout()).resolves.toBe(true);
    expect(window.localStorage.getItem('currentUser')).toBeNull();
  });

  test('verifyAge updates and stores age in test mode', () => {
    process.env.NODE_ENV = 'test';

    const updated = authService.verifyAge({ id: 'u1', ageVerified: false }, 30);

    expect(updated).toEqual(expect.objectContaining({ age: 30, ageVerified: true }));
    expect(JSON.parse(window.localStorage.getItem('currentUser'))).toEqual(updated);
  });

  test('getCurrentSession in production mode returns fetched session', async () => {
    process.env.NODE_ENV = 'production';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'server-user' })
    });

    await expect(authService.getCurrentSession()).resolves.toEqual({ id: 'server-user' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/user$/),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  test('getCurrentSession handles non-ok and network errors', async () => {
    process.env.NODE_ENV = 'production';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'server error'
    });

    await expect(authService.getCurrentSession()).resolves.toBeNull();

    global.fetch.mockRejectedValueOnce(new Error('network error'));
    await expect(authService.getCurrentSession()).resolves.toBeNull();

    expect(errorSpy).toHaveBeenCalled();
  });

  test('logout in production mode returns ok flag and false on errors', async () => {
    process.env.NODE_ENV = 'production';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockResolvedValueOnce({ ok: true });
    await expect(authService.logout()).resolves.toBe(true);

    global.fetch.mockResolvedValueOnce({ ok: false });
    await expect(authService.logout()).resolves.toBe(false);

    global.fetch.mockRejectedValueOnce(new Error('logout failed'));
    await expect(authService.logout()).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  test('demoLogin in development mode calls guest API', async () => {
    process.env.NODE_ENV = 'development';
    jest.spyOn(Date, 'now').mockReturnValue(123456);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'guest-dev-1' })
    });

    const user = await authService.demoLogin();

    expect(user).toEqual({ id: 'guest-dev-1' });
    expect(window.localStorage.getItem('currentUser')).toBeNull();
    expect(global.fetch).toHaveBeenCalled();
  });

  test('demoLogin in production mode returns created guest user or null', async () => {
    process.env.NODE_ENV = 'production';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'guest-1' })
    });
    await expect(authService.demoLogin()).resolves.toEqual({ id: 'guest-1' });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'failed'
    });
    await expect(authService.demoLogin()).resolves.toBeNull();

    expect(errorSpy).toHaveBeenCalled();
  });
});
