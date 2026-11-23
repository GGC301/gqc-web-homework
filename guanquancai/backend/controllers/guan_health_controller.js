/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：健康检查控制器。
 */
const guan_env = require('../config/guan_env');

/** GET /api/health */
function guan_get_health(guan_req, guan_res) {
  guan_res.json({
    code: 0,
    msg: '服务运行正常',
    data: {
      guan_service: 'guanquancai-api',
      guan_port: guan_env.guan_port,
      guan_db: guan_env.guan_db_name,
      guan_time: new Date().toLocaleString('zh-CN', { hour12: false })
    }
  });
}

module.exports = { guan_get_health };
