/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：知识库（RAG）数据访问层。包含文档表、片段表（含向量）、会话表与消息表，
 *      建表语句幂等，服务启动时自动补齐表结构。
 */
const { guan_get_db, guan_query_all, guan_query_one, guan_execute } = require('./guan_db');

/** 建表 SQL（与 backend/guan_database.md 保持一致） */
const guan_schema_sql = `
CREATE TABLE IF NOT EXISTS guan_kb_document (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_name TEXT NOT NULL,
  guan_type TEXT NOT NULL DEFAULT 'txt',
  guan_size INTEGER NOT NULL DEFAULT 0,
  guan_chars INTEGER NOT NULL DEFAULT 0,
  guan_chunk_total INTEGER NOT NULL DEFAULT 0,
  guan_embed_total INTEGER NOT NULL DEFAULT 0,
  guan_status TEXT NOT NULL DEFAULT 'indexed',
  guan_note TEXT NOT NULL DEFAULT '',
  guan_hash TEXT NOT NULL DEFAULT '',
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guan_kb_chunk (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_document_id INTEGER NOT NULL,
  guan_index INTEGER NOT NULL DEFAULT 0,
  guan_content TEXT NOT NULL,
  guan_chars INTEGER NOT NULL DEFAULT 0,
  guan_embedding TEXT,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (guan_document_id) REFERENCES guan_kb_document (guan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guan_chat_session (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_title TEXT NOT NULL DEFAULT '新会话',
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  guan_updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guan_chat_message (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_session_id INTEGER NOT NULL,
  guan_role TEXT NOT NULL,
  guan_content TEXT NOT NULL,
  guan_citations TEXT NOT NULL DEFAULT '',
  guan_tokens INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (guan_session_id) REFERENCES guan_chat_session (guan_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS guan_idx_chunk_doc ON guan_kb_chunk (guan_document_id);
CREATE INDEX IF NOT EXISTS guan_idx_doc_status ON guan_kb_document (guan_status);
CREATE INDEX IF NOT EXISTS guan_idx_msg_session ON guan_chat_message (guan_session_id);
`;

/** 幂等建表 */
function guan_ensure_schema() {
  guan_get_db().exec(guan_schema_sql);
  return true;
}

/* ================= 文档 ================= */

function guan_insert_document(guan_doc) {
  const guan_result = guan_execute(
    `INSERT INTO guan_kb_document
      (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      guan_doc.guan_name,
      guan_doc.guan_type,
      guan_doc.guan_size,
      guan_doc.guan_chars,
      guan_doc.guan_chunk_total,
      guan_doc.guan_embed_total || 0,
      guan_doc.guan_status || 'indexed',
      guan_doc.guan_note || '',
      guan_doc.guan_hash || ''
    ]
  );
  return Number(guan_result.lastInsertRowid);
}

function guan_update_document_embed(guan_doc_id, guan_embed_total) {
  guan_execute('UPDATE guan_kb_document SET guan_embed_total = ? WHERE guan_id = ?', [guan_embed_total, guan_doc_id]);
}

/** 更新文档的向量计数与状态（初始化补录向量后调用） */
function guan_update_document_index(guan_doc_id, guan_embed_total, guan_status) {
  guan_execute(
    'UPDATE guan_kb_document SET guan_embed_total = ?, guan_status = ? WHERE guan_id = ?',
    [guan_embed_total, guan_status || 'indexed', guan_doc_id]
  );
}

function guan_find_document_by_hash(guan_hash) {
  return guan_query_one('SELECT * FROM guan_kb_document WHERE guan_hash = ?', [guan_hash]);
}

function guan_list_documents(guan_keyword) {
  const guan_like = `%${String(guan_keyword || '').trim()}%`;
  if (guan_keyword) {
    return guan_query_all(
      'SELECT * FROM guan_kb_document WHERE guan_name LIKE ? ORDER BY guan_id DESC',
      [guan_like]
    );
  }
  return guan_query_all('SELECT * FROM guan_kb_document ORDER BY guan_id DESC');
}

function guan_get_document(guan_doc_id) {
  return guan_query_one('SELECT * FROM guan_kb_document WHERE guan_id = ?', [guan_doc_id]);
}

function guan_delete_document(guan_doc_id) {
  guan_execute('DELETE FROM guan_kb_chunk WHERE guan_document_id = ?', [guan_doc_id]);
  const guan_result = guan_execute('DELETE FROM guan_kb_document WHERE guan_id = ?', [guan_doc_id]);
  return Number(guan_result.changes);
}

/* ================= 片段 ================= */

function guan_insert_chunks(guan_doc_id, guan_chunks, guan_vectors) {
  const guan_db = guan_get_db();
  const guan_stmt = guan_db.prepare(
    `INSERT INTO guan_kb_chunk (guan_document_id, guan_index, guan_content, guan_chars, guan_embedding)
     VALUES (?, ?, ?, ?, ?)`
  );
  let guan_embedded = 0;

  guan_chunks.forEach((guan_chunk, guan_i) => {
    const guan_vector = guan_vectors && guan_vectors[guan_i];
    if (guan_vector) {
      guan_embedded += 1;
    }
    guan_stmt.run(
      guan_doc_id,
      guan_chunk.guan_index,
      guan_chunk.guan_content,
      guan_chunk.guan_chars,
      guan_vector ? JSON.stringify(guan_vector) : null
    );
  });

  return guan_embedded;
}

function guan_list_chunks(guan_doc_id) {
  return guan_query_all(
    'SELECT guan_id, guan_document_id, guan_index, guan_content, guan_chars, guan_created_at FROM guan_kb_chunk WHERE guan_document_id = ? ORDER BY guan_index ASC',
    [guan_doc_id]
  );
}

/** 检索用：取出全部片段（可按文档范围过滤），含向量 */
function guan_list_chunks_for_search(guan_doc_ids) {
  if (Array.isArray(guan_doc_ids) && guan_doc_ids.length > 0) {
    const guan_marks = guan_doc_ids.map(() => '?').join(', ');
    return guan_query_all(
      `SELECT c.guan_id, c.guan_document_id, c.guan_index, c.guan_content, c.guan_embedding,
              d.guan_name AS guan_doc_name, d.guan_type AS guan_doc_type
         FROM guan_kb_chunk c
         JOIN guan_kb_document d ON d.guan_id = c.guan_document_id
        WHERE c.guan_document_id IN (${guan_marks})
        ORDER BY c.guan_document_id ASC, c.guan_index ASC`,
      guan_doc_ids
    );
  }
  return guan_query_all(
    `SELECT c.guan_id, c.guan_document_id, c.guan_index, c.guan_content, c.guan_embedding,
            d.guan_name AS guan_doc_name, d.guan_type AS guan_doc_type
       FROM guan_kb_chunk c
       JOIN guan_kb_document d ON d.guan_id = c.guan_document_id
      ORDER BY c.guan_document_id ASC, c.guan_index ASC`
  );
}

/** 未向量化片段（初始化脚本补录向量用） */
function guan_list_chunks_without_embed() {
  return guan_query_all('SELECT guan_id, guan_content FROM guan_kb_chunk WHERE guan_embedding IS NULL');
}

function guan_set_chunk_embedding(guan_chunk_id, guan_vector) {
  guan_execute('UPDATE guan_kb_chunk SET guan_embedding = ? WHERE guan_id = ?', [JSON.stringify(guan_vector), guan_chunk_id]);
}

/* ================= 统计 ================= */

function guan_get_stats() {
  const guan_doc = guan_query_one(
    `SELECT COUNT(*) AS guan_total,
            COALESCE(SUM(guan_chars), 0) AS guan_chars,
            COALESCE(SUM(guan_chunk_total), 0) AS guan_chunks
       FROM guan_kb_document`
  );
  const guan_chunk = guan_query_one(
    `SELECT COUNT(*) AS guan_total,
            COALESCE(SUM(CASE WHEN guan_embedding IS NOT NULL THEN 1 ELSE 0 END), 0) AS guan_embedded
       FROM guan_kb_chunk`
  );
  return {
    guan_document_total: guan_doc.guan_total,
    guan_chars_total: guan_doc.guan_chars,
    guan_chunk_total: guan_chunk.guan_total,
    guan_embed_total: guan_chunk.guan_embedded
  };
}

/* ================= 会话与消息 ================= */

function guan_ensure_session(guan_title) {
  const guan_exist = guan_query_one('SELECT * FROM guan_chat_session ORDER BY guan_id ASC LIMIT 1');
  if (guan_exist) {
    return guan_exist.guan_id;
  }
  const guan_result = guan_execute(
    'INSERT INTO guan_chat_session (guan_title) VALUES (?)',
    [String(guan_title || 'RAG 问答会话').slice(0, 60)]
  );
  return Number(guan_result.lastInsertRowid);
}

/** 批量确保会话存在（初始化脚本写示例会话用，按标题去重） */
function guan_ensure_session_list(guan_titles) {
  const guan_ids = [];
  (guan_titles || []).forEach((guan_title) => {
    const guan_exist = guan_query_one('SELECT guan_id FROM guan_chat_session WHERE guan_title = ?', [guan_title]);
    if (guan_exist) {
      guan_ids.push(guan_exist.guan_id);
      return;
    }
    const guan_result = guan_execute('INSERT INTO guan_chat_session (guan_title) VALUES (?)', [guan_title]);
    guan_ids.push(Number(guan_result.lastInsertRowid));
  });
  return guan_ids;
}

function guan_save_message(guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) {
  guan_execute(
    `INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens)
     VALUES (?, ?, ?, ?, ?)`,
    [guan_session_id, guan_role, guan_content, guan_citations || '', guan_tokens || 0]
  );
  guan_execute(
    "UPDATE guan_chat_session SET guan_updated_at = datetime('now', 'localtime') WHERE guan_id = ?",
    [guan_session_id]
  );
}

function guan_list_messages(guan_session_id, guan_limit = 20) {
  return guan_query_all(
    `SELECT * FROM guan_chat_message WHERE guan_session_id = ? ORDER BY guan_id DESC LIMIT ?`,
    [guan_session_id, guan_limit]
  ).reverse();
}

function guan_clear_messages(guan_session_id) {
  guan_execute('DELETE FROM guan_chat_message WHERE guan_session_id = ?', [guan_session_id]);
}

module.exports = {
  guan_ensure_schema,
  guan_insert_document,
  guan_update_document_embed,
  guan_update_document_index,
  guan_find_document_by_hash,
  guan_list_documents,
  guan_get_document,
  guan_delete_document,
  guan_insert_chunks,
  guan_list_chunks,
  guan_list_chunks_for_search,
  guan_list_chunks_without_embed,
  guan_set_chunk_embedding,
  guan_get_stats,
  guan_ensure_session,
  guan_ensure_session_list,
  guan_save_message,
  guan_list_messages,
  guan_clear_messages
};
