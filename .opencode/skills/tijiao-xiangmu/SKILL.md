---
name: tijiao-xiangmu
description: 提交项目 skill — 当用户说"提交项目"、commit、push、推送到 gitee、上传代码时使用。用 git commit 提交当前项目改动，并 push 到 https://gitee.com/guanquancai/gqc2.git。Use ONLY when the user explicitly asks to commit and push the project.
---

# 提交项目（git commit & push 到 Gitee）

目标远程：`https://gitee.com/guanquancai/gqc2.git`，分支 `master`。

按顺序执行：

1. **检查状态**：`git status`、`git diff --stat`、`git log --oneline -10`（仓库可能还没有任何提交，属正常）。
2. **排除敏感文件**：确认将要暂存的内容里没有 `.env`、密钥、凭据等敏感文件；如有则先不加入。
3. **暂存并提交**：`git add -A`，然后 `git commit -m "<简洁中文信息>"`。首次提交可用 `init: 课程网页练习项目` 这类信息；后续提交描述具体改动（如 `修复 4-2.html 损坏内容`）。
4. **配置远程**：
   - 无 remote：`git remote add origin https://gitee.com/guanquancai/gqc2.git`
   - 已有但地址不符：`git remote set-url origin https://gitee.com/guanquancai/gqc2.git`
5. **推送**：`git push -u origin master`。
   - 若被拒绝（远程已有提交）：`git pull --rebase origin master`，解决冲突后再 `git push -u origin master`。
   - 绝不使用 `git push --force`。
6. **认证失败时**：HTTPS 推送需要 Gitee 账号密码或个人访问令牌（PAT）。Windows 凭据管理器会保存首次输入的凭据；若仍失败，提示用户到 Gitee 生成 PAT 并用其作为密码重试，不要替用户猜测或硬编码任何密码。

注意：

- 只有用户明确要求提交时才执行本流程（调用本 skill 即视为明确要求）。
- 不修改 `git config` 用户信息，不改写历史，不删远程分支。
- 提交信息与仓库风格一致：中文、简短。
- 遵守 AGENTS.md：新增 class/id/JS 变量必须以 `yuan_` 开头；文件保存为 UTF-8。
