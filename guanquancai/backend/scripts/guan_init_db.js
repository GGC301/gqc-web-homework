/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：数据库初始化脚本，建表并写入 8 条测试数据（可重复执行，不会重复插入）。
 * 执行：npm run initdb
 */
const { guan_get_db, guan_query_one } = require('../models/guan_db');

const guan_create_page_sql = `
CREATE TABLE IF NOT EXISTS guan_page (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_name TEXT NOT NULL,
  guan_path TEXT NOT NULL UNIQUE,
  guan_desc TEXT NOT NULL DEFAULT '',
  guan_category TEXT NOT NULL DEFAULT '导航',
  guan_status INTEGER NOT NULL DEFAULT 1,
  guan_sort INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
`;

const guan_create_index_sql = `
CREATE INDEX IF NOT EXISTS guan_idx_page_status ON guan_page (guan_status);
`;

// 8 条有真实业务意义的测试数据
const guan_seed_rows = [
  ['首页', 'index.html', '站点入口，含 canvas 背景动画与全部页面导航', '导航', 1, 10],
  ['项目说明', 'about.html', '项目背景、技术栈与开发约定说明', '导航', 0, 20],
  ['页面总览', 'pages.html', '全部页面的清单与分类检索', '导航', 0, 30],
  ['作品详情', 'detail-work.html', '单个作品的详细介绍与图片展示', '详情', 0, 40],
  ['留言板', 'message.html', '访客留言提交与管理员回复', '交互', 0, 50],
  ['登录', 'login.html', '已有账号的登录入口', '账号', 0, 60],
  ['注册', 'register.html', '新用户注册与信息校验', '账号', 0, 70],
  ['后台管理', 'admin.html', '页面数据的维护、排序与统计', '管理', 0, 80]
];

function guan_init_database() {
  const guan_db = guan_get_db();
  guan_db.exec(guan_create_page_sql);
  guan_db.exec(guan_create_index_sql);

  const guan_insert = guan_db.prepare(
    `INSERT OR IGNORE INTO guan_page
      (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  let guan_inserted = 0;
  guan_seed_rows.forEach((guan_row) => {
    guan_inserted += Number(guan_insert.run(...guan_row).changes);
  });

  const guan_count = guan_query_one('SELECT COUNT(*) AS guan_total FROM guan_page');
  console.log(`[guanquancai] 建表完成：guan_page`);
  console.log(`[guanquancai] 本次新增测试数据：${guan_inserted} 条，当前共 ${guan_count.guan_total} 条`);
}

guan_init_database();

// 同步初始化知识库（RAG）相关表与示例数据
require('./guan_init_kb_db').guan_init_kb_database().catch((guan_err) => {
  console.error('[guanquancai] 知识库初始化失败：', guan_err.message);
});
