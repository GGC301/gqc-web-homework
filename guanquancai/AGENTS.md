<!-- 姓名：关泉才 | 学号：24001010301 | 时间：2026-11-09 | 大模型：deepseek-v4.1-flash -->

# AGENTS.md

本文件为本项目的最高优先级开发约定，任何 AI 或开发者在本仓库中执行任务前必须先阅读并遵守。

## 项目结构与技术栈

- 前端：`frontend/` 目录
  - 原生 HTML、CSS、JavaScript，**禁止使用任何第三方库、框架、CDN 链接**
  - 目录结构：`frontend/` 下建 `css/`、`js/`、`fonts/`、`images/` 子目录
  - `fonts/` 存放 iconfont 图标文件（如果有）
- 后端：`backend/` 目录，Node.js + Express，RESTful + MVC 风格
  - 所有接口以 `/api/` 为前缀，端口固定为 `8301`
  - 以 `express.static` 托管 `frontend/` 目录
  - 后端支持所有跨域访问（CORS 全部放行）
- 后端依赖安装：优先 `cnpm i 包名`；失败或超时则使用 `npm i 包名`
- 数据库：SQLite（二选一，另一备选方案已删除，本项目只保留 SQLite）
  - 数据库凭据写入 `backend/.env`（变量名：`DB_USER`、`DB_PASSWORD`、`DB_HOST`、`DB_NAME`）
  - 凭据不得出现在代码中，也不得出现在本 AGENTS.md 中
  - `.env` 同时加入 `.gitignore`
- 根据后端需求自行建立和修改数据库表，每张表建立后，插入至少 8 条有真实业务意义的测试数据

## 命名与注释

- CSS 类名、JS 变量名、JS 函数名、数据库表名（及字段相关命名）一律以 `guan_` 开头
- 每个文件头部包含注释块：

  ```text
  姓名：关泉才 | 学号：24001010301 |
  时间：yyyy-mm-dd | 大模型：{本次使用的大模型名称}
  ```

## 记录文件（一律追加写入，禁止覆盖已有内容）

- `guanquancai_prompt.md`（项目根目录）：每次向 AI 发出开发指令后，追加记录
  `时间 | 提示词全文 | 大模型名称`
- `backend/guan_interface.md`：每次创建或修改接口后，追加记录
  `接口路径 | HTTP 方法 | 请求参数（含示例）| 响应格式（含 JSON 示例）| 修改时间`
- `backend/guan_database.md`：每次建表、改表或插入数据后，按执行顺序追加对应 SQL 语句
  （含测试数据的 `INSERT`），要求仅凭此文件即可在新机器上完整重建数据库
- 统一 JSON 响应格式：`{ "code": 0, "msg": "提示信息", "data": {...} }`
  `code = 0` 表示成功，非 `0` 表示失败

## 前端约定

- 服务器返回的数据和错误信息输出到浏览器控制台（`console.log` / `console.error`）
- 新建 HTML 页面后，在 `frontend/index.html` 中追加超链接入口
  文件名包含 `detail` 的页面除外

## 端口说明（实现备注）

> 端口固定为 **8301**（见 `backend/.env` 的 `PORT`）。`backend/config/guan_env.js` 对非法端口会自动回退到该默认值。

## 知识库（RAG）模块约定

实验指导书选题二：知识库管理（RAG）。数据流为
`前端 → /api/kb/*（上传/管理） → 文本解析 → 切分 → 向量化 → SQLite`，
`前端 → /api/ai/rag-chat → 检索 Top-K → 拼装提示词 → 大模型 → 回答 + 引用来源`。

- 大模型配置只写在 `backend/.env`：`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`、`LLM_EMBED_MODEL`、
  `LLM_TIMEOUT_MS`、`LLM_EMBED_BATCH`；知识库参数：`KB_MAX_FILE_MB`、`KB_CHUNK_SIZE`、
  `KB_CHUNK_OVERLAP`、`KB_TOP_K`。
- **密钥绝对不出现在前端代码、日志明文、文档与本文件中**；后端日志里密钥一律掩码。
- 上传解析使用 Node.js 内置能力：文件上传采用手写 `multipart/form-data` 解析
  （`backend/utils/guan_multipart.js`），PDF 文本层用 `zlib` 解压提取，**不引入 multer/pdf-parse 等第三方依赖**；
  若确需新增依赖，必须写明理由并与原「零第三方前端库」约定区分（后端依赖允许，但应尽量少）。
- 支持格式：`txt / md / markdown / csv / json / log / html / htm / pdf`，单文件 ≤ 10 MB。
- 检索策略：向量余弦相似度（`BAAI/bge-m3`，1024 维）占 70%，中文二元词关键词重合度占 30%；
  向量化失败时自动降级为纯关键词检索，接口不允许因此 500。
- 提示词必须要求「只依据参考资料作答 + [编号] 标注来源 + 资料不足时明确说明」，禁止模型自由发挥。
- 新增知识库相关表或接口时，同样追加到 `backend/guan_database.md` 与 `backend/guan_interface.md`。
