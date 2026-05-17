const Database = require('better-sqlite3');
const { DEFAULT_BANNED_WORDS } = require('./config');

const DATABASE_FILE = 'skyflixer_bot.db';

const db = new Database(DATABASE_FILE);

db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
      user_id INTEGER PRIMARY KEY,
      chat_id INTEGER,
      username TEXT,
      warning_count INTEGER DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS banned_words (
      word TEXT PRIMARY KEY COLLATE NOCASE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS banned_users (
      user_id INTEGER PRIMARY KEY,
      chat_id INTEGER,
      username TEXT,
      reason TEXT,
      banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS temp_bans (
      user_id INTEGER PRIMARY KEY,
      chat_id INTEGER,
      username TEXT,
      unban_at TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS muted_users (
      user_id INTEGER PRIMARY KEY,
      chat_id INTEGER,
      username TEXT,
      unmute_at TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS message_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      chat_id INTEGER,
      message_text TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM banned_words').get();
  if (count.count === 0) {
    const insert = db.prepare('INSERT OR IGNORE INTO banned_words (word) VALUES (?)');
    const insertMany = db.transaction((words) => {
      for (const word of words) {
        insert.run(word);
      }
    });
    insertMany.run(DEFAULT_BANNED_WORDS);
  }
}

function getWarningCount(userId) {
  const result = db.prepare('SELECT warning_count FROM warnings WHERE user_id = ?').get(userId);
  return result ? result.warning_count : 0;
}

function addWarning(userId, chatId, username) {
  const existing = db.prepare('SELECT warning_count FROM warnings WHERE user_id = ?').get(userId);
  
  if (existing) {
    const newCount = existing.warning_count + 1;
    db.prepare(`
      UPDATE warnings
      SET warning_count = ?, chat_id = ?, username = ?, last_updated = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(newCount, chatId, username, userId);
    return newCount;
  } else {
    db.prepare(`
      INSERT INTO warnings (user_id, chat_id, username, warning_count, last_updated)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(userId, chatId, username);
    return 1;
  }
}

function removeWarning(userId) {
  const current = getWarningCount(userId);
  if (current > 0) {
    db.prepare(`
      UPDATE warnings
      SET warning_count = warning_count - 1, last_updated = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(userId);
    return current - 1;
  }
  return 0;
}

function clearWarnings(userId) {
  db.prepare('DELETE FROM warnings WHERE user_id = ?').run(userId);
}

function addBannedWord(word) {
  const result = db.prepare('INSERT OR IGNORE INTO banned_words (word) VALUES (?)').run(word.toLowerCase());
  return result.changes > 0;
}

function removeBannedWord(word) {
  const result = db.prepare('DELETE FROM banned_words WHERE word = ? COLLATE NOCASE').run(word);
  return result.changes > 0;
}

function getBannedWords() {
  const rows = db.prepare('SELECT word FROM banned_words').all();
  return rows.map(row => row.word);
}

function isBannedWord(text) {
  const words = getBannedWords();
  const textLower = text.toLowerCase();
  for (const word of words) {
    if (textLower.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

function addBannedUser(userId, chatId, username, reason) {
  db.prepare(`
    INSERT OR REPLACE INTO banned_users (user_id, chat_id, username, reason)
    VALUES (?, ?, ?, ?)
  `).run(userId, chatId, username, reason);
}

function removeBannedUser(userId) {
  db.prepare('DELETE FROM banned_users WHERE user_id = ?').run(userId);
}

function isUserBanned(userId) {
  const result = db.prepare('SELECT 1 FROM banned_users WHERE user_id = ?').get(userId);
  return !!result;
}

function addTempBan(userId, chatId, username, durationMinutes) {
  const unbanTime = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO temp_bans (user_id, chat_id, username, unban_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, chatId, username, unbanTime);
}

function removeTempBan(userId) {
  db.prepare('DELETE FROM temp_bans WHERE user_id = ?').run(userId);
}

function getExpiredTempBans() {
  const rows = db.prepare(`
    SELECT user_id, chat_id FROM temp_bans
    WHERE unban_at <= datetime('now')
  `).all();
  return rows.map(row => ({ userId: row.user_id, chatId: row.chat_id }));
}

function addMute(userId, chatId, username, durationMinutes) {
  const unmuteTime = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO muted_users (user_id, chat_id, username, unmute_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, chatId, username, unmuteTime);
}

function removeMute(userId) {
  db.prepare('DELETE FROM muted_users WHERE user_id = ?').run(userId);
}

function getExpiredMutes() {
  const rows = db.prepare(`
    SELECT user_id, chat_id FROM muted_users
    WHERE unmute_at <= datetime('now')
  `).all();
  return rows.map(row => ({ userId: row.user_id, chatId: row.chat_id }));
}

function isUserMuted(userId) {
  const result = db.prepare(`
    SELECT 1 FROM muted_users
    WHERE user_id = ? AND unmute_at > datetime('now')
  `).get(userId);
  return !!result;
}

function addMessageHistory(userId, chatId, messageText) {
  db.prepare(`
    DELETE FROM message_history
    WHERE sent_at < datetime('now', '-5 minutes')
  `).run();
  
  db.prepare(`
    INSERT INTO message_history (user_id, chat_id, message_text)
    VALUES (?, ?, ?)
  `).run(userId, chatId, messageText);
}

function countRepeatedMessages(userId, chatId, messageText) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM message_history
    WHERE user_id = ? AND chat_id = ? AND message_text = ?
    AND sent_at > datetime('now', '-5 minutes')
  `).get(userId, chatId, messageText);
  return result ? result.count : 0;
}

function clearUserHistory(userId, chatId) {
  db.prepare(`
    DELETE FROM message_history
    WHERE user_id = ? AND chat_id = ?
  `).run(userId, chatId);
}

function getActiveWarningsCount() {
  const result = db.prepare('SELECT COUNT(*) as count FROM warnings WHERE warning_count > 0').get();
  return result ? result.count : 0;
}

function getTempBansCount() {
  const result = db.prepare('SELECT COUNT(*) as count FROM temp_bans').get();
  return result ? result.count : 0;
}

module.exports = {
  db,
  initDatabase,
  getWarningCount,
  addWarning,
  removeWarning,
  clearWarnings,
  addBannedWord,
  removeBannedWord,
  getBannedWords,
  isBannedWord,
  addBannedUser,
  removeBannedUser,
  isUserBanned,
  addTempBan,
  removeTempBan,
  getExpiredTempBans,
  addMute,
  removeMute,
  getExpiredMutes,
  isUserMuted,
  addMessageHistory,
  countRepeatedMessages,
  clearUserHistory,
  getActiveWarningsCount,
  getTempBansCount
};
