import { filterUsersByCriteria, getMatchesForUser } from '../src/utils/matchUtils';

describe('matchUtils', () => {
  const users = [
    { id: 'user-1', displayName: 'A', age: 28, gender: '男性', scoutNg: false, stackTags: ['React', 'Node.js'], experienceYears: 3, matches: ['user-2'] },
    { id: 'user-2', displayName: 'B', age: 32, gender: '女性', scoutNg: false, stackTags: ['Python'], experienceYears: 5, matches: ['user-1'] },
    { id: 'user-3', displayName: 'C', age: 24, gender: '女性', scoutNg: true, stackTags: ['React'], experienceYears: 1, matches: [] }
  ];

  test('filterUsersByCriteria should return users matching stack tag and experience', () => {
    const result = filterUsersByCriteria(users, { stackTag: 'React', minYears: 2 });
    expect(result).toEqual([
      { id: 'user-1', displayName: 'A', age: 28, gender: '男性', scoutNg: false, stackTags: ['React', 'Node.js'], experienceYears: 3, matches: ['user-2'] }
    ]);
  });

  test('filterUsersByCriteria should apply age, gender, scout, and multiple stack filters', () => {
    const result = filterUsersByCriteria(users, {
      stackTags: ['React', 'Python'],
      minAge: 25,
      maxAge: 35,
      genders: ['女性'],
      excludeScoutNg: true
    });
    expect(result).toEqual([
      { id: 'user-2', displayName: 'B', age: 32, gender: '女性', scoutNg: false, stackTags: ['Python'], experienceYears: 5, matches: ['user-1'] }
    ]);
  });

  test('getMatchesForUser should return matched user objects', () => {
    const matches = getMatchesForUser('user-1', users);
    expect(matches).toEqual([
      { id: 'user-2', displayName: 'B', age: 32, gender: '女性', scoutNg: false, stackTags: ['Python'], experienceYears: 5, matches: ['user-1'] }
    ]);
  });
});
