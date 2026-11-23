@echo off
chcp 65001 >nul
title 关泉才 全栈项目 - 后端服务
cd /d "%~dp0"

echo ============================================
echo   关泉才 · 全栈作品站  后端启动脚本
echo   学号：24001010301   端口：8301
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js 后重试。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/3] 未发现依赖，正在安装...
  cmd /c cnpm i
  if errorlevel 1 (
    echo [提示] cnpm 安装失败，改用 npm 安装...
    cmd /c npm i
    if errorlevel 1 (
      echo [错误] 依赖安装失败，请检查网络后重试。
      pause
      exit /b 1
    )
  )
) else (
  echo [1/3] 依赖已存在，跳过安装。
)

if not exist "backend\guan_quancai.db" (
  echo [2/3] 未发现数据库，正在初始化（含知识库示例文档与向量）...
  cmd /c node backend\scripts\guan_init_db.js
) else (
  echo [2/3] 数据库已存在，跳过初始化。
  echo       如需补充知识库示例文档，可执行：npm run initkb
)

echo [3/3] 正在启动后端服务...
echo       首页：http://localhost:8301/index.html
echo       知识库管理：http://localhost:8301/knowledge.html
echo       RAG 智能问答：http://localhost:8301/rag.html
echo       数据库测试：http://localhost:8301/database.html
echo       按 Ctrl+C 可停止服务。
echo.

node backend\server.js

echo.
echo 服务已停止，按任意键关闭窗口。
pause
