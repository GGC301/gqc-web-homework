/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：SQLite 数据访问基础层（使用 Node.js 内置 node:sqlite，无需额外原生依赖）。
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const guan_env = require('../config/guan_env');

let guan_db_instance = null;

/** 获取（惰性创建）数据库连接 */
function guan_get_db() {
  if (guan_db_instance) {
    return guan_db_instance;
  }
  fs.mkdirSync(path.dirname(guan_env.guan_db_file), { recursive: true });
  guan_db_instance = new DatabaseSync(guan_env.guan_db_file);
  guan_db_instance.exec('PRAGMA journal_mode = WAL;');
  guan_db_instance.exec('PRAGMA foreign_keys = ON;');
  return guan_db_instance;
}

/** 查询多行 */
function guan_query_all(guan_sql, guan_params = []) {
  return guan_get_db().prepare(guan_sql).all(...guan_params);
}

/** 查询单行 */
function guan_query_one(guan_sql, guan_params = []) {
  return guan_get_db().prepare(guan_sql).get(...guan_params);
}

/** 执行写入语句 */
function guan_execute(guan_sql, guan_params = []) {
  return guan_get_db().prepare(guan_sql).run(...guan_params);
}

/**
 * 数据库连通性检测：真实执行查询，失败时抛出异常
 * @returns {{guan_version: string, guan_total: number}}
 */
function guan_check_connection() {
  const guan_version = guan_query_one('SELECT sqlite_version() AS guan_version');
  const guan_total = guan_query_one('SELECT COUNT(*) AS guan_total FROM guan_page');
  return {
    guan_version: guan_version.guan_version,
    guan_total: guan_total.guan_total
  };
}

module.exports = {
  guan_get_db,
  guan_query_all,
  guan_query_one,
  guan_execute,
  guan_check_connection
};
