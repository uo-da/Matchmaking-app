/**
 * @param {Array} users
 * @param {{ query?: string, stackTag?: string, stackTags?: string[], minYears?: number, minAge?: number, maxAge?: number, genders?: string[] }} filter
 */
export function filterUsersByCriteria(users, filter) {
  return users.filter((user) => {
    const query = filter.query?.trim().toLowerCase();
    if (query) {
      const searchableText = [
        user.displayName,
        user.bio,
        user.hobbies,
        ...(Array.isArray(user.stackTags) ? user.stackTags : [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    const stackTags = Array.isArray(filter.stackTags) && filter.stackTags.length > 0
      ? filter.stackTags
      : filter.stackTag
        ? [filter.stackTag]
        : [];
    if (stackTags.length > 0) {
      const userStackTags = Array.isArray(user.stackTags) ? user.stackTags : [];
      const hasMatchingStack = stackTags.some((stack) => {
        const matchTag = stack.trim().toLowerCase();
        return matchTag && userStackTags.some((tag) => tag.toLowerCase().includes(matchTag));
      });
      if (!hasMatchingStack) {
        return false;
      }
    }

    if (filter.minYears && user.experienceYears < filter.minYears) {
      return false;
    }

    if (typeof filter.minAge === 'number' && typeof user.age === 'number' && user.age < filter.minAge) {
      return false;
    }

    if (typeof filter.maxAge === 'number' && filter.maxAge < 80 && typeof user.age === 'number' && user.age > filter.maxAge) {
      return false;
    }

    if (Array.isArray(filter.genders) && filter.genders.length > 0 && user.gender) {
      if (!filter.genders.includes(user.gender)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * @param {string} userId
 * @param {Array} users
 */
export function getMatchesForUser(userId, users) {
  const user = users.find((item) => item.id === userId);
  if (!user || !Array.isArray(user.matches)) {
    return [];
  }
  return users.filter((item) => user.matches.includes(item.id));
}
