/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：数据库连接测试控制器（本项目为 SQLite，凭据与 backend/.env 比对后真实执行查询）。
 */
const guan_env = require('../config/guan_env');
const { guan_check_connection } = require('../models/guan_db');

/** POST /api/db/test 测试数据库连接 */
function guan_test_db_connection(guan_req, guan_res) {
  const guan_body = guan_req.body || {};
  const guan_user = String(guan_body.guan_user || '').trim();
  const guan_password = String(guan_body.guan_password || '');

  if (!guan_user || !guan_password) {
    return guan_res.status(400).json({
      code: 4001,
      msg: '参数错误：用户名和密码都不能为空',
      data: null
    });
  }

  if (guan_user !== guan_env.guan_db_user || guan_password !== guan_env.guan_db_password) {
    return guan_res.status(401).json({
      code: 4011,
      msg: '连接失败：用户名或密码错误',
      data: {
        guan_db_type: 'SQLite',
        guan_db_name: guan_env.guan_db_name
      }
    });
  }

  try {
    const guan_info = guan_check_connection();
    guan_res.json({
      code: 0,
      msg: '数据库连接成功',
      data: {
        guan_db_type: 'SQLite',
        guan_db_name: guan_env.guan_db_name,
        guan_db_host: guan_env.guan_db_host,
        guan_db_user: guan_user,
        guan_version: guan_info.guan_version,
        guan_page_total: guan_info.guan_total,
        guan_time: new Date().toLocaleString('zh-CN', { hour12: false })
      }
    });
  } catch (guan_err) {
    guan_res.status(500).json({
      code: 5003,
      msg: `数据库连接失败：${guan_err.message}`,
      data: {
        guan_db_type: 'SQLite',
        guan_db_name: guan_env.guan_db_name
      }
    });
  }
}

/** GET /api/db/info 返回数据库基础信息（不包含密码） */
function guan_get_db_info(guan_req, guan_res) {
  guan_res.json({
    code: 0,
    msg: '查询成功',
    data: {
      guan_db_type: 'SQLite',
      guan_db_name: guan_env.guan_db_name,
      guan_db_host: guan_env.guan_db_host,
      guan_db_user: guan_env.guan_db_user
    }
  });
}

module.exports = {
  guan_test_db_connection,
  guan_get_db_info
};
