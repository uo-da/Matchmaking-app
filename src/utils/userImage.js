const LOCAL_FALLBACK_AVATAR = '/images/person.png';
const prefetchedImageUrls = new Set();

const normalizeUrl = (value) => (typeof value === 'string' ? value.trim() : '');

const collectPhotoUrls = (user) => {
  if (!user) {
    return [];
  }

  const rawSources = [
    user.photoUrls,
    user.photos,
    user.images,
    user.imageUrls,
    user.profileImages
  ];

  return rawSources
    .flatMap((source) => (Array.isArray(source) ? source : []))
    .map((item) => {
      if (typeof item === 'string') {
        return normalizeUrl(item);
      }
      if (item && typeof item.url === 'string') {
        return normalizeUrl(item.url);
      }
      return '';
    })
    .filter(Boolean);
};

export function getUserImageCandidates(user, size = 220) {
  const photoUrls = collectPhotoUrls(user);
  const avatar = normalizeUrl(user?.avatar);
  const githubUsername = normalizeUrl(user?.githubUsername);
  const githubAvatar = githubUsername ? `https://github.com/${githubUsername}.png?size=${size}` : '';

  return [...new Set([...photoUrls, avatar, githubAvatar, LOCAL_FALLBACK_AVATAR].filter(Boolean))];
}

export function getUserPrimaryImage(user, size = 220) {
  const candidates = getUserImageCandidates(user, size);
  return candidates[0] || LOCAL_FALLBACK_AVATAR;
}

export function loadNextImageCandidate(event, candidates) {
  const target = event.currentTarget;
  const currentIndex = Number(target.dataset.candidateIndex || 0);
  const nextIndex = currentIndex + 1;

  if (!Array.isArray(candidates) || nextIndex >= candidates.length) {
    target.onerror = null;
    target.src = LOCAL_FALLBACK_AVATAR;
    return;
  }

  target.dataset.candidateIndex = String(nextIndex);
  target.src = candidates[nextIndex];
}

export function prefetchImageUrls(urls, limit = Infinity) {
  if (typeof window === 'undefined' || !Array.isArray(urls) || urls.length === 0) {
    return;
  }

  const uniqueUrls = [...new Set(urls.map((url) => normalizeUrl(url)).filter(Boolean))].slice(0, limit);
  uniqueUrls.forEach((url) => {
    if (prefetchedImageUrls.has(url)) {
      return;
    }
    prefetchedImageUrls.add(url);
    const image = new window.Image();
    image.decoding = 'async';
    image.src = url;
  });
}

export function prefetchUserImages(users, { size = 320, perUserLimit = 3, totalLimit = 80 } = {}) {
  if (!Array.isArray(users) || users.length === 0) {
    return;
  }

  const urls = users
    .flatMap((user) => getUserImageCandidates(user, size).slice(0, perUserLimit))
    .filter(Boolean);
  prefetchImageUrls(urls, totalLimit);
}

export { LOCAL_FALLBACK_AVATAR };
