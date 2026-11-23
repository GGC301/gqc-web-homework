<!-- 姓名：关泉才 | 学号：24001010301 | 时间：2026-11-09 | 大模型：deepseek-v4.1-flash -->

# 接口记录（guan_interface.md）

服务地址：`http://localhost:8301`，所有接口以 `/api/` 为前缀，统一响应：

```json
{ "code": 0, "msg": "提示信息", "data": {} }
```

`code = 0` 成功；`code ≠ 0` 失败。后端已开启 CORS，支持所有跨域访问。

---

## 2026-11-09 14:00:00

### 1. 健康检查

- **接口路径**：`/api/health`
- **HTTP 方法**：`GET`
- **请求参数**：无

**请求示例**

```text
GET http://localhost:8301/api/health
```

**响应示例**

```json
{
  "code": 0,
  "msg": "服务运行正常",
  "data": {
    "guan_service": "guanquancai-api",
    "guan_port": 8301,
    "guan_db": "guan_quancai.db",
    "guan_time": "2026/11/9 14:00:00"
  }
}
```

**修改时间**：2026-11-09

---

### 2. 页面列表

- **接口路径**：`/api/pages`
- **HTTP 方法**：`GET`
- **请求参数**：无（返回全部页面，按 `guan_sort` 升序）

**请求示例**

```text
GET http://localhost:8301/api/pages
```

**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功，共 8 条页面记录",
  "data": {
    "guan_total": 8,
    "guan_list": [
      {
        "guan_id": 1,
        "guan_name": "首页",
        "guan_path": "index.html",
        "guan_desc": "站点入口，含 canvas 背景动画与全部页面导航",
        "guan_category": "导航",
        "guan_status": 1,
        "guan_sort": 10,
        "guan_created_at": "2026-11-09 14:00:00"
      }
    ]
  }
}
```

**修改时间**：2026-11-09

---

### 3. 页面详情

- **接口路径**：`/api/pages/:guan_id`
- **HTTP 方法**：`GET`
- **请求参数**：路径参数 `guan_id`（正整数）

**请求示例**

```text
GET http://localhost:8301/api/pages/1
```

**响应示例（成功）**

```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "guan_id": 1,
    "guan_name": "首页",
    "guan_path": "index.html",
    "guan_desc": "站点入口，含 canvas 背景动画与全部页面导航",
    "guan_category": "导航",
    "guan_status": 1,
    "guan_sort": 10,
    "guan_created_at": "2026-11-09 14:00:00"
  }
}
```

**响应示例（参数错误）**

```json
{ "code": 4001, "msg": "参数错误：guan_id 必须为正整数", "data": null }
```

**响应示例（不存在）**

```json
{ "code": 4041, "msg": "页面不存在：guan_id = 99", "data": null }
```

**修改时间**：2026-11-09

---

### 4. 未匹配接口

- **接口路径**：`/api/*`（未定义的其他路径）
- **HTTP 方法**：`GET` / `POST` / 其他
- **请求参数**：无

**响应示例**

```json
{ "code": 4040, "msg": "接口不存在：GET /api/unknown", "data": null }
```

**修改时间**：2026-11-09

## 2026-11-09 14:24:54

### 5. 数据库连接测试

- **接口路径**：`/api/db/test`
- **HTTP 方法**：`POST`
- **请求参数**：Body（JSON）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| guan_user | string | 是 | 数据库用户名，需与 `backend/.env` 的 `DB_USER` 一致 |
| guan_password | string | 是 | 数据库密码，需与 `backend/.env` 的 `DB_PASSWORD` 一致 |

**请求示例**

```json
POST http://localhost:8301/api/db/test
Content-Type: application/json

{ "guan_user": "root", "guan_password": "******" }
```

**响应示例（成功）**

```json
{
  "code": 0,
  "msg": "数据库连接成功",
  "data": {
    "guan_db_type": "SQLite",
    "guan_db_name": "guan_quancai.db",
    "guan_db_host": "127.0.0.1",
    "guan_db_user": "root",
    "guan_version": "3.53.4",
    "guan_page_total": 8,
    "guan_time": "2026/11/9 14:25:00"
  }
}
```

**响应示例（用户名或密码错误）**

```json
{ "code": 4011, "msg": "连接失败：用户名或密码错误", "data": { "guan_db_type": "SQLite", "guan_db_name": "guan_quancai.db" } }
```

**响应示例（参数缺失）**

```json
{ "code": 4001, "msg": "参数错误：用户名和密码都不能为空", "data": null }
```

**响应示例（数据库访问失败）**

```json
{ "code": 5003, "msg": "数据库连接失败：<异常信息>", "data": { "guan_db_type": "SQLite", "guan_db_name": "guan_quancai.db" } }
```

**修改时间**：2026-11-09

---

### 6. 数据库基础信息

- **接口路径**：`/api/db/info`
- **HTTP 方法**：`GET`
- **请求参数**：无（不返回密码）

**请求示例**

```text
GET http://localhost:8301/api/db/info
```

**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "guan_db_type": "SQLite",
    "guan_db_name": "guan_quancai.db",
    "guan_db_host": "127.0.0.1",
    "guan_db_user": "root"
  }
}
```

**修改时间**：2026-11-09

---

## 2026-11-12 14:20:00 知识库（RAG）与 AI 接口

服务地址仍为 `http://localhost:8301`，前缀 `/api`，统一响应 `{ code, msg, data }`。
知识库相关错误码：`4001` 参数错误、`4002` 解析/格式错误、`4003` 文件超限、`4091` 文件已存在、
`4012` 模型鉴权失败、`4041` 资源不存在、`5001` 模型调用失败、`5041` 模型超时。

### 7. 上传知识库文档

- **接口路径**：`/api/kb/documents`
- **HTTP 方法**：`POST`
- **请求参数**：`multipart/form-data`，字段名 `file`（单文件），支持 `txt / md / markdown / csv / json / log / html / htm / pdf`，≤ 10 MB

**请求示例**

```text
POST http://localhost:8301/api/kb/documents
Content-Type: multipart/form-data; boundary=----xxx

file=@售后服务政策.txt
```

**响应示例（成功）**

```json
{
  "code": 0,
  "msg": "上传成功，已切分 3 个片段，向量化 3 个",
  "data": {
    "guan_id": 9,
    "guan_name": "售后服务政策.txt",
    "guan_type": "txt",
    "guan_size": 698,
    "guan_chars": 269,
    "guan_chunk_total": 3,
    "guan_embed_total": 3,
    "guan_status": "indexed",
    "guan_note": "",
    "guan_created_at": "2026-11-12 14:27:31"
  }
}
```

**响应示例（重复上传）**

```json
{ "code": 4091, "msg": "该文件已存在于知识库：售后服务政策.txt", "data": { "guan_id": 1 } }
```

**响应示例（格式不支持）**

```json
{ "code": 4002, "msg": "不支持的文件格式：.docx，请上传 .txt / .md / ... / .pdf", "data": null }
```

### 8. 文档列表

- **接口路径**：`/api/kb/documents`
- **HTTP 方法**：`GET`
- **请求参数**：查询串 `guan_keyword`（可选，按名称模糊匹配）

**请求示例**

```text
GET http://localhost:8301/api/kb/documents?guan_keyword=售后
```

**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功，共 8 个文档",
  "data": {
    "guan_total": 8,
    "guan_list": [
      {
        "guan_id": 1,
        "guan_name": "售后服务政策.txt",
        "guan_type": "txt",
        "guan_size": 698,
        "guan_chars": 269,
        "guan_chunk_total": 1,
        "guan_embed_total": 1,
        "guan_status": "indexed",
        "guan_note": "初始化脚本写入的示例文档",
        "guan_created_at": "2026-11-12 14:20:00"
      }
    ]
  }
}
```

### 9. 文档详情与片段

- **接口路径**：`/api/kb/documents/:guan_id`
- **HTTP 方法**：`GET`

**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "guan_document": { "guan_id": 1, "guan_name": "售后服务政策.txt", "guan_status": "indexed" },
    "guan_chunk_total": 1,
    "guan_chunks": [
      {
        "guan_id": 1,
        "guan_document_id": 1,
        "guan_index": 0,
        "guan_content": "关泉才全栈作品站售后服务政策（2026 版）……",
        "guan_chars": 238,
        "guan_created_at": "2026-11-12 14:20:00"
      }
    ]
  }
}
```

### 10. 删除文档

- **接口路径**：`/api/kb/documents/:guan_id`
- **HTTP 方法**：`DELETE`
- **说明**：同时删除该文档的全部片段与向量

**响应示例**

```json
{ "code": 0, "msg": "已删除文档《售后服务政策.txt》及其全部片段", "data": { "guan_id": 9, "guan_changes": 1 } }
```

### 11. 知识库统计

- **接口路径**：`/api/kb/stats`
- **HTTP 方法**：`GET`

**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "guan_document_total": 8,
    "guan_chars_total": 1988,
    "guan_chunk_total": 8,
    "guan_embed_total": 8,
    "guan_embed_model": "BAAI/bge-m3",
    "guan_chunk_size": 480,
    "guan_chunk_overlap": 80,
    "guan_max_file_mb": 10,
    "guan_supported_ext": ["txt", "md", "markdown", "csv", "json", "log", "html", "htm", "pdf"]
  }
}
```

### 12. AI 配置概况

- **接口路径**：`/api/ai/info`
- **HTTP 方法**：`GET`
- **说明**：只返回模型名与知识库规模，**不返回密钥**

**响应示例**

```json
{
  "code": 0,
  "msg": "模型已配置",
  "data": {
    "guan_llm_model": "deepseek-ai/DeepSeek-V4-Flash",
    "guan_embed_model": "BAAI/bge-m3",
    "guan_base_url": "https://api.siliconflow.cn/v1",
    "guan_configured": true,
    "guan_top_k": 4,
    "guan_document_total": 8,
    "guan_chunk_total": 8
  }
}
```

### 13. 基础对话（不检索）

- **接口路径**：`/api/ai/chat`
- **HTTP 方法**：`POST`
- **请求体**

```json
{ "guan_messages": [{ "role": "user", "content": "你好，请介绍一下你自己" }] }
```

**响应示例**

```json
{
  "code": 0,
  "msg": "调用成功",
  "data": {
    "guan_answer": "你好！我是……",
    "guan_model": "deepseek-ai/DeepSeek-V4-Flash",
    "guan_usage": { "prompt_tokens": 13, "completion_tokens": 42, "total_tokens": 55 },
    "guan_elapsed": 2130
  }
}
```

### 14. RAG 检索增强问答

- **接口路径**：`/api/ai/rag-chat`
- **HTTP 方法**：`POST`
- **请求体**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| guan_question | string | 是 | 用户问题，1~1000 字 |
| guan_top_k | number | 否 | 检索片段数，1~10，默认取 `.env` 的 `KB_TOP_K` |
| guan_doc_ids | number[] | 否 | 限定文档范围，空数组表示全库 |
| guan_history | object[] | 否 | 最近若干轮 `{role, content}`，用于多轮上下文 |
| guan_session_id | number | 否 | 会话 ID，不传则自动创建/复用 |

**请求示例**

```json
{
  "guan_question": "电子发票什么时候发到邮箱？",
  "guan_top_k": 3,
  "guan_doc_ids": [],
  "guan_history": [{ "role": "user", "content": "退换货政策是什么？" }],
  "guan_session_id": 1
}
```

**响应示例（命中资料）**

```json
{
  "code": 0,
  "msg": "回答生成成功",
  "data": {
    "guan_session_id": 1,
    "guan_question": "电子发票什么时候发到邮箱？",
    "guan_answer": "电子发票在确认收货后 48 小时内发送到下单邮箱 [1][2]。",
    "guan_citations": [
      {
        "guan_no": 1,
        "guan_chunk_id": 9,
        "guan_document_id": 9,
        "guan_document_name": "knowledge-test.txt",
        "guan_document_type": "txt",
        "guan_index": 0,
        "guan_score": 0.599,
        "guan_content": "……电子发票在确认收货后 48 小时内发送到下单邮箱……"
      }
    ],
    "guan_model": "deepseek-ai/DeepSeek-V4-Flash",
    "guan_usage": { "prompt_tokens": 693, "completion_tokens": 57, "total_tokens": 750 },
    "guan_elapsed": 8733,
    "guan_top_k": 3,
    "guan_fallback": false,
    "guan_time": "2026/11/12 14:29:42"
  }
}
```

**响应示例（未命中资料，不调用大模型）**

```json
{
  "code": 0,
  "msg": "未检索到相关资料",
  "data": { "guan_answer": "知识库中没有找到相关资料。请先在「知识库管理」页上传相关文档……", "guan_citations": [], "guan_fallback": true }
}
```

**修改时间**：2026-11-12

---

## 2026-11-16 商业评论情感分析（Excel 上传 → 大模型三分类 → 饼图 + 精选）

> 通用说明：接口前缀 `/api`；统一响应 `{ "code": 0, "msg": "…", "data": {…} }`；
> `code = 0` 成功，`4001` 参数错误，`4002` 文件解析失败，`4003` 文件超限，
> `4041` 资源不存在，`5001` 大模型调用失败，`5041` 大模型超时。

### 1. POST /api/review/upload

**接口路径**：`POST /api/review/upload`
**HTTP 方法**：POST
**请求类型**：`multipart/form-data`（字段名 `file`）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| file | file | 是 | `.xlsx` 文件，≤ 10 MB，解析后 2~200 条评论 |

表格列自动识别：评论内容（必填，关键字「评论/内容/评价/正文」）、
用户昵称、星级、评论时间、序号（可选）；首行不是表头时，自动取平均字数最多的列作为评论列。

**请求示例**

```bash
curl -X POST -F "file=@商业评论模拟数据-01.xlsx" http://localhost:8301/api/review/upload
```

**响应示例（节选）**

```json
{
  "code": 0,
  "msg": "分析完成，共 20 条评论：好评 11 / 中评 4 / 差评 5",
  "data": {
    "guan_batch": {
      "guan_id": 4,
      "guan_filename": "商业评论模拟数据-01.xlsx",
      "guan_total": 20,
      "guan_good": 11,
      "guan_neutral": 4,
      "guan_bad": 5,
      "guan_avg_score": 62.4,
      "guan_featured_total": 6,
      "guan_status": "done",
      "guan_note": "",
      "guan_model": "deepseek-ai/DeepSeek-V4-Flash",
      "guan_usage": { "prompt_tokens": 2037, "completion_tokens": 973, "total_tokens": 3010 },
      "guan_elapsed": 63549,
      "guan_created_at": "2026-11-16 13:56:03"
    },
    "guan_pie": [
      { "guan_label": "good", "guan_name": "好评", "guan_count": 11, "guan_percent": 55 },
      { "guan_label": "neutral", "guan_name": "中评", "guan_count": 4, "guan_percent": 20 },
      { "guan_label": "bad", "guan_name": "差评", "guan_count": 5, "guan_percent": 25 }
    ],
    "guan_total": 20,
    "guan_items": [
      {
        "guan_id": 77,
        "guan_index": 1,
        "guan_author": "林小满",
        "guan_rating": "5",
        "guan_time": "2026-11-01 09:12",
        "guan_content": "手冲耶加雪菲香气很足，入口有柑橘的明亮酸感……",
        "guan_label": "good",
        "guan_label_name": "好评",
        "guan_score": 92,
        "guan_value": 78,
        "guan_reason": "明确肯定风味与店员专业介绍",
        "guan_tags": "口味、服务",
        "guan_featured": true
      }
    ],
    "guan_featured": [
      { "guan_index": 6, "guan_label_name": "差评", "guan_value": 85, "guan_content": "……" }
    ],
    "guan_label_names": { "good": "好评", "neutral": "中评", "bad": "差评" },
    "guan_usage": { "prompt_tokens": 2037, "completion_tokens": 973, "total_tokens": 3010 },
    "guan_model": "deepseek-ai/DeepSeek-V4-Flash",
    "guan_elapsed": 63549,
    "guan_note": "",
    "guan_time": "2026/11/16 13:56:03"
  }
}
```

**处理链路**：解析 .xlsx（`backend/utils/guan_xlsx.js`，仅用 `node:zlib`）→ 识别列 →
每 8 条一批调用大模型 → 逐条返回 `guan_label / guan_score / guan_value / guan_reason / guan_tags` →
按信息价值分挑选 6 条精选（每类最多 2 条）→ 写入 `guan_review_batch` 与 `guan_review_item`。
某批调用失败会自动二分拆批重试，单条仍失败才用本地关键词规则兜底，`guan_note` 记录原因。

### 2. GET /api/review/batches

**接口路径**：`GET /api/review/batches`
**请求参数**：`guan_limit`（query，number，可选，默认 20）
**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功，共 3 个批次",
  "data": {
    "guan_total": 3,
    "guan_list": [
      { "guan_id": 6, "guan_filename": "商业评论模拟数据-03.xlsx", "guan_total": 20, "guan_good": 9, "guan_neutral": 6, "guan_bad": 5, "guan_avg_score": 60.6, "guan_created_at": "2026-11-16 13:57:49" }
    ],
    "guan_stats": { "guan_batch_total": 4, "guan_item_total": 68, "guan_good": 35, "guan_neutral": 14, "guan_bad": 19, "guan_avg_score": 59.9 }
  }
}
```

### 3. GET /api/review/batches/:guan_id

**接口路径**：`GET /api/review/batches/:guan_id`
**请求参数**：`guan_id`（path，number，必填，批次主键）
**响应示例**：与上传接口的 `data` 结构一致（`guan_batch` / `guan_pie` / `guan_items` / `guan_featured`）

### 4. DELETE /api/review/batches/:guan_id

**接口路径**：`DELETE /api/review/batches/:guan_id`
**请求参数**：`guan_id`（path，number，必填）
**响应示例**

```json
{ "code": 0, "msg": "已删除批次《商业评论模拟数据-02.xlsx》及其 20 条评论", "data": { "guan_id": 3 } }
```

### 5. GET /api/review/template

**接口路径**：`GET /api/review/template`
**请求参数**：无
**响应**：`.xlsx` 文件流（`Content-Disposition` 带中文文件名「商业评论上传模板.xlsx」），
模板含表头「序号 / 评论内容 / 用户昵称 / 星级 / 评论时间」与 3 条示例评论。

### 6. GET /api/review/samples

**接口路径**：`GET /api/review/samples`
**请求参数**：无
**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "guan_list": [
      { "guan_no": 1, "guan_filename": "商业评论模拟数据-01.xlsx", "guan_exists": true, "guan_size": 4842, "guan_download": "/api/review/samples/1" }
    ]
  }
}
```

### 7. GET /api/review/samples/:guan_no

**接口路径**：`GET /api/review/samples/:guan_no`
**请求参数**：`guan_no`（path，number，必填，取值 1 / 2 / 3）
**响应**：项目根目录下对应模拟数据 `.xlsx` 的文件流（每份 20 条评论）

**修改时间**：2026-11-16

---

## 2026-11-19 用户登录与注册

> 通用说明：接口前缀 `/api`；统一响应 `{ "code": 0, "msg": "…", "data": {…} }`；
> 密码只以 `scrypt$盐$哈希` 形式入库，任何接口都不返回密码；
> token 为 `base64url(载荷) + HMAC-SHA256 签名`，请求头传 `Authorization: Bearer <token>`，默认 7 天有效。
> 错误码：`4001` 参数缺失、`4002` 格式校验失败、`4011` 用户名或密码错误、`4013` 未登录或 token 失效、
> `4031` 账号被禁用、`4092` 用户名已存在。

### 1. POST /api/auth/register

**接口路径**：`POST /api/auth/register`
**HTTP 方法**：POST
**Content-Type**：`application/json`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| guan_username | string | 是 | 字母开头，3-20 位，字母/数字/下划线 |
| guan_password | string | 是 | 6-32 位，必须同时含字母与数字 |
| guan_nickname | string | 否 | 昵称，最多 20 字，留空时用用户名 |

**请求示例**

```json
{ "guan_username": "guan2026", "guan_password": "abc123456", "guan_nickname": "阿关" }
```

**响应示例**

```json
{
  "code": 0,
  "msg": "注册成功，欢迎你，阿关",
  "data": {
    "guan_token": "eyJndWFuX3VpZCI6OSwuLi59.7Zk3…",
    "guan_expire_at": "2026-11-26 14:20:31",
    "guan_expires_in": 604800,
    "guan_user": {
      "guan_id": 9,
      "guan_username": "guan2026",
      "guan_nickname": "阿关",
      "guan_role": "user",
      "guan_status": "active",
      "guan_login_total": 0,
      "guan_last_login": "",
      "guan_created_at": "2026-11-19 14:20:31"
    }
  }
}
```

**失败示例**：`{ "code": 4092, "msg": "用户名「guan2026」已被注册，请换一个", "data": null }`

### 2. POST /api/auth/login

**接口路径**：`POST /api/auth/login`
**HTTP 方法**：POST
**Content-Type**：`application/json`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| guan_username | string | 是 | 用户名 |
| guan_password | string | 是 | 明文密码，服务端用 scrypt 比对 |

**请求示例**

```json
{ "guan_username": "guanquancai", "guan_password": "abc123456" }
```

**响应示例**

```json
{
  "code": 0,
  "msg": "登录成功，欢迎回来，关泉才",
  "data": {
    "guan_token": "eyJndWFuX3VpZCI6MSwuLi59.9mK1…",
    "guan_expire_at": "2026-11-26 14:21:09",
    "guan_expires_in": 604800,
    "guan_user": { "guan_id": 1, "guan_username": "guanquancai", "guan_nickname": "关泉才", "guan_role": "admin", "guan_login_total": 3, "guan_last_login": "2026-11-19 14:21:09" }
  }
}
```

**失败示例**：`{ "code": 4011, "msg": "用户名或密码错误", "data": null }`

### 3. GET /api/auth/me

**接口路径**：`GET /api/auth/me`
**请求头**：`Authorization: Bearer <token>`
**响应示例**

```json
{
  "code": 0,
  "msg": "token 有效",
  "data": {
    "guan_user": { "guan_id": 1, "guan_username": "guanquancai", "guan_nickname": "关泉才", "guan_role": "admin" },
    "guan_exp": 1795000000,
    "guan_sign_type": "HMAC-SHA256"
  }
}
```

**失败示例**：`{ "code": 4013, "msg": "登录已过期，请重新登录", "data": null }`

### 4. POST /api/auth/logout

**接口路径**：`POST /api/auth/logout`
**请求头**：`Authorization: Bearer <token>`（可选）
**响应示例**：`{ "code": 0, "msg": "已退出登录", "data": { "guan_cleared": true } }`

> 服务端为无状态签名 token，退出由前端清除 localStorage 中的 token 完成，接口仅做日志留痕。

### 5. GET /api/auth/users

**接口路径**：`GET /api/auth/users`
**请求参数**：无
**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功，共 8 个用户",
  "data": {
    "guan_total": 8,
    "guan_list": [{ "guan_id": 1, "guan_username": "guanquancai", "guan_nickname": "关泉才", "guan_role": "admin", "guan_login_total": 3, "guan_last_login": "2026-11-19 14:21:09" }],
    "guan_stats": { "guan_user_total": 8, "guan_user_active": 8 }
  }
}
```

**修改时间**：2026-11-19

---

## 2026-11-19 基础 AI 聊天（多轮对话 + 历史压缩）

> 通用说明：接口前缀 `/api`，统一响应 `{ "code": 0, "msg": "…", "data": {…} }`；
> 压缩阈值：原文最多保留 12 条消息 / 1800 字，超出后把更早消息压成摘要（写入会话表 `guan_summary`），
> 摘要作为一条 system 消息随请求发送；压缩后的原消息标记 `guan_compressed = 1`，前端显示“已压缩”标记。

### 1. GET /api/chat/talks

**接口路径**：`GET /api/chat/talks`　**参数**：`guan_limit`（query，可选，默认 20）
**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功，共 1 个会话",
  "data": {
    "guan_total": 1,
    "guan_list": [{ "guan_id": 1, "guan_title": "历史压缩测试", "guan_summary": "用户关泉才…", "guan_turn_total": 16, "guan_compress_total": 8, "guan_updated_at": "2026-11-19 14:30:12" }],
    "guan_stats": { "guan_talk_total": 1, "guan_turn_total": 16, "guan_compressed_total": 8 },
    "guan_budget": { "guan_live_limit": 12, "guan_char_budget": 1800, "guan_keep_turns": 6 }
  }
}
```

### 2. POST /api/chat/talks　新建会话

**请求**：`{ "guan_title": "新的对话" }`　**响应**：`{ "code": 0, "msg": "会话已创建", "data": { "guan_talk": { "guan_id": 2, "guan_title": "新的对话" } } }`

### 3. GET /api/chat/talks/:guan_id　会话详情

**响应示例**

```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "guan_talk": { "guan_id": 1, "guan_title": "历史压缩测试", "guan_summary": "用户在做 LLM 课程项目…", "guan_turn_total": 16, "guan_compress_total": 8 },
    "guan_turn_total": 16,
    "guan_turns": [
      { "guan_id": 1, "guan_role": "user", "guan_content": "你好，我叫关泉才…", "guan_tokens": 0, "guan_compressed": true, "guan_created_at": "2026-11-19 14:28:01" }
    ]
  }
}
```

### 4. DELETE /api/chat/talks/:guan_id

**响应**：`{ "code": 0, "msg": "会话已删除", "data": { "guan_id": 2 } }`

### 5. POST /api/chat/send　发送消息

**请求**：`{ "guan_talk_id": 1, "guan_question": "总结一下我们聊过的内容。" }`（问题 ≤ 2000 字）
**响应示例**

```json
{
  "code": 0,
  "msg": "回答生成成功",
  "data": {
    "guan_talk": { "guan_id": 1, "guan_turn_total": 18, "guan_compress_total": 8 },
    "guan_question": "总结一下我们聊过的内容。",
    "guan_answer": "**结论**：我们已确定项目技术栈与核心功能方案……",
    "guan_model": "deepseek-ai/DeepSeek-V4-Flash",
    "guan_usage": { "prompt_tokens": 1180, "completion_tokens": 320, "total_tokens": 1500 },
    "guan_elapsed": 6421,
    "guan_message_total": 9,
    "guan_history_turns": 6,
    "guan_compressed_total": 2,
    "guan_summary": "用户关泉才在做 LLM 应用设计课程作业……",
    "guan_time": "2026/11/19 14:30:12"
  }
}
```

---

## 2026-11-19 识图（自选题目：OCR 与信息抽取）

### 6. POST /api/vision/analyze

**接口路径**：`POST /api/vision/analyze`
**请求类型**：`multipart/form-data`，字段名 `file`（png / jpg / jpeg / webp，≤ 8 MB）
**请求示例**

```bash
curl -X POST -F "file=@_ocr_sample.png" http://localhost:8301/api/vision/analyze
```

**响应示例**

```json
{
  "code": 0,
  "msg": "识别完成（收货单）",
  "data": {
    "guan_record": {
      "guan_id": 1,
      "guan_filename": "_ocr_sample.png",
      "guan_summary": "大连东软信息学院收货单，机械键盘一件，金额 328 元，日期 2026-11-19，已签收。",
      "guan_fields": {
        "guan_doc_type": "收货单",
        "guan_title": "大连东软信息学院 收货单",
        "guan_amount": "328.00 元",
        "guan_date": "2026-11-19",
        "guan_keywords": ["大连东软信息学院", "收货单", "机械键盘", "订单号", "已签收"]
      },
      "guan_text": "大连东软信息学院 收货单\n订单号：DN-20261119-0731\n商品：机械键盘 × 1 金额：328.00 元\n状态：已签收 日期：2026-11-19"
    },
    "guan_parse_ok": true,
    "guan_model": "Qwen/Qwen3-VL-8B-Instruct",
    "guan_usage": { "prompt_tokens": 604, "completion_tokens": 52, "total_tokens": 656 },
    "guan_elapsed": 4827
  }
}
```

### 7. GET /api/vision/records

**参数**：`guan_limit`（可选，默认 10）　**响应**：`{ "code": 0, "msg": "查询成功，共 2 条记录", "data": { "guan_total": 2, "guan_list": [], "guan_stats": { "guan_record_total": 2 } } }`

### 8. DELETE /api/vision/records/:guan_id

**响应**：`{ "code": 0, "msg": "记录已删除", "data": { "guan_id": 1 } }`

**修改时间**：2026-11-19
