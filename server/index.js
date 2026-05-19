require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'data', 'database.sqlite');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your-github-client-id';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your-github-client-secret';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || `${BACKEND_URL}/auth/github/callback`;
const GITHUB_FAILURE_URL = process.env.GITHUB_FAILURE_URL || `${FRONTEND_URL}/login`;
const GITHUB_SUCCESS_URL = process.env.GITHUB_SUCCESS_URL || FRONTEND_URL;

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new sqlite3.Database(DB_FILE);
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) {
      reject(err);
    } else {
      resolve(this);
    }
  });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
    } else {
      resolve(row);
    }
  });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
    } else {
      resolve(rows);
    }
  });
});

const serializeUser = (row) => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    githubUsername: row.githubUsername,
    displayName: row.displayName,
    bio: row.bio,
    age: row.age,
    ageVerified: Boolean(row.ageVerified),
    experienceYears: row.experienceYears,
    stackTags: JSON.parse(row.stackTags || '[]'),
    hobbies: row.hobbies,
    likedUserIds: JSON.parse(row.likedUserIds || '[]'),
    superLikedUserIds: JSON.parse(row.superLikedUserIds || '[]'),
    nopedUserIds: JSON.parse(row.nopedUserIds || '[]'),
    matches: JSON.parse(row.matches || '[]'),
    avatar: row.avatar
  };
};

const normalizeArray = (value) => Array.isArray(value) ? value : [];
const addUnique = (list, value) => (list.includes(value) ? list : [...list, value]);
const mergeUnique = (list, values) => {
  const normalized = normalizeArray(list);
  return normalizeArray(values).reduce((acc, value) => addUnique(acc, value), normalized);
};

const WASABI_FIXTURE_USERS = [
  {
    id: 'user-wasabi49',
    githubUsername: 'wasabi49',
    displayName: 'wasabi49',
    bio: 'チャット機能の検証用アカウントです。',
    age: 28,
    ageVerified: 1,
    experienceYears: 5,
    stackTags: ['React', 'Node.js', 'TypeScript'],
    hobbies: 'テスト, 検証',
    avatar: 'https://github.com/wasabi49.png',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-wasabi-dummy-1',
    githubUsername: 'wasabi49-dummy-1',
    displayName: 'Dummy Akari',
    bio: 'wasabi49の検証用ダミーアカウントです。',
    age: 27,
    ageVerified: 1,
    experienceYears: 4,
    stackTags: ['React', 'Figma'],
    hobbies: '散歩, 読書',
    avatar: 'https://github.com/identicons/wasabi49-dummy-1.png',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-wasabi-dummy-2',
    githubUsername: 'wasabi49-dummy-2',
    displayName: 'Dummy Ren',
    bio: 'wasabi49の検証用ダミーアカウントです。',
    age: 30,
    ageVerified: 1,
    experienceYears: 6,
    stackTags: ['Python', 'AWS'],
    hobbies: '映画, カフェ',
    avatar: 'https://github.com/identicons/wasabi49-dummy-2.png',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  },
  {
    id: 'user-wasabi-dummy-3',
    githubUsername: 'wasabi49-dummy-3',
    displayName: 'Dummy Mei',
    bio: 'wasabi49の検証用ダミーアカウントです。',
    age: 25,
    ageVerified: 1,
    experienceYears: 3,
    stackTags: ['Go', 'Kubernetes'],
    hobbies: '写真, 旅行',
    avatar: 'https://github.com/identicons/wasabi49-dummy-3.png',
    likedUserIds: [],
    superLikedUserIds: [],
    nopedUserIds: [],
    matches: []
  }
];

const ensureWasabiFixtures = async () => {
  const insert = `INSERT INTO users (id, githubUsername, displayName, bio, age, ageVerified, experienceYears, stackTags, hobbies, likedUserIds, superLikedUserIds, nopedUserIds, matches, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  for (const fixture of WASABI_FIXTURE_USERS) {
    let existing = await getUserByGithub(fixture.githubUsername);
    if (!existing) {
      await run(insert, [
        fixture.id,
        fixture.githubUsername,
        fixture.displayName,
        fixture.bio,
        fixture.age,
        fixture.ageVerified,
        fixture.experienceYears,
        JSON.stringify(fixture.stackTags),
        fixture.hobbies,
        JSON.stringify(fixture.likedUserIds),
        JSON.stringify(fixture.superLikedUserIds),
        JSON.stringify(fixture.nopedUserIds),
        JSON.stringify(fixture.matches),
        fixture.avatar
      ]);
      existing = await getUserByGithub(fixture.githubUsername);
    }

    if (!existing) {
      continue;
    }

    const merged = {
      ...existing,
      likedUserIds: mergeUnique(existing.likedUserIds, fixture.likedUserIds),
      superLikedUserIds: mergeUnique(existing.superLikedUserIds, fixture.superLikedUserIds),
      nopedUserIds: normalizeArray(existing.nopedUserIds)
    };

    await saveUser(merged);
  }

  const wasabi = await getUserByGithub('wasabi49');
  if (!wasabi) {
    return;
  }

  const wasabiLikes = normalizeArray(wasabi.likedUserIds);
  const wasabiSuperLikes = normalizeArray(wasabi.superLikedUserIds);
  let wasabiMatches = normalizeArray(wasabi.matches);

  const dummyUsers = await Promise.all([
    getUserByGithub('wasabi49-dummy-1'),
    getUserByGithub('wasabi49-dummy-2'),
    getUserByGithub('wasabi49-dummy-3')
  ]);

  for (const dummy of dummyUsers) {
    if (!dummy) {
      continue;
    }

    const shouldSuperLike = dummy.githubUsername === 'wasabi49-dummy-3';
    const updatedDummy = {
      ...dummy,
      likedUserIds: shouldSuperLike
        ? normalizeArray(dummy.likedUserIds)
        : addUnique(normalizeArray(dummy.likedUserIds), wasabi.id),
      superLikedUserIds: shouldSuperLike
        ? addUnique(normalizeArray(dummy.superLikedUserIds), wasabi.id)
        : normalizeArray(dummy.superLikedUserIds),
      nopedUserIds: normalizeArray(dummy.nopedUserIds).filter((id) => id !== wasabi.id)
    };

    const dummyLikesWasabi = normalizeArray(updatedDummy.likedUserIds).includes(wasabi.id)
      || normalizeArray(updatedDummy.superLikedUserIds).includes(wasabi.id);
    const wasabiLikesDummy = wasabiLikes.includes(dummy.id) || wasabiSuperLikes.includes(dummy.id);

    if (!dummyLikesWasabi || !wasabiLikesDummy) {
      await saveUser(updatedDummy);
      continue;
    }

    wasabiMatches = addUnique(wasabiMatches, dummy.id);
    updatedDummy.matches = addUnique(normalizeArray(updatedDummy.matches), wasabi.id);
    await saveUser(updatedDummy);
  }

  await saveUser({
    ...wasabi,
    matches: wasabiMatches
  });
};

const initDatabase = async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    githubUsername TEXT UNIQUE,
    displayName TEXT,
    bio TEXT,
    age INTEGER,
    ageVerified INTEGER DEFAULT 0,
    experienceYears INTEGER DEFAULT 0,
    stackTags TEXT,
    hobbies TEXT,
    likedUserIds TEXT,
    superLikedUserIds TEXT,
    nopedUserIds TEXT,
    matches TEXT,
    avatar TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    matchKey TEXT,
    senderId TEXT,
    receiverId TEXT,
    text TEXT,
    timestamp INTEGER,
    isRead INTEGER DEFAULT 0,
    type TEXT DEFAULT 'message'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS collab_files (
    id TEXT PRIMARY KEY,
    matchKey TEXT,
    name TEXT,
    content TEXT,
    updatedBy TEXT,
    updatedAt INTEGER
  )`);

  const row = await get('SELECT COUNT(*) AS count FROM users');
  if (row.count === 0) {
    const initialUsers = [
      {
        id: 'user-1',
        githubUsername: 'octocat',
        displayName: 'Nao',
        bio: 'ReactとNode.jsでプロダクト開発をしています。',
        age: 28,
        ageVerified: 1,
        experienceYears: 5,
        stackTags: JSON.stringify(['React', 'Node.js', 'TypeScript']),
        hobbies: '読書, カフェ巡り',
        likedUserIds: JSON.stringify(['user-2']),
        superLikedUserIds: JSON.stringify([]),
        nopedUserIds: JSON.stringify([]),
        matches: JSON.stringify(['user-2']),
        avatar: 'https://github.com/octocat.png'
      },
      {
        id: 'user-2',
        githubUsername: 'mona',
        displayName: 'Mona',
        bio: 'インフラとインシデント対応が得意です。',
        age: 32,
        ageVerified: 1,
        experienceYears: 8,
        stackTags: JSON.stringify(['AWS', 'Docker', 'Kubernetes']),
        hobbies: 'キャンプ, 写真',
        likedUserIds: JSON.stringify(['user-1']),
        superLikedUserIds: JSON.stringify([]),
        nopedUserIds: JSON.stringify([]),
        matches: JSON.stringify(['user-1']),
        avatar: 'https://github.com/mona.png'
      },
      {
        id: 'user-3',
        githubUsername: 'ramen',
        displayName: 'Raita',
        bio: 'フロントエンドのUX改善が好きです。',
        age: 26,
        ageVerified: 1,
        experienceYears: 4,
        stackTags: JSON.stringify(['React', 'Vue', 'CSS']),
        hobbies: 'ラーメン, 映画',
        likedUserIds: JSON.stringify([]),
        superLikedUserIds: JSON.stringify([]),
        nopedUserIds: JSON.stringify([]),
        matches: JSON.stringify([]),
        avatar: 'https://github.com/ramen.png'
      }
    ];

    const insert = `INSERT INTO users (id, githubUsername, displayName, bio, age, ageVerified, experienceYears, stackTags, hobbies, likedUserIds, superLikedUserIds, nopedUserIds, matches, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    for (const user of initialUsers) {
      await run(insert, [
        user.id,
        user.githubUsername,
        user.displayName,
        user.bio,
        user.age,
        user.ageVerified,
        user.experienceYears,
        user.stackTags,
        user.hobbies,
        user.likedUserIds,
        user.superLikedUserIds,
        user.nopedUserIds,
        user.matches,
        user.avatar
      ]);
    }
  }

  await ensureWasabiFixtures();
};

const getUserById = async (id) => {
  const row = await get('SELECT * FROM users WHERE id = ?', [id]);
  return serializeUser(row);
};

const getUserByGithub = async (githubUsername) => {
  const row = await get('SELECT * FROM users WHERE githubUsername = ?', [githubUsername]);
  return serializeUser(row);
};

const saveUser = async (user) => {
  await run(`UPDATE users SET displayName = ?, bio = ?, age = ?, ageVerified = ?, experienceYears = ?, stackTags = ?, hobbies = ?, likedUserIds = ?, superLikedUserIds = ?, nopedUserIds = ?, matches = ?, avatar = ? WHERE id = ?`, [
    user.displayName,
    user.bio,
    user.age,
    user.ageVerified ? 1 : 0,
    user.experienceYears,
    JSON.stringify(normalizeArray(user.stackTags)),
    user.hobbies,
    JSON.stringify(normalizeArray(user.likedUserIds)),
    JSON.stringify(normalizeArray(user.superLikedUserIds)),
    JSON.stringify(normalizeArray(user.nopedUserIds)),
    JSON.stringify(normalizeArray(user.matches)),
    user.avatar,
    user.id
  ]);
  return getUserById(user.id);
};

const createUser = async ({ githubUsername, displayName, avatar }) => {
  const id = `user-${Date.now()}`;
  await run(`INSERT INTO users (id, githubUsername, displayName, bio, age, ageVerified, experienceYears, stackTags, hobbies, likedUserIds, superLikedUserIds, nopedUserIds, matches, avatar)
    VALUES (?, ?, ?, '', NULL, 0, 0, '[]', '', '[]', '[]', '[]', '[]', ?)`, [
    id,
    githubUsername,
    displayName,
    avatar
  ]);
  return getUserById(id);
};

const getAllUsers = async () => {
  const rows = await all('SELECT * FROM users');
  return rows.map(serializeUser);
};

const getMatchKey = (userId, matchId) => [userId, matchId].sort().join('-');

const createMessage = async ({ senderId, receiverId, text }) => {
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    matchKey: getMatchKey(senderId, receiverId),
    senderId,
    receiverId,
    text,
    timestamp: Date.now(),
    isRead: 0,
    type: 'message'
  };
  await run(`INSERT INTO chat_messages (id, matchKey, senderId, receiverId, text, timestamp, isRead, type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
    message.id,
    message.matchKey,
    message.senderId,
    message.receiverId,
    message.text,
    message.timestamp,
    message.isRead,
    message.type
  ]);
  return message;
};

const getMessagesForMatch = async (userId, matchId) => {
  const matchKey = getMatchKey(userId, matchId);
  const rows = await all('SELECT * FROM chat_messages WHERE matchKey = ? ORDER BY timestamp ASC', [matchKey]);
  return rows.map((row) => ({
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    text: row.text,
    timestamp: row.timestamp,
    isRead: Boolean(row.isRead),
    type: row.type,
    matchKey: row.matchKey
  }));
};

const markChatMessagesRead = async (userId, matchId) => {
  const matchKey = getMatchKey(userId, matchId);
  await run('UPDATE chat_messages SET isRead = 1 WHERE matchKey = ? AND receiverId = ? AND isRead = 0', [matchKey, userId]);
  return getMessagesForMatch(userId, matchId);
};

const getEditorFilesForMatch = async (userId, matchId) => {
  const matchKey = getMatchKey(userId, matchId);
  const rows = await all('SELECT * FROM collab_files WHERE matchKey = ? ORDER BY updatedAt ASC', [matchKey]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    content: row.content || '',
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
    matchKey: row.matchKey
  }));
};

const createEditorFile = async ({ userId, matchId, name }) => {
  const trimmedName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : 'memo.txt';
  const file = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    matchKey: getMatchKey(userId, matchId),
    name: trimmedName,
    content: '',
    updatedBy: userId,
    updatedAt: Date.now()
  };

  await run(`INSERT INTO collab_files (id, matchKey, name, content, updatedBy, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)`, [
    file.id,
    file.matchKey,
    file.name,
    file.content,
    file.updatedBy,
    file.updatedAt
  ]);

  return file;
};

const updateEditorFile = async ({ userId, matchId, fileId, name, content }) => {
  const matchKey = getMatchKey(userId, matchId);
  const existing = await get('SELECT * FROM collab_files WHERE id = ? AND matchKey = ?', [fileId, matchKey]);
  if (!existing) {
    return null;
  }

  const nextName = typeof name === 'string' && name.trim()
    ? name.trim().slice(0, 80)
    : existing.name;
  const nextContent = typeof content === 'string' ? content : (existing.content || '');
  const updatedAt = Date.now();
  await run('UPDATE collab_files SET name = ?, content = ?, updatedBy = ?, updatedAt = ? WHERE id = ?', [
    nextName,
    nextContent,
    userId,
    updatedAt,
    fileId
  ]);

  return {
    id: fileId,
    matchKey,
    name: nextName,
    content: nextContent,
    updatedBy: userId,
    updatedAt
  };
};

const deleteEditorFile = async ({ userId, matchId, fileId }) => {
  const matchKey = getMatchKey(userId, matchId);
  const existing = await get('SELECT * FROM collab_files WHERE id = ? AND matchKey = ?', [fileId, matchKey]);
  if (!existing) {
    return null;
  }

  await run('DELETE FROM collab_files WHERE id = ? AND matchKey = ?', [fileId, matchKey]);
  return {
    id: fileId,
    matchKey
  };
};

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true, credentials: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: GITHUB_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const githubUsername = profile.username;
    const displayName = profile.displayName || profile.username;
    const avatar = profile.photos?.[0]?.value || '';
    let user = await getUserByGithub(githubUsername);
    if (!user) {
      user = await createUser({ githubUsername, displayName, avatar });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: GITHUB_FAILURE_URL }),
  (req, res) => {
    res.redirect(GITHUB_SUCCESS_URL);
  }
);

app.get('/auth/user', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await getUserById(req.user.id);
  res.json(user);
});

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

app.post('/api/users/guest', async (req, res, next) => {
  const { githubUsername, displayName, avatar } = req.body || {};
  if (!githubUsername || !displayName) {
    return res.status(400).json({ error: 'githubUsername and displayName are required' });
  }
  try {
    const existing = await getUserByGithub(githubUsername);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const user = await createUser({ githubUsername, displayName, avatar });
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      res.json(user);
    });
  } catch (error) {
    console.error('Failed to create guest user:', error);
    res.status(500).json({ error: 'Failed to create guest user' });
  }
});

app.get('/api/users', ensureAuthenticated, async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

app.get('/api/users/:id', ensureAuthenticated, async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.put('/api/users/:id/profile', ensureAuthenticated, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const current = await getUserById(req.params.id);
  if (!current) {
    return res.status(404).json({ error: 'User not found' });
  }
  const updated = {
    ...current,
    ...req.body,
    stackTags: normalizeArray(req.body.stackTags || current.stackTags),
    likedUserIds: normalizeArray(current.likedUserIds),
    superLikedUserIds: normalizeArray(current.superLikedUserIds),
    nopedUserIds: normalizeArray(current.nopedUserIds),
    matches: normalizeArray(current.matches)
  };
  const saved = await saveUser(updated);
  res.json(saved);
});

app.post('/api/users/:id/reaction', ensureAuthenticated, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { targetId, isSuperLike = false } = req.body;
  if (!targetId) {
    return res.status(400).json({ error: 'targetId is required' });
  }
  const user = await getUserById(req.params.id);
  const target = await getUserById(targetId);
  if (!user || !target || user.id === target.id) {
    return res.status(400).json({ error: 'Invalid reaction' });
  }

  const userLikes = normalizeArray(user.likedUserIds);
  const userSuperLikes = normalizeArray(user.superLikedUserIds);
  const userNopes = normalizeArray(user.nopedUserIds);
  const targetLikes = normalizeArray(target.likedUserIds);
  const targetSuperLikes = normalizeArray(target.superLikedUserIds);
  const userMatches = normalizeArray(user.matches);
  const targetMatches = normalizeArray(target.matches);

  if (isSuperLike) {
    user.superLikedUserIds = addUnique(userSuperLikes, target.id);
  } else {
    user.likedUserIds = addUnique(userLikes, target.id);
  }
  user.nopedUserIds = userNopes.filter((id) => id !== target.id);

  const isMutual = targetLikes.includes(user.id) || targetSuperLikes.includes(user.id);
  if (isMutual) {
    user.matches = addUnique(userMatches, target.id);
    target.matches = addUnique(targetMatches, user.id);
  }

  await saveUser(target);
  const saved = await saveUser(user);
  res.json(saved);
});

app.post('/api/users/:id/nope', ensureAuthenticated, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { targetId } = req.body;
  if (!targetId) {
    return res.status(400).json({ error: 'targetId is required' });
  }
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.nopedUserIds = addUnique(normalizeArray(user.nopedUserIds), targetId);
  const saved = await saveUser(user);
  res.json(saved);
});

app.get('/api/chats/:matchId/messages', ensureAuthenticated, async (req, res) => {
  const messages = await getMessagesForMatch(req.user.id, req.params.matchId);
  res.json(messages);
});

app.post('/api/chats/:matchId/messages', ensureAuthenticated, async (req, res) => {
  const receiverId = req.params.matchId;
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }
  const receiver = await getUserById(receiverId);
  if (!receiver) {
    return res.status(404).json({ error: 'Match user not found' });
  }
  const message = await createMessage({ senderId: req.user.id, receiverId, text: text.trim() });
  broadcastMessage(message);
  res.json(message);
});

app.post('/api/chats/:matchId/read', ensureAuthenticated, async (req, res) => {
  const messages = await markChatMessagesRead(req.user.id, req.params.matchId);
  broadcastMessage({ type: 'read', matchKey: getMatchKey(req.user.id, req.params.matchId), readBy: req.user.id, timestamp: Date.now() });
  res.json(messages);
});

app.get('/api/chats/:matchId/editor/files', ensureAuthenticated, async (req, res) => {
  const files = await getEditorFilesForMatch(req.user.id, req.params.matchId);
  res.json(files);
});

app.post('/api/chats/:matchId/editor/files', ensureAuthenticated, async (req, res) => {
  const { name } = req.body || {};
  const file = await createEditorFile({
    userId: req.user.id,
    matchId: req.params.matchId,
    name
  });
  broadcastMessage({ type: 'editor:file-created', matchKey: file.matchKey, file });
  res.json(file);
});

app.put('/api/chats/:matchId/editor/files/:fileId', ensureAuthenticated, async (req, res) => {
  const file = await updateEditorFile({
    userId: req.user.id,
    matchId: req.params.matchId,
    fileId: req.params.fileId,
    name: req.body?.name,
    content: req.body?.content
  });

  if (!file) {
    return res.status(404).json({ error: 'Editor file not found' });
  }

  broadcastMessage({ type: 'editor:file-updated', matchKey: file.matchKey, file });
  res.json(file);
});

app.delete('/api/chats/:matchId/editor/files/:fileId', ensureAuthenticated, async (req, res) => {
  const removed = await deleteEditorFile({
    userId: req.user.id,
    matchId: req.params.matchId,
    fileId: req.params.fileId
  });

  if (!removed) {
    return res.status(404).json({ error: 'Editor file not found' });
  }

  broadcastMessage({ type: 'editor:file-deleted', matchKey: removed.matchKey, fileId: removed.id });
  res.json(removed);
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (socket) => {
  socket.on('message', () => {
    // No direct incoming commands are required for now.
  });
});

const broadcastMessage = (payload) => {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
