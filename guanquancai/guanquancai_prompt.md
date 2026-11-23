
# 提示词日志（guanquancai_prompt.md）

每次向 AI 发出开发指令后，一律以追加方式记录：时间 | 提示词全文 | 大模型名称。禁止覆盖已有内容。

---


## 2026-11-09 13:59:10 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
请初始化本项目：
1、git init + .gitignore（排除 node_modules、.env）+ 首次提交
2、按 AGENTS.md 规则创建前后端目录骨架、安装依赖、
3、创建前端首页index.html，包括姓名guan quancai、学号24001010301、项目名称、项目类别（自选、模仿），所有完成的html页面的超链接。有canvas背景动画。主体是页面链接导航。页面美观。
4、创建readme.md，在根目录下，包括学号、姓名。
```

---

## 2026-11-09 14:04:21 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
所有接口以 /api/ 为前缀，端口固定为 8301
```

---

## 2026-11-09 14:24:54 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
（三）运行和查看项目。
创建运行后台的bat文件，在根目录下。
（四）测试数据库链接（mysql数据库需要，sqlite不需要）。
创建database.html页面，输入用户名，密码，链接数据库，成功和错误都有提示。
```

---

## 2026-11-09 14:34:03 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
菜鸟教程官网

（追问确认：按照这个菜鸟教程官网给我做）
```

---

## 2026-11-12 14:19:06 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
@C:/Users/GGC/Desktop/LLM应用设计-实验指导书.docx  @C:/Users/GGC/Desktop/LLM应用设计-项目报告.doc  知识库管理（RAG）
```

> 依据《LLM应用设计-实验指导书》任务（二）“知识库管理（RAG）”，在本项目现有 Express + SQLite 骨架上实现：
> 文件上传与格式校验 → 文本解析与切分 → 向量化入库 → 检索 Top-K → 拼装提示词生成回答并标注引用来源。

---

## 2026-11-12 14:40:43 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
项目报告呢？
```

> 依据《LLM应用设计-项目报告.doc》模板撰写本项目的实验报告（含架构图、功能说明、真实运行截图、提示词与返回记录、测试用例与总结）。

---

## 2026-11-12 14:51:39 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
@C:/Users/GGC/Desktop/LLM应用设计-项目报告.doc  不要改动报告格式按照这个格式填写
```

> 直接在该 .doc 模板上填写：保持原有标题、提示语、编号与版式不变，只在各条目下补入本项目的实际内容与截图，输出同格式 .docx。

---

## 2026-11-16 13:59:21 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
完成商业评论的上传和 llm 进行评价功能。上传的是一个 excel 文件，里面有若干商业评论，格式自拟。上传商业评论后，llm 会对每一条评论进行判断：好评、中评、差评，将结果返回，前端以饼状图的形式显示，并显示有价值的精选的评论。在根目录下生成 3 个 excel 模拟数据，每个 20 条评论。可以下载 excel 模板。
```

---

## 2026-11-19 14:09:35 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
登录和注册
```

> 为全栈项目新增用户登录与注册：guan_user 表（含 8 条测试数据）、注册/登录/当前用户/退出四个接口、
> 密码 scrypt 加盐哈希、HMAC 签名 token、前端 login.html 双表单页面并接入各页导航。

---

## 2026-11-19 14:58:28 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
@C:/Users/GGC/Desktop/24001010301-关泉才.docx   剩下的两个也给我加上
```

> 补齐「基础 AI 聊天（多轮 + 历史压缩）」与「自选题目：识图 OCR / 信息抽取」两个方向：
> 新增 chat.html、vision.html 及对应接口与数据表，并把报告扩展为四方向（13 张插图）。

---

## 2026-11-23 13:33:04 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
给我更新index.html
```

> 首页同步四个方向：导航增加 AI 聊天 / 识图入口，首屏文案与技术栈更新，
> 页面卡片按 01-09 重新编号排序（新增 chat/vision，数据库与菜鸟教程后移），关于项目补充四方向说明与运行脚本。

---

## 2026-11-23 13:40:08 +08:00
- 模型 (model): deepseek/deepseek-v4.1-flash
- 提示词 (prompt):

```text
关泉才的《高级网页设计》课堂实践
```

> 将站点名称由「关泉才 · 全栈作品站」改为「关泉才 · 课堂实践」：首页标题、首屏大标题、项目名称与页脚，
> 以及其余 8 个页面的 <title> 与顶栏品牌名一并统一。
