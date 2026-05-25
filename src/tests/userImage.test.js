import {
  LOCAL_FALLBACK_AVATAR,
  getUserImageCandidates,
  getUserPrimaryImage,
  loadNextImageCandidate,
  prefetchImageUrls,
  prefetchUserImages
} from '../utils/userImage';

describe('userImage utils', () => {
  test('builds image candidates from photo sources and github avatar', () => {
    const candidates = getUserImageCandidates({
      githubUsername: 'octocat',
      avatar: ' https://example.com/avatar.png ',
      photoUrls: ['https://example.com/p1.png', '  '],
      photos: [{ url: 'https://example.com/p2.png' }],
      images: ['https://example.com/p3.png']
    }, 320);

    expect(candidates).toEqual(expect.arrayContaining([
      'https://example.com/p1.png',
      'https://example.com/p2.png',
      'https://example.com/p3.png',
      'https://example.com/avatar.png',
      'https://github.com/octocat.png?size=320',
      LOCAL_FALLBACK_AVATAR
    ]));
  });

  test('returns fallback when user has no image', () => {
    expect(getUserPrimaryImage(null)).toBe(LOCAL_FALLBACK_AVATAR);
  });

  test('loads next candidate and then falls back', () => {
    const target = {
      dataset: { candidateIndex: '0' },
      src: 'first',
      onerror: jest.fn()
    };

    loadNextImageCandidate({ currentTarget: target }, ['first', 'second']);
    expect(target.dataset.candidateIndex).toBe('1');
    expect(target.src).toBe('second');

    loadNextImageCandidate({ currentTarget: target }, ['first', 'second']);
    expect(target.src).toBe(LOCAL_FALLBACK_AVATAR);
    expect(target.onerror).toBeNull();
  });

  test('prefetches unique urls with limit and avoids duplicates', () => {
    const OriginalImage = window.Image;
    const created = [];

    class MockImage {
      constructor() {
        this.decoding = '';
        this.src = '';
        created.push(this);
      }
    }

    window.Image = MockImage;

    prefetchImageUrls(['https://a.com/1.png', 'https://a.com/1.png', 'https://a.com/2.png'], 1);
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe('https://a.com/1.png');

    prefetchImageUrls(['https://a.com/1.png', 'https://a.com/2.png'], 2);
    expect(created).toHaveLength(2);

    window.Image = OriginalImage;
  });

  test('prefetchImageUrls safely returns on invalid input', () => {
    expect(() => prefetchImageUrls(null)).not.toThrow();
    expect(() => prefetchImageUrls([])).not.toThrow();
  });

  test('prefetchUserImages respects per-user limit', () => {
    const OriginalImage = window.Image;
    const created = [];
    window.Image = class {
      constructor() {
        this.decoding = '';
        this.src = '';
        created.push(this);
      }
    };

    prefetchUserImages([
      { photoUrls: ['https://u1-1.png', 'https://u1-2.png', 'https://u1-3.png'] },
      { photoUrls: ['https://u2-1.png'] }
    ], { perUserLimit: 1, totalLimit: 2 });

    expect(created).toHaveLength(2);

    window.Image = OriginalImage;
  });

  test('prefetchUserImages returns when users are empty', () => {
    expect(() => prefetchUserImages([])).not.toThrow();
  });
});
