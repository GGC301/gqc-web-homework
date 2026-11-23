/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：基础 AI 聊天（多轮对话）数据访问层 —— 会话表 guan_chat_talk 与消息表 guan_chat_turn。
 *      被压缩的历史消息用 guan_compressed = 1 标记，摘要写入会话表的 guan_summary。
 */
const { guan_get_db, guan_query_all, guan_query_one, guan_execute } = require('./guan_db');

const guan_schema_sql = `
CREATE TABLE IF NOT EXISTS guan_chat_talk (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_title TEXT NOT NULL DEFAULT '新的对话',
  guan_summary TEXT NOT NULL DEFAULT '',
  guan_turn_total INTEGER NOT NULL DEFAULT 0,
  guan_compress_total INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  guan_updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guan_chat_turn (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_talk_id INTEGER NOT NULL,
  guan_role TEXT NOT NULL,
  guan_content TEXT NOT NULL,
  guan_tokens INTEGER NOT NULL DEFAULT 0,
  guan_compressed INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (guan_talk_id) REFERENCES guan_chat_talk (guan_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS guan_idx_turn_talk ON guan_chat_turn (guan_talk_id);
`;

function guan_ensure_schema() {
  guan_get_db().exec(guan_schema_sql);
  return true;
}

/* ================= 会话 ================= */
function guan_create_talk(guan_title) {
  const guan_result = guan_execute(
    'INSERT INTO guan_chat_talk (guan_title) VALUES (?)',
    [String(guan_title || '新的对话').slice(0, 40)]
  );
  return Number(guan_result.lastInsertRowid);
}

function guan_list_talks(guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 20;
  return guan_query_all(
    `SELECT guan_id, guan_title, guan_summary, guan_turn_total, guan_compress_total,
            guan_created_at, guan_updated_at
       FROM guan_chat_talk ORDER BY guan_updated_at DESC, guan_id DESC LIMIT ?`,
    [guan_size]
  );
}

function guan_get_talk(guan_talk_id) {
  return guan_query_one('SELECT * FROM guan_chat_talk WHERE guan_id = ?', [guan_talk_id]);
}

function guan_rename_talk(guan_talk_id, guan_title) {
  const guan_result = guan_execute(
    "UPDATE guan_chat_talk SET guan_title = ?, guan_updated_at = datetime('now', 'localtime') WHERE guan_id = ?",
    [String(guan_title || '新的对话').slice(0, 40), guan_talk_id]
  );
  return guan_result.changes || 0;
}

function guan_delete_talk(guan_talk_id) {
  guan_execute('DELETE FROM guan_chat_turn WHERE guan_talk_id = ?', [guan_talk_id]);
  const guan_result = guan_execute('DELETE FROM guan_chat_talk WHERE guan_id = ?', [guan_talk_id]);
  return guan_result.changes || 0;
}

function guan_update_summary(guan_talk_id, guan_summary, guan_compress_inc) {
  guan_execute(
    `UPDATE guan_chat_talk
        SET guan_summary = ?,
            guan_compress_total = guan_compress_total + ?,
            guan_updated_at = datetime('now', 'localtime')
      WHERE guan_id = ?`,
    [guan_summary || '', Number(guan_compress_inc) || 0, guan_talk_id]
  );
}

/* ================= 消息 ================= */
function guan_add_turn(guan_talk_id, guan_role, guan_content, guan_tokens) {
  const guan_result = guan_execute(
    'INSERT INTO guan_chat_turn (guan_talk_id, guan_role, guan_content, guan_tokens) VALUES (?, ?, ?, ?)',
    [guan_talk_id, guan_role, String(guan_content || ''), Number(guan_tokens) || 0]
  );
  guan_execute(
    `UPDATE guan_chat_talk
        SET guan_turn_total = guan_turn_total + 1,
            guan_updated_at = datetime('now', 'localtime')
      WHERE guan_id = ?`,
    [guan_talk_id]
  );
  return Number(guan_result.lastInsertRowid);
}

/** 最近若干条未压缩消息（按时间正序） */
function guan_list_live_turns(guan_talk_id, guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 40;
  return guan_query_all(
    `SELECT * FROM guan_chat_turn
      WHERE guan_talk_id = ? AND guan_compressed = 0
      ORDER BY guan_id DESC LIMIT ?`,
    [guan_talk_id, guan_size]
  ).reverse();
}

function guan_list_turns(guan_talk_id, guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 100;
  return guan_query_all(
    'SELECT * FROM guan_chat_turn WHERE guan_talk_id = ? ORDER BY guan_id ASC LIMIT ?',
    [guan_talk_id, guan_size]
  );
}

function guan_mark_compressed(guan_turn_ids) {
  if (!Array.isArray(guan_turn_ids) || guan_turn_ids.length === 0) {
    return 0;
  }
  const guan_marks = guan_turn_ids.map(() => '?').join(', ');
  const guan_result = guan_execute(
    `UPDATE guan_chat_turn SET guan_compressed = 1 WHERE guan_id IN (${guan_marks})`,
    guan_turn_ids
  );
  return guan_result.changes || 0;
}

function guan_get_stats() {
  const guan_talk = guan_query_one('SELECT COUNT(*) AS guan_total FROM guan_chat_talk');
  const guan_turn = guan_query_one('SELECT COUNT(*) AS guan_total, COALESCE(SUM(guan_compressed), 0) AS guan_compressed FROM guan_chat_turn');
  return {
    guan_talk_total: (guan_talk && guan_talk.guan_total) || 0,
    guan_turn_total: (guan_turn && guan_turn.guan_total) || 0,
    guan_compressed_total: (guan_turn && guan_turn.guan_compressed) || 0
  };
}

module.exports = {
  guan_ensure_schema,
  guan_create_talk,
  guan_list_talks,
  guan_get_talk,
  guan_rename_talk,
  guan_delete_talk,
  guan_update_summary,
  guan_add_turn,
  guan_list_live_turns,
  guan_list_turns,
  guan_mark_compressed,
  guan_get_stats
};
