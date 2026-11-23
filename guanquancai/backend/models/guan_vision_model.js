/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：识图（OCR / 信息抽取）记录表数据访问层。
 */
const { guan_get_db, guan_query_all, guan_query_one, guan_execute } = require('./guan_db');

const guan_schema_sql = `
CREATE TABLE IF NOT EXISTS guan_vision_record (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_filename TEXT NOT NULL,
  guan_mime TEXT NOT NULL DEFAULT '',
  guan_size INTEGER NOT NULL DEFAULT 0,
  guan_summary TEXT NOT NULL DEFAULT '',
  guan_text TEXT NOT NULL DEFAULT '',
  guan_fields TEXT NOT NULL DEFAULT '',
  guan_tags TEXT NOT NULL DEFAULT '',
  guan_model TEXT NOT NULL DEFAULT '',
  guan_elapsed INTEGER NOT NULL DEFAULT 0,
  guan_usage TEXT NOT NULL DEFAULT '',
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS guan_idx_vision_time ON guan_vision_record (guan_created_at);
`;

function guan_ensure_schema() {
  guan_get_db().exec(guan_schema_sql);
  return true;
}

function guan_insert_record(guan_record) {
  const guan_result = guan_execute(
    `INSERT INTO guan_vision_record
      (guan_filename, guan_mime, guan_size, guan_summary, guan_text, guan_fields, guan_tags, guan_model, guan_elapsed, guan_usage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      guan_record.guan_filename,
      guan_record.guan_mime || '',
      guan_record.guan_size || 0,
      guan_record.guan_summary || '',
      guan_record.guan_text || '',
      guan_record.guan_fields || '',
      guan_record.guan_tags || '',
      guan_record.guan_model || '',
      guan_record.guan_elapsed || 0,
      guan_record.guan_usage || ''
    ]
  );
  return Number(guan_result.lastInsertRowid);
}

function guan_list_records(guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 10;
  return guan_query_all('SELECT * FROM guan_vision_record ORDER BY guan_id DESC LIMIT ?', [guan_size]);
}

function guan_get_record(guan_id) {
  return guan_query_one('SELECT * FROM guan_vision_record WHERE guan_id = ?', [guan_id]);
}

function guan_delete_record(guan_id) {
  const guan_result = guan_execute('DELETE FROM guan_vision_record WHERE guan_id = ?', [guan_id]);
  return guan_result.changes || 0;
}

function guan_get_stats() {
  const guan_row = guan_query_one('SELECT COUNT(*) AS guan_total FROM guan_vision_record');
  return { guan_record_total: (guan_row && guan_row.guan_total) || 0 };
}

module.exports = {
  guan_ensure_schema,
  guan_insert_record,
  guan_list_records,
  guan_get_record,
  guan_delete_record,
  guan_get_stats
};
