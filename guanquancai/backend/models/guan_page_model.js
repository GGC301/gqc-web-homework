/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：页面导航数据模型（对应数据表 guan_page）。
 */
const { guan_query_all, guan_query_one } = require('./guan_db');

const guan_page_fields = 'guan_id, guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort, guan_created_at';

/** 查询全部页面，按排序值升序 */
function guan_find_all_pages() {
  return guan_query_all(
    `SELECT ${guan_page_fields} FROM guan_page ORDER BY guan_sort ASC, guan_id ASC`
  );
}

/** 按主键查询单个页面 */
function guan_find_page_by_id(guan_id) {
  return guan_query_one(
    `SELECT ${guan_page_fields} FROM guan_page WHERE guan_id = ?`,
    [guan_id]
  );
}

/** 仅查询已上线页面 */
function guan_find_online_pages() {
  return guan_query_all(
    `SELECT ${guan_page_fields} FROM guan_page WHERE guan_status = 1 ORDER BY guan_sort ASC, guan_id ASC`
  );
}

module.exports = {
  guan_find_all_pages,
  guan_find_page_by_id,
  guan_find_online_pages
};
