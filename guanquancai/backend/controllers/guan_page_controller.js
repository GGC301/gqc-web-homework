/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：页面导航控制器，统一返回 { code, msg, data }。
 */
const {
  guan_find_all_pages,
  guan_find_page_by_id
} = require('../models/guan_page_model');

/** GET /api/pages 页面列表 */
function guan_list_pages(guan_req, guan_res) {
  try {
    const guan_rows = guan_find_all_pages();
    guan_res.json({
      code: 0,
      msg: `查询成功，共 ${guan_rows.length} 条页面记录`,
      data: {
        guan_total: guan_rows.length,
        guan_list: guan_rows
      }
    });
  } catch (guan_err) {
    guan_res.status(500).json({
      code: 5001,
      msg: `查询页面列表失败：${guan_err.message}`,
      data: null
    });
  }
}

/** GET /api/pages/:guan_id 页面详情 */
function guan_get_page_detail(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_res.status(400).json({
      code: 4001,
      msg: '参数错误：guan_id 必须为正整数',
      data: null
    });
  }
  try {
    const guan_row = guan_find_page_by_id(guan_id);
    if (!guan_row) {
      return guan_res.status(404).json({
        code: 4041,
        msg: `页面不存在：guan_id = ${guan_id}`,
        data: null
      });
    }
    guan_res.json({ code: 0, msg: '查询成功', data: guan_row });
  } catch (guan_err) {
    guan_res.status(500).json({
      code: 5002,
      msg: `查询页面详情失败：${guan_err.message}`,
      data: null
    });
  }
}

module.exports = {
  guan_list_pages,
  guan_get_page_detail
};
