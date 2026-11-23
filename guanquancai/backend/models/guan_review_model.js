/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-16 | 大模型：deepseek-v4.1-flash
 * 说明：商业评论情感分析数据访问层。包含「上传批次表」与「评论明细表」，
 *      建表语句幂等，服务启动时自动补齐表结构（与 backend/guan_database.md 保持一致）。
 */
const { guan_get_db, guan_query_all, guan_query_one, guan_execute } = require('./guan_db');

const guan_schema_sql = `
CREATE TABLE IF NOT EXISTS guan_review_batch (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_filename TEXT NOT NULL,
  guan_sheet TEXT NOT NULL DEFAULT '',
  guan_total INTEGER NOT NULL DEFAULT 0,
  guan_good INTEGER NOT NULL DEFAULT 0,
  guan_neutral INTEGER NOT NULL DEFAULT 0,
  guan_bad INTEGER NOT NULL DEFAULT 0,
  guan_avg_score REAL NOT NULL DEFAULT 0,
  guan_featured_total INTEGER NOT NULL DEFAULT 0,
  guan_status TEXT NOT NULL DEFAULT 'done',
  guan_note TEXT NOT NULL DEFAULT '',
  guan_model TEXT NOT NULL DEFAULT '',
  guan_usage TEXT NOT NULL DEFAULT '',
  guan_elapsed INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guan_review_item (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_batch_id INTEGER NOT NULL,
  guan_index INTEGER NOT NULL DEFAULT 0,
  guan_author TEXT NOT NULL DEFAULT '',
  guan_rating TEXT NOT NULL DEFAULT '',
  guan_time TEXT NOT NULL DEFAULT '',
  guan_content TEXT NOT NULL,
  guan_label TEXT NOT NULL DEFAULT 'neutral',
  guan_score INTEGER NOT NULL DEFAULT 60,
  guan_value INTEGER NOT NULL DEFAULT 0,
  guan_reason TEXT NOT NULL DEFAULT '',
  guan_tags TEXT NOT NULL DEFAULT '',
  guan_featured INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (guan_batch_id) REFERENCES guan_review_batch (guan_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS guan_idx_review_item_batch ON guan_review_item (guan_batch_id);
CREATE INDEX IF NOT EXISTS guan_idx_review_item_label ON guan_review_item (guan_label);
CREATE INDEX IF NOT EXISTS guan_idx_review_batch_time ON guan_review_batch (guan_created_at);
`;

/** 幂等建表 */
function guan_ensure_schema() {
  guan_get_db().exec(guan_schema_sql);
  return true;
}

/* ================= 批次 ================= */

function guan_insert_batch(guan_batch) {
  const guan_result = guan_execute(
    `INSERT INTO guan_review_batch
      (guan_filename, guan_sheet, guan_total, guan_good, guan_neutral, guan_bad, guan_avg_score,
       guan_featured_total, guan_status, guan_note, guan_model, guan_usage, guan_elapsed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      guan_batch.guan_filename || '',
      guan_batch.guan_sheet || '',
      guan_batch.guan_total || 0,
      guan_batch.guan_good || 0,
      guan_batch.guan_neutral || 0,
      guan_batch.guan_bad || 0,
      guan_batch.guan_avg_score || 0,
      guan_batch.guan_featured_total || 0,
      guan_batch.guan_status || 'done',
      guan_batch.guan_note || '',
      guan_batch.guan_model || '',
      guan_batch.guan_usage || '',
      guan_batch.guan_elapsed || 0
    ]
  );
  return Number(guan_result.lastInsertRowid);
}

function guan_update_batch(guan_batch_id, guan_patch) {
  const guan_fields = [];
  const guan_values = [];
  Object.keys(guan_patch || {}).forEach((guan_key) => {
    if (/^guan_[a-z_]+$/.test(guan_key) && guan_key !== 'guan_id') {
      guan_fields.push(`${guan_key} = ?`);
      guan_values.push(guan_patch[guan_key]);
    }
  });
  if (guan_fields.length === 0) {
    return 0;
  }
  guan_values.push(guan_batch_id);
  const guan_result = guan_execute(
    `UPDATE guan_review_batch SET ${guan_fields.join(', ')} WHERE guan_id = ?`,
    guan_values
  );
  return guan_result.changes || 0;
}

function guan_list_batches(guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 20;
  return guan_query_all(
    'SELECT * FROM guan_review_batch ORDER BY guan_id DESC LIMIT ?',
    [guan_size]
  );
}

function guan_get_batch(guan_batch_id) {
  return guan_query_one('SELECT * FROM guan_review_batch WHERE guan_id = ?', [guan_batch_id]);
}

function guan_delete_batch(guan_batch_id) {
  guan_execute('DELETE FROM guan_review_item WHERE guan_batch_id = ?', [guan_batch_id]);
  const guan_result = guan_execute('DELETE FROM guan_review_batch WHERE guan_id = ?', [guan_batch_id]);
  return guan_result.changes || 0;
}

/* ================= 明细 ================= */

function guan_insert_items(guan_batch_id, guan_items) {
  const guan_statement = guan_get_db().prepare(
    `INSERT INTO guan_review_item
      (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content,
       guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  guan_items.forEach((guan_item) => {
    guan_statement.run(
      guan_batch_id,
      guan_item.guan_index || 0,
      guan_item.guan_author || '',
      guan_item.guan_rating || '',
      guan_item.guan_time || '',
      guan_item.guan_content || '',
      guan_item.guan_label || 'neutral',
      guan_item.guan_score == null ? 60 : guan_item.guan_score,
      guan_item.guan_value == null ? 0 : guan_item.guan_value,
      guan_item.guan_reason || '',
      guan_item.guan_tags || '',
      guan_item.guan_featured ? 1 : 0
    );
  });

  return guan_items.length;
}

function guan_list_items(guan_batch_id, guan_label) {
  if (guan_label === 'good' || guan_label === 'neutral' || guan_label === 'bad') {
    return guan_query_all(
      'SELECT * FROM guan_review_item WHERE guan_batch_id = ? AND guan_label = ? ORDER BY guan_index ASC',
      [guan_batch_id, guan_label]
    );
  }
  return guan_query_all(
    'SELECT * FROM guan_review_item WHERE guan_batch_id = ? ORDER BY guan_index ASC',
    [guan_batch_id]
  );
}

function guan_list_featured(guan_batch_id, guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 6;
  return guan_query_all(
    'SELECT * FROM guan_review_item WHERE guan_batch_id = ? AND guan_featured = 1 ORDER BY guan_value DESC, guan_id ASC LIMIT ?',
    [guan_batch_id, guan_size]
  );
}

/** 全局统计：批次数、评论总数、三分类合计 */
function guan_get_stats() {
  const guan_batch = guan_query_one('SELECT COUNT(*) AS guan_total FROM guan_review_batch');
  const guan_item = guan_query_one(
    `SELECT COUNT(*) AS guan_total,
            SUM(CASE WHEN guan_label = 'good' THEN 1 ELSE 0 END) AS guan_good,
            SUM(CASE WHEN guan_label = 'neutral' THEN 1 ELSE 0 END) AS guan_neutral,
            SUM(CASE WHEN guan_label = 'bad' THEN 1 ELSE 0 END) AS guan_bad,
            AVG(guan_score) AS guan_avg_score
     FROM guan_review_item`
  );
  return {
    guan_batch_total: guan_batch ? guan_batch.guan_total : 0,
    guan_item_total: guan_item ? guan_item.guan_total || 0 : 0,
    guan_good: (guan_item && guan_item.guan_good) || 0,
    guan_neutral: (guan_item && guan_item.guan_neutral) || 0,
    guan_bad: (guan_item && guan_item.guan_bad) || 0,
    guan_avg_score: guan_item && guan_item.guan_avg_score ? Number(guan_item.guan_avg_score.toFixed ? guan_item.guan_avg_score.toFixed(1) : guan_item.guan_avg_score) : 0
  };
}

module.exports = {
  guan_ensure_schema,
  guan_insert_batch,
  guan_update_batch,
  guan_list_batches,
  guan_get_batch,
  guan_delete_batch,
  guan_insert_items,
  guan_list_items,
  guan_list_featured,
  guan_get_stats
};
