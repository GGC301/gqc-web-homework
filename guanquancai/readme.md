<!-- 姓名：关泉才 | 学号：24001010301 | 时间：2026-11-09 | 大模型：deepseek-v4.1-flash -->

# 关泉才 · 全栈作品站（guanquancai）

- **姓名**：guan quancai（关泉才）
- **学号**：24001010301
- **项目名称**：关泉才 · 全栈作品站
- **项目类别**：自选
- **课程**：高级网页设计

## 项目简介

一个纯手写的全栈课程项目：前端为原生 HTML / CSS / JavaScript（不使用任何第三方库、框架与 CDN），
后端为 Node.js + Express（RESTful + MVC），数据存储使用 SQLite。项目首页包含 canvas 粒子背景动画
与全部已完成页面的导航入口。

在三级项目基础上，按《LLM 应用设计》实验指导书**选题二「知识库管理（RAG）」**完成了 AI 应用：
文档上传 → 文本解析 → 切分 → 向量化入库 → 检索 Top-K → 拼装提示词调用大模型 → 生成带引用来源的回答。
API Key 只保存在 `backend/.env`，前端仅访问 `/api/*`，服务端把请求体与响应体打印到终端用于实验取证。

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 前端 | 原生 HTML5 / CSS3 / JavaScript（ES6+） |
| 后端 | Node.js + Express 5 |
| 数据库 | SQLite（Node.js 内置 `node:sqlite`，无需额外原生依赖） |
| 大模型 | 硅基流动 `deepseek-ai/DeepSeek-V4-Flash`（对话）、`BAAI/bge-m3`（向量，1024 维） |
| 其他 | cors（跨域）、dotenv（环境变量） |

## 目录结构

```text
guanquancai/
├─ AGENTS.md                 # 项目开发约定（最高优先级）
├─ readme.md                 # 本文件
├─ guanquancai_prompt.md     # 提示词追加日志
├─ 24001010301-关泉才.docx   # 《LLM 应用设计》项目报告（含截图与测试记录）
├─ report/
│  ├─ img/                   # 报告用截图与架构图
│  └─ _build_report.py       # 报告生成脚本（python-docx）
├─ .gitignore                # 排除 node_modules、.env 等
├─ 启动后台.bat              # 一键安装依赖 / 初始化数据库 / 启动后端
├─ package.json
├─ frontend/                 # 前端（express.static 托管）
│  ├─ index.html             # 首页：canvas 动画 + 页面导航
│  ├─ database.html          # 数据库连接测试页
│  ├─ runoob.html            # 模仿菜鸟教程首页的教程索引页
│  ├─ knowledge.html         # 知识库管理：上传进度 / 解析状态 / 片段查看 / 删除
│  ├─ rag.html               # RAG 智能问答：Top-K 检索 + 引用来源
│  ├─ css/guan_index.css
│  ├─ css/guan_database.css
│  ├─ css/guan_runoob.css
│  ├─ css/guan_kb.css        # 知识库与问答页共用样式
│  ├─ js/guan_bg.js          # 通用 canvas 粒子背景动画
│  ├─ js/guan_index.js
│  ├─ js/guan_database.js
│  ├─ js/guan_runoob.js
│  ├─ js/guan_knowledge.js
│  ├─ js/guan_rag.js
│  ├─ images/
│  └─ fonts/
└─ backend/                  # 后端（RESTful + MVC）
   ├─ server.js              # 启动入口，端口 8301（启动时自动补齐知识库表）
   ├─ app.js                 # 应用装配（cors / 路由 / 静态托管 / 错误处理）
   ├─ .env                   # 数据库与大模型凭据（已 gitignore）
   ├─ config/guan_env.js
   ├─ models/guan_db.js
   ├─ models/guan_page_model.js
   ├─ models/guan_kb_model.js        # 知识库文档/片段/会话/消息
   ├─ services/guan_llm_service.js   # 对话补全 + 向量化客户端（打印请求/响应）
   ├─ services/guan_rag_service.js   # 检索打分 + 提示词拼装 + 回答生成
   ├─ utils/guan_multipart.js        # 手写 multipart 解析（不依赖 multer）
   ├─ utils/guan_text_parser.js      # TXT/MD/CSV/JSON/HTML/PDF 文本解析
   ├─ utils/guan_splitter.js         # 切片（480 字 / 80 字重叠）
   ├─ controllers/guan_health_controller.js
   ├─ controllers/guan_page_controller.js
   ├─ controllers/guan_db_controller.js
   ├─ controllers/guan_kb_controller.js
   ├─ controllers/guan_ai_controller.js
   ├─ routes/guan_api_routes.js
   ├─ scripts/guan_init_db.js
   ├─ scripts/guan_init_kb_db.js     # 知识库建表 + 8 篇示例文档 + 向量补录
   ├─ guan_interface.md      # 接口记录（追加）
   └─ guan_database.md       # 数据库 SQL 记录（追加，可据此重建库）
```

## 快速开始

方式一：命令行

```bash
# 1. 安装依赖（优先 cnpm，失败或超时改用 npm）
cnpm i
# npm i

# 2. 初始化数据库（建表 + 8 条测试数据，同时初始化知识库）
npm run initdb

# 也可单独初始化知识库（建表 + 8 篇示例文档 + 向量补录）
npm run initkb

# 也可单独初始化评论分析表（建表 + 8 条评论测试数据）
npm run initreview

# 生成 3 份商业评论模拟 Excel 与上传模板（写入项目根目录）
npm run genreview

# 初始化用户表（建表 + 8 个测试账号，密码统一 abc123456）
npm run inituser

# 3. 启动服务
npm start
```

方式二：双击根目录下的 **`启动后台.bat`**，脚本会自动检查 Node.js、安装依赖、初始化数据库并启动服务。

启动后访问：

- 首页：<http://localhost:8301/index.html>
- 知识库管理：<http://localhost:8301/knowledge.html>
- RAG 智能问答：<http://localhost:8301/rag.html>
- 商业评论分析：<http://localhost:8301/review.html>
- 登录 / 注册：<http://localhost:8301/login.html>
- 基础 AI 聊天：<http://localhost:8301/chat.html>
- 识图（OCR）：<http://localhost:8301/vision.html>
- 数据库连接测试：<http://localhost:8301/database.html>
- 教程索引页（模仿菜鸟教程）：<http://localhost:8301/runoob.html>
- 健康检查：<http://localhost:8301/api/health>
- 页面列表：<http://localhost:8301/api/pages>

> **端口说明**：服务端口固定为 **8301**（`backend/.env` 的 `PORT`），配置读取层对非法端口会自动回退。

## 知识库（RAG）功能

| 环节 | 实现 |
| --- | --- |
| 上传 | 前端 `FormData` + `XMLHttpRequest`（可见上传进度）；后端手写 multipart 解析，限制 10 MB |
| 格式校验 | 仅允许 `txt/md/markdown/csv/json/log/html/htm/pdf`，空文件与超大文件直接拒绝 |
| 解析 | TXT/MD/CSV/JSON 直读 UTF-8；HTML 去标签；PDF 用 `zlib` 解压内容流提取文本层 |
| 切分 | 段落 → 句子逐级合并，480 字/片、80 字重叠，单文档最多 400 片 |
| 向量化 | `BAAI/bge-m3`（1024 维），失败自动降级关键词检索并在文档备注中标注 |
| 检索 | 余弦相似度 70% + 中文二元词关键词重合 30%，阈值 0.25，取 Top-K（1~10） |
| 生成 | system 提示词强制「只依据参考资料 + [编号] 引用 + 资料不足要说明」，回答返回引用片段 |
| 留痕 | 浏览器控制台打印全部请求/响应；后端终端打印发送给大模型的完整 messages 与模型返回 |

## 商业评论情感分析功能

| 环节 | 实现 |
| --- | --- |
| 上传 | 前端 `FormData` + `XMLHttpRequest`（可见进度条）；后端手写 multipart 解析，仅接受 `.xlsx`，≤ 10 MB、≤ 200 条评论 |
| 解析 | `backend/utils/guan_xlsx.js` 手写 ZIP + 工作表解析（仅用 `node:zlib`），自动识别「评论内容 / 用户昵称 / 星级 / 评论时间」列 |
| 判定 | 每 8 条一批调用大模型，返回好评 / 中评 / 差评 + 情感分（0-100）+ 信息价值分（0-100）+ 判定理由 + 关键词标签 |
| 容错 | 单批失败自动二分拆批重试；单条仍失败才用本地关键词规则兜底，并在批次备注中说明 |
| 展示 | 纯 SVG 环形饼图 + 图例占比 + 平均情感分 / 好评率 / 差评率；按价值分挑选 6 条精选评论（每类最多 2 条） |
| 明细 | 支持按好评 / 中评 / 差评筛选与关键词搜索，逐条显示情感分进度条、判定理由与标签 |
| 数据 | 3 份模拟 Excel（每份 20 条，分别为咖啡门店 / 家电电商 / 在线课程）+ 可下载上传模板，均在项目根目录 |

## 基础 AI 聊天功能

| 环节 | 实现 |
| --- | --- |
| 页面 | `chat.html`：左侧会话列表（新建/删除/切换），右侧消息流与输入框，Enter 发送、Shift + Enter 换行 |
| 多轮上下文 | 每次请求按 messages 数组携带历史：system + 历史摘要 + 最近若干条原文 + 当前问题 |
| 历史压缩 | 原文超过 12 条或 1800 字时，把更早的消息交给模型压成 ≤180 字摘要写入 `guan_chat_talk.guan_summary`，原消息标记 `guan_compressed = 1`，保留最近 6 条原文 |
| 展示 | 简易 Markdown 渲染（代码块、行内代码、加粗、列表）；每条回答附模型、上下文条数、耗时与 token；触发压缩时显示提示条 |
| 接口 | `GET/POST /api/chat/talks`、`GET/DELETE /api/chat/talks/:id`、`POST /api/chat/send` |

## 识图（OCR 与信息抽取）功能

| 环节 | 实现 |
| --- | --- |
| 页面 | `vision.html`：上传区（点击/拖拽 + 进度条 + 预览）、结构化结果卡、识别记录列表 |
| 模型 | `Qwen/Qwen3-VL-8B-Instruct`（可用 `.env` 的 `LLM_VISION_MODEL` 替换） |
| 请求 | 图片转 base64 data URL，按 `image_url` + `text` 的多模态消息发送；日志只打印图片大小，不打印内容 |
| 输出 | 固定 JSON：文档类型、标题、金额、日期、关键词、摘要、识别全文；解析失败退化为纯文本并标记 |
| 数据 | `guan_vision_record` 表保存文件名、摘要、全文、字段 JSON、模型与耗时；支持列表与删除 |
| 接口 | `POST /api/vision/analyze`、`GET /api/vision/records`、`DELETE /api/vision/records/:id` |

## 登录与注册功能

| 环节 | 实现 |
| --- | --- |
| 页面 | `login.html`：左侧品牌与安全说明，右侧「登录 / 注册」双 Tab 表单，登录后原地展示账号信息卡 |
| 密码存储 | `node:crypto` 的 `scryptSync` + 16 字节随机盐，入库格式 `scrypt$盐$哈希`，接口不返回密码 |
| 密码校验 | `timingSafeEqual` 定长比较，防时序攻击 |
| 登录状态 | 服务端签发 `base64url(载荷).HMAC-SHA256` 签名 token（含用户 ID、昵称、过期时间），默认 7 天 |
| 前端存储 | token 存 `localStorage`，每次打开页面调 `/api/auth/me` 校验，失效则清除并提示重新登录 |
| 接口 | `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`、`POST /api/auth/logout`、`GET /api/auth/users` |
| 校验规则 | 用户名字母开头 3-20 位；密码 6-32 位且含字母与数字；昵称 ≤ 20 字；重复用户名返回 4092 |
| 测试账号 | `guanquancai` / `abc123456`（管理员），另有 7 个普通账号，见 `backend/guan_database.md` |

## 接口约定

所有接口以 `/api/` 为前缀，统一返回：

```json
{ "code": 0, "msg": "提示信息", "data": {} }
```

`code = 0` 表示成功，非 `0` 表示失败。接口明细见 `backend/guan_interface.md`。

知识库与 AI 相关接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/kb/documents` | 上传文档（multipart，字段 `file`），解析、切分、向量化入库 |
| GET | `/api/kb/documents` | 文档列表，支持 `?guan_keyword=` 模糊搜索 |
| GET | `/api/kb/documents/:guan_id` | 文档详情与全部片段 |
| DELETE | `/api/kb/documents/:guan_id` | 删除文档及其片段 |
| GET | `/api/kb/stats` | 知识库统计与切分/向量参数 |
| GET | `/api/ai/info` | 模型与知识库概况（不含密钥） |
| POST | `/api/ai/chat` | 基础对话（不检索知识库） |
| POST | `/api/ai/rag-chat` | RAG 检索增强问答，返回答案 + 引用来源 |

## 开发约定

- CSS 类名、JS 变量/函数名、数据库表名及字段统一以 `guan_` 开头；
- 前端禁止引入任何第三方库、框架与 CDN 链接，全部资源本地化；
- 新增 HTML 页面后在 `frontend/index.html` 的“页面导航”区域追加超链接入口（文件名含 `detail` 的除外）；
- 每次建表/改表/插数据、每次新增接口，分别追加记录到 `backend/guan_database.md` 与 `backend/guan_interface.md`。

## 数据库

- 数据库文件：`backend/guan_quancai.db`（已在 `.gitignore` 中，不提交）；
- 凭据仅存于 `backend/.env`（`DB_USER`、`DB_PASSWORD`、`DB_HOST`、`DB_NAME`）；
- 重建方式：直接执行 `backend/guan_database.md` 中的 SQL，或运行 `npm run initdb`。
