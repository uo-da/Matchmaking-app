/**
 * @param {Array} users
 * @param {{ stackTag: string, minYears: number }} filter
 */
export function filterUsersByCriteria(users, filter) {
  return users.filter((user) => {
    if (filter.stackTag) {
      const matchTag = filter.stackTag.trim().toLowerCase();
      if (!user.stackTags.some((tag) => tag.toLowerCase().includes(matchTag))) {
        return false;
      }
    }
    if (filter.minYears && user.experienceYears < filter.minYears) {
      return false;
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
