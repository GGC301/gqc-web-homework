/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：用户表数据访问层。建表语句幂等，服务启动时自动补齐；
 *      密码字段只存 scrypt 哈希，任何接口都不会返回。
 */
const { guan_get_db, guan_query_all, guan_query_one, guan_execute } = require('./guan_db');

const guan_schema_sql = `
CREATE TABLE IF NOT EXISTS guan_user (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_username TEXT NOT NULL UNIQUE,
  guan_password TEXT NOT NULL,
  guan_nickname TEXT NOT NULL DEFAULT '',
  guan_role TEXT NOT NULL DEFAULT 'user',
  guan_status TEXT NOT NULL DEFAULT 'active',
  guan_login_total INTEGER NOT NULL DEFAULT 0,
  guan_last_login TEXT NOT NULL DEFAULT '',
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS guan_idx_user_name ON guan_user (guan_username);
`;

function guan_ensure_schema() {
  guan_get_db().exec(guan_schema_sql);
  return true;
}

function guan_find_by_username(guan_username) {
  return guan_query_one('SELECT * FROM guan_user WHERE guan_username = ?', [guan_username]);
}

function guan_get_by_id(guan_id) {
  return guan_query_one('SELECT * FROM guan_user WHERE guan_id = ?', [guan_id]);
}

function guan_create_user(guan_user) {
  const guan_result = guan_execute(
    `INSERT INTO guan_user (guan_username, guan_password, guan_nickname, guan_role, guan_status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      guan_user.guan_username,
      guan_user.guan_password,
      guan_user.guan_nickname || '',
      guan_user.guan_role || 'user',
      guan_user.guan_status || 'active'
    ]
  );
  return Number(guan_result.lastInsertRowid);
}

/** 登录成功后累加次数、记录最后登录时间 */
function guan_update_login(guan_id) {
  guan_execute(
    `UPDATE guan_user
        SET guan_login_total = guan_login_total + 1,
            guan_last_login = datetime('now', 'localtime')
      WHERE guan_id = ?`,
    [guan_id]
  );
}

function guan_list_users(guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 20;
  return guan_query_all(
    `SELECT guan_id, guan_username, guan_nickname, guan_role, guan_status,
            guan_login_total, guan_last_login, guan_created_at
       FROM guan_user ORDER BY guan_id ASC LIMIT ?`,
    [guan_size]
  );
}

/** 注册用户数统计（登录页展示用） */
function guan_get_stats() {
  const guan_row = guan_query_one(
    `SELECT COUNT(*) AS guan_total,
            SUM(CASE WHEN guan_status = 'active' THEN 1 ELSE 0 END) AS guan_active
       FROM guan_user`
  );
  return {
    guan_user_total: (guan_row && guan_row.guan_total) || 0,
    guan_user_active: (guan_row && guan_row.guan_active) || 0
  };
}

module.exports = {
  guan_ensure_schema,
  guan_find_by_username,
  guan_get_by_id,
  guan_create_user,
  guan_update_login,
  guan_list_users,
  guan_get_stats
};
