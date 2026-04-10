import { filterUsersByCriteria, getMatchesForUser } from '../../src/utils/matchUtils';

describe('matchUtils', () => {
  const users = [
    { id: 'user-1', displayName: 'A', stackTags: ['React', 'Node.js'], experienceYears: 3, matches: ['user-2'] },
    { id: 'user-2', displayName: 'B', stackTags: ['Python'], experienceYears: 5, matches: ['user-1'] },
    { id: 'user-3', displayName: 'C', stackTags: ['React'], experienceYears: 1, matches: [] }
  ];

  test('filterUsersByCriteria should return users matching stack tag and experience', () => {
    const result = filterUsersByCriteria(users, { stackTag: 'React', minYears: 2 });
    expect(result).toEqual([
      { id: 'user-1', displayName: 'A', stackTags: ['React', 'Node.js'], experienceYears: 3, matches: ['user-2'] }
    ]);
  });

  test('getMatchesForUser should return matched user objects', () => {
    const matches = getMatchesForUser('user-1', users);
    expect(matches).toEqual([
      { id: 'user-2', displayName: 'B', stackTags: ['Python'], experienceYears: 5, matches: ['user-1'] }
    ]);
  });
});
