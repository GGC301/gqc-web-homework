<!-- 姓名：关泉才 | 学号：24001010301 | 时间：2026-11-09 | 大模型：deepseek-v4.1-flash -->

# 数据库记录（guan_database.md）

- 数据库类型：SQLite
- 数据库文件：`backend/guan_quancai.db`（由 `.env` 中的 `DB_NAME` 指定，不提交仓库）
- 重建方式：按本文件顺序执行全部 SQL；或直接运行 `npm run initdb`
- 约定：表名、字段名一律以 `guan_` 开头

---

## 2026-11-09 14:00:00 建表：guan_page（页面导航表）

```sql
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

CREATE INDEX IF NOT EXISTS guan_idx_page_status ON guan_page (guan_status);
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| guan_id | INTEGER | 主键，自增 |
| guan_name | TEXT | 页面名称 |
| guan_path | TEXT | 页面相对路径，唯一 |
| guan_desc | TEXT | 页面说明 |
| guan_category | TEXT | 分类：导航 / 详情 / 交互 / 账号 / 管理 |
| guan_status | INTEGER | 1 = 已上线，0 = 规划中 |
| guan_sort | INTEGER | 排序值，升序 |
| guan_created_at | TEXT | 创建时间（本地时间） |

## 2026-11-09 14:00:00 测试数据：guan_page（8 条）

```sql
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('首页', 'index.html', '站点入口，含 canvas 背景动画与全部页面导航', '导航', 1, 10);
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('项目说明', 'about.html', '项目背景、技术栈与开发约定说明', '导航', 0, 20);
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('页面总览', 'pages.html', '全部页面的清单与分类检索', '导航', 0, 30);
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('作品详情', 'detail-work.html', '单个作品的详细介绍与图片展示', '详情', 0, 40);
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('留言板', 'message.html', '访客留言提交与管理员回复', '交互', 0, 50);
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('登录', 'login.html', '已有账号的登录入口', '账号', 0, 60);
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('注册', 'register.html', '新用户注册与信息校验', '账号', 0, 70);
INSERT OR IGNORE INTO guan_page (guan_name, guan_path, guan_desc, guan_category, guan_status, guan_sort) VALUES ('后台管理', 'admin.html', '页面数据的维护、排序与统计', '管理', 0, 80);
```

## 校验语句

```sql
SELECT COUNT(*) AS guan_total FROM guan_page;   -- 期望 8
SELECT * FROM guan_page ORDER BY guan_sort ASC;
```

---

## 2026-11-12 14:20:00 建表：知识库（RAG）四张表

数据流：文档表（`guan_kb_document`）1 : N 片段表（`guan_kb_chunk`，含向量），
会话表（`guan_chat_session`）1 : N 消息表（`guan_chat_message`）。

```sql
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
```

字段说明：

| 表 | 字段 | 说明 |
| --- | --- | --- |
| guan_kb_document | guan_name / guan_type | 原始文件名与扩展名 |
| guan_kb_document | guan_size / guan_chars | 文件字节数 / 解析后字符数 |
| guan_kb_document | guan_chunk_total / guan_embed_total | 片段数 / 已写入向量的片段数 |
| guan_kb_document | guan_status | `indexed` 已向量化；`parsed` 仅解析（降级关键词检索）；`failed` 失败 |
| guan_kb_document | guan_hash | 文件 SHA-256，用于拦截重复上传 |
| guan_kb_chunk | guan_embedding | 1024 维向量的 JSON 字符串，可为 NULL（初始化时补录） |
| guan_chat_message | guan_citations | 引用来源的 JSON 摘要（编号、文档、片段、分数） |

## 2026-11-12 14:20:00 测试数据：知识库文档（8 篇）

```sql
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('售后服务政策.txt', 'txt', 612, 234, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-售后服务政策.txt');
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('配送与物流说明.txt', 'txt', 476, 182, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-配送与物流说明.txt');
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('会员与积分规则.md', 'md', 402, 158, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-会员与积分规则.md');
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('知识库使用说明.md', 'md', 388, 146, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-知识库使用说明.md');
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('常见问题FAQ.txt', 'txt', 452, 178, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-常见问题FAQ.txt');
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('账号与登录安全.txt', 'txt', 356, 136, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-账号与登录安全.txt');
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('技术栈与接口规范.md', 'md', 420, 162, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-技术栈与接口规范.md');
INSERT OR IGNORE INTO guan_kb_document (guan_name, guan_type, guan_size, guan_chars, guan_chunk_total, guan_embed_total, guan_status, guan_note, guan_hash) VALUES ('隐私与数据安全说明.txt', 'txt', 398, 154, 1, 0, 'parsed', '初始化脚本写入的示例文档', 'seed-隐私与数据安全说明.txt');
```

## 2026-11-12 14:20:00 测试数据：片段（以「售后服务政策.txt」为例，其余 7 篇同理）

```sql
INSERT INTO guan_kb_chunk (guan_document_id, guan_index, guan_content, guan_chars, guan_embedding) VALUES (
  1, 0,
  '关泉才全栈作品站售后服务政策（2026 版）
一、七天无理由退换
自签收之日起 7 个自然日内，商品保持完好、配件与赠品齐全的，可申请无理由退换；定制类与促销清仓商品除外。
二、质量问题处理
签收后 15 日内出现非人为损坏的质量问题，可免费维修、换新或全额退款；超过 15 日按整机一年保修政策执行。
三、退款时效
审核通过后 1 个工作日内原路退回，银行卡到账时间为 1-3 个工作日，第三方支付平台为即时到账。
四、客服渠道
在线客服工作时间 09:00-21:00；紧急问题可拨打 400-800-8301 转 3，节假日不休。',
  234, NULL
);
```

> 说明：向量由向量模型动态生成，**无法用 SQL 静态重建**。重建库后执行 `npm run initkb`
> 会自动为所有 `guan_embedding IS NULL` 的片段补录向量；若未配置密钥或调用失败，
> 片段保持 `parsed` 状态，问答自动降级为关键词检索，功能仍可用。

## 2026-11-12 14:20:00 测试数据：会话（8 条）

```sql
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('售后政策咨询');
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('退换货流程');
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('会员积分怎么用');
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('发票与配送问题');
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('知识库怎么上传文档');
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('接口与端口说明');
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('隐私数据如何存储');
INSERT OR IGNORE INTO guan_chat_session (guan_title) VALUES ('模型与向量选型');
```

## 2026-11-12 14:20:00 测试数据：消息（8 条，属会话 1）

```sql
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'user', '售后可以几天无理由退换？', '', 0);
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'assistant', '签收之日起 7 个自然日内可申请无理由退换，需保持商品完好、配件与赠品齐全；定制类与促销清仓商品除外。[1]', '[]', 0);
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'user', '质量问题怎么处理？', '', 0);
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'assistant', '签收后 15 日内出现非人为损坏的质量问题，可免费维修、换新或全额退款；超过 15 日按整机一年保修执行。[1]', '[]', 0);
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'user', '退款多久到账？', '', 0);
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'assistant', '审核通过后 1 个工作日内原路退回，银行卡一般 1-3 个工作日到账，第三方支付平台即时到账。[1]', '[]', 0);
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'user', '客服电话是多少？', '', 0);
INSERT INTO guan_chat_message (guan_session_id, guan_role, guan_content, guan_citations, guan_tokens) VALUES (1, 'assistant', '在线客服工作时间 09:00-21:00；紧急问题可拨打 400-800-8301 转 3，节假日不休。[1]', '[]', 0);
```

## 校验语句（知识库）

```sql
SELECT COUNT(*) AS guan_doc_total FROM guan_kb_document;   -- 期望 ≥ 8
SELECT COUNT(*) AS guan_chunk_total FROM guan_kb_chunk;    -- 期望 ≥ 8
SELECT COUNT(*) AS guan_embed_total FROM guan_kb_chunk WHERE guan_embedding IS NOT NULL;
SELECT COUNT(*) AS guan_session_total FROM guan_chat_session;  -- 期望 ≥ 8
SELECT COUNT(*) AS guan_msg_total FROM guan_chat_message;      -- 期望 ≥ 8
```

---

# 商业评论情感分析（2026-11-16）

## 2026-11-16 13:40:00 建表：评论分析批次

```sql
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
```

## 2026-11-16 13:40:00 建表：评论明细（含情感判定结果）

```sql
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
```

> 字段说明：`guan_label` 取 `good / neutral / bad`（好评 / 中评 / 差评）；
> `guan_score` 为情感分 0-100；`guan_value` 为信息价值分 0-100（用于挑精选）；
> `guan_featured = 1` 表示该条被选为精选评论；批次表 `guan_usage` 存大模型 token 用量的 JSON 字符串。

## 2026-11-16 13:47:00 测试数据：批次（1 条）

```sql
INSERT INTO guan_review_batch
  (guan_filename, guan_sheet, guan_total, guan_good, guan_neutral, guan_bad, guan_avg_score,
   guan_featured_total, guan_status, guan_note, guan_model, guan_usage, guan_elapsed)
VALUES
  ('门店评论示例-拾光咖啡.xlsx', 'sheet1.xml', 8, 3, 2, 3, 50.5, 5, 'done',
   '初始化测试数据（未调用大模型）', 'deepseek-ai/DeepSeek-V4-Flash', '{}', 0);
```

## 2026-11-16 13:47:00 测试数据：评论明细（8 条，属上面的批次）

```sql
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 1, '林小满', '5', '2026-11-01 09:12', '手冲耶加雪菲香气很足，入口有柑橘的明亮酸感，店员主动介绍了豆子的产地和处理法。', 'good', 92, 78, '明确肯定风味与店员专业介绍', '口味、服务', 1);
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 2, '周予安', '5', '2026-11-01 10:35', '工作日七点半就开门，拿铁 22 元用料扎实，赶地铁前买一杯刚好，出杯速度快。', 'good', 88, 71, '肯定营业时间、价格与出杯速度', '价格、效率', 1);
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 3, '苏晚', '3', '2026-11-02 16:48', '味道中规中矩，美式偏淡，价格在这条街上算偏高的，偶尔来一次可以。', 'neutral', 55, 62, '褒贬参半，指出美式偏淡与价格偏高', '口味、价格', 1);
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 4, '郑柏川', '2', '2026-11-03 08:55', '连续两次都做错单，一次加了糖浆一次忘了去冰，跟店员说明后才重做，耽误了二十分钟。', 'bad', 22, 84, '连续做错单且耽误时间，问题具体可改进', '出品、效率', 1);
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 5, '陈嘉树', '1', '2026-11-03 15:10', '等单等了 25 分钟，最后发现我的杯子被给错了人，店员没有道歉，不会再来了。', 'bad', 8, 80, '等单过久、给错单且未道歉，明确流失', '服务、效率', 0);
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 6, '赵星野', '3', '2026-11-05 13:15', '店内没有卫生间，要去隔壁商场，带小孩来不太方便；咖啡本身没什么问题。', 'neutral', 58, 66, '设施不足影响体验，咖啡本身无异议', '设施、环境', 0);
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 7, '沈墨', '1', '2026-11-08 12:10', '喝到杯底有异物，找店员反映只是换了一杯，没有解释原因也没有任何补偿。', 'bad', 5, 90, '食品安全问题且处理敷衍，价值高', '食品安全、售后', 1);
INSERT INTO guan_review_item (guan_batch_id, guan_index, guan_author, guan_rating, guan_time, guan_content, guan_label, guan_score, guan_value, guan_reason, guan_tags, guan_featured) VALUES ((SELECT guan_id FROM guan_review_batch WHERE guan_filename = '门店评论示例-拾光咖啡.xlsx' ORDER BY guan_id DESC LIMIT 1), 8, '韩青禾', '4', '2026-11-08 20:05', '冷萃很顺口，冰块是手凿的，融化慢不冲淡味道；缺点是晚上九点就打烊。', 'good', 76, 68, '肯定冷萃口感，仅对营业时间有建议', '口味、营业时间', 0);
```

## 校验语句（评论分析）

```sql
SELECT COUNT(*) AS guan_batch_total FROM guan_review_batch;   -- 期望 ≥ 1
SELECT COUNT(*) AS guan_item_total FROM guan_review_item;     -- 期望 ≥ 8
SELECT guan_label, COUNT(*) AS guan_num FROM guan_review_item GROUP BY guan_label;
SELECT COUNT(*) AS guan_featured_total FROM guan_review_item WHERE guan_featured = 1;
```

> 3 份 Excel 模拟数据与上传模板由 `npm run genreview` 生成到项目根目录，
> 数据库测试数据由 `npm run initreview` 幂等写入。

---

# 用户登录与注册（2026-11-19）

## 2026-11-19 14:10:00 建表：用户表

```sql
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
```

> 字段说明：`guan_password` 只存 `scrypt$盐$哈希`（node:crypto scryptSync，32 字节摘要 + 16 字节随机盐），
> 不存明文、不可逆；`guan_role` 取 `admin / user`；`guan_status` 取 `active / disabled`；
> `guan_login_total`、`guan_last_login` 在每次登录成功时更新。

## 2026-11-19 14:10:00 测试数据：用户（8 条）

> 密码统一为 `abc123456`，下面 8 条使用同一盐值的哈希示例（与 `npm run inituser` 生成的值不同，但同为合法 scrypt 哈希）。

```sql
INSERT OR IGNORE INTO guan_user (guan_username, guan_password, guan_nickname, guan_role, guan_status) VALUES
  ('guanquancai', 'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '关泉才', 'admin', 'active'),
  ('zhang_wei',   'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '张伟',   'user',  'active'),
  ('li_yan',      'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '李艳',   'user',  'active'),
  ('wang_lei',    'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '王磊',   'user',  'active'),
  ('chen_jing',   'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '陈静',   'user',  'active'),
  ('zhao_yun',    'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '赵云',   'user',  'active'),
  ('sun_yu',      'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '孙宇',   'user',  'active'),
  ('zhou_lin',    'scrypt$e943ae928a88ca6730a28e4af6be37bb$977ab5f5998a9701555401cb0a176c139be99999d1e6c0485eac1b0c53638aa4', '周琳',   'user',  'active');
```

## 校验语句（用户）

```sql
SELECT COUNT(*) AS guan_user_total FROM guan_user;                       -- 期望 ≥ 8
SELECT guan_role, COUNT(*) FROM guan_user GROUP BY guan_role;            -- admin 1 条，user 7 条
SELECT guan_username, guan_login_total, guan_last_login FROM guan_user ORDER BY guan_login_total DESC;
```

> 密码哈希由服务端 `backend/services/guan_auth_service.js` 的 `guan_hash_password()` 生成，
> 无法用 SQL 直接算出；重建库时执行 `npm run inituser` 会为上述 8 个账号重新生成哈希并写入。

---

# 基础 AI 聊天与识图（2026-11-19）

## 2026-11-19 14:25:00 建表：聊天会话与消息

```sql
CREATE TABLE IF NOT EXISTS guan_chat_talk (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_title TEXT NOT NULL DEFAULT '新的对话',
  guan_summary TEXT NOT NULL DEFAULT '',
  guan_turn_total INTEGER NOT NULL DEFAULT 0,
  guan_compress_total INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  guan_updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS guan_chat_turn (
  guan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  guan_talk_id INTEGER NOT NULL,
  guan_role TEXT NOT NULL,
  guan_content TEXT NOT NULL,
  guan_tokens INTEGER NOT NULL DEFAULT 0,
  guan_compressed INTEGER NOT NULL DEFAULT 0,
  guan_created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (guan_talk_id) REFERENCES guan_chat_talk (guan_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS guan_idx_turn_talk ON guan_chat_turn (guan_talk_id);
```

> 说明：`guan_summary` 存历史压缩后的摘要；`guan_compress_total` 记录被压缩的消息条数；
> `guan_chat_turn.guan_compressed = 1` 表示该条已并入摘要，不再随请求发送。

## 2026-11-19 14:25:00 测试数据：会话与消息（1 个会话 + 4 条消息）

```sql
INSERT INTO guan_chat_talk (guan_title, guan_turn_total) VALUES ('课程项目答疑', 4);
INSERT INTO guan_chat_turn (guan_talk_id, guan_role, guan_content, guan_tokens) VALUES (last_insert_rowid(), 'user', '我在做 LLM 应用设计课程项目，前端用原生 HTML，后端 Node.js + Express。', 0);
INSERT INTO guan_chat_turn (guan_talk_id, guan_role, guan_content, guan_tokens) VALUES ((SELECT MAX(guan_id) FROM guan_chat_talk), 'assistant', '这套技术栈足够完成课程要求：前端只负责渲染，密钥与跨域都放在 Express 中间层处理。', 86);
INSERT INTO guan_chat_turn (guan_talk_id, guan_role, guan_content, guan_tokens) VALUES ((SELECT MAX(guan_id) FROM guan_chat_talk), 'user', '那多轮对话的历史要怎么控制？', 0);
INSERT INTO guan_chat_turn (guan_talk_id, guan_role, guan_content, guan_tokens) VALUES ((SELECT MAX(guan_id) FROM guan_chat_talk), 'assistant', '保留最近若干条原文，超出预算时把更早的消息压成摘要写入 guan_summary，摘要作为 system 消息随请求发送。', 74);
```

## 2026-11-19 14:25:00 建表：识图记录

```sql
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
```

> `guan_fields` 存 JSON：`{"guan_doc_type","guan_title","guan_amount","guan_date","guan_keywords"}`；
> `guan_text` 存识别全文；`guan_tags` 为关键词的顿号拼接，便于列表展示。

## 2026-11-19 14:25:00 测试数据：识图记录（1 条）

```sql
INSERT INTO guan_vision_record (guan_filename, guan_mime, guan_size, guan_summary, guan_text, guan_fields, guan_tags, guan_model, guan_elapsed)
VALUES ('_ocr_sample.png', 'image/png', 27816,
        '大连东软信息学院收货单，机械键盘一件，金额 328 元，日期 2026-11-19，已签收。',
        '大连东软信息学院 收货单
订单号：DN-20261119-0731
商品：机械键盘 × 1    金额：328.00 元
状态：已签收    日期：2026-11-19',
        '{"guan_doc_type":"收货单","guan_title":"大连东软信息学院 收货单","guan_amount":"328.00 元","guan_date":"2026-11-19","guan_keywords":["大连东软信息学院","收货单","机械键盘","订单号","已签收"]}',
        '大连东软信息学院、收货单、机械键盘、订单号、已签收',
        'Qwen/Qwen3-VL-8B-Instruct', 4827);
```

## 校验语句（聊天与识图）

```sql
SELECT COUNT(*) AS guan_talk_total FROM guan_chat_talk;               -- 期望 ≥ 1
SELECT COUNT(*) AS guan_turn_total FROM guan_chat_turn;               -- 期望 ≥ 4
SELECT COUNT(*) AS guan_compressed_total FROM guan_chat_turn WHERE guan_compressed = 1;
SELECT COUNT(*) AS guan_vision_total FROM guan_vision_record;         -- 期望 ≥ 1
SELECT guan_filename, guan_model, guan_elapsed FROM guan_vision_record ORDER BY guan_id DESC;
```
