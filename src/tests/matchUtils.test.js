import { filterUsersByCriteria, getMatchesForUser } from '../../src/utils/matchUtils';

describe('matchUtils', () => {
  const users = [
    {
      id: 'user-1',
      displayName: 'A',
      bio: 'React engineer',
      hobbies: 'music',
      age: 28,
      gender: '男性',
      scoutNg: false,
      stackTags: ['React', 'Node.js'],
      experienceYears: 3,
      matches: ['user-2']
    },
    {
      id: 'user-2',
      displayName: 'B',
      bio: 'Python engineer',
      hobbies: 'movie',
      age: 32,
      gender: '女性',
      scoutNg: false,
      stackTags: ['Python'],
      experienceYears: 5,
      matches: ['user-1']
    },
    {
      id: 'user-3',
      displayName: 'C',
      bio: '',
      hobbies: '',
      age: 24,
      gender: '女性',
      scoutNg: true,
      stackTags: ['React'],
      experienceYears: 1,
      matches: []
    },
    {
      id: 'user-4',
      displayName: 'D',
      bio: 'No gender user',
      hobbies: '',
      age: 45,
      scoutNg: false,
      stackTags: [],
      experienceYears: 10,
      matches: null
    }
  ];

  test('filters by stack tag and experience', () => {
    const result = filterUsersByCriteria(users, { stackTag: 'React', minYears: 2 });
    expect(result).toEqual([users[0]]);
  });

  test('applies age, gender, scout and multiple stack filters', () => {
    const result = filterUsersByCriteria(users, {
      stackTags: ['React', 'Python'],
      minAge: 25,
      maxAge: 35,
      genders: ['女性'],
      excludeScoutNg: true
    });
    expect(result).toEqual([users[1]]);
  });

  test('supports text query against name/bio/hobby/stack', () => {
    expect(filterUsersByCriteria(users, { query: 'movie' })).toEqual([users[1]]);
    expect(filterUsersByCriteria(users, { query: 'node' })).toEqual([users[0]]);
  });

  test('does not apply max age upper bound when maxAge is 80', () => {
    const result = filterUsersByCriteria(users, { maxAge: 80, excludeScoutNg: false });
    expect(result).toContainEqual(users[3]);
  });

  test('ignores gender filter when target user has no gender', () => {
    const result = filterUsersByCriteria(users, { genders: ['女性'], excludeScoutNg: false });
    expect(result).toContainEqual(users[3]);
  });

  test('getMatchesForUser returns matched objects or empty array', () => {
    expect(getMatchesForUser('user-1', users)).toEqual([users[1]]);
    expect(getMatchesForUser('user-4', users)).toEqual([]);
    expect(getMatchesForUser('unknown', users)).toEqual([]);
  });
});
