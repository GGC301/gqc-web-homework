/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：后端启动入口，端口固定 8301；启动时自动补齐知识库相关表结构。
 */
const guan_app = require('./app');
const guan_env = require('./config/guan_env');
const guan_kb_model = require('./models/guan_kb_model');
const guan_review_model = require('./models/guan_review_model');
const guan_user_model = require('./models/guan_user_model');
const guan_chat_model = require('./models/guan_chat_model');
const guan_vision_model = require('./models/guan_vision_model');
const guan_llm = require('./services/guan_llm_service');

// 建表语句幂等：首次启动即可直接使用各模块功能
try {
  guan_kb_model.guan_ensure_schema();
  guan_review_model.guan_ensure_schema();
  guan_user_model.guan_ensure_schema();
  guan_chat_model.guan_ensure_schema();
  guan_vision_model.guan_ensure_schema();
} catch (guan_err) {
  console.error('[guanquancai] 数据表初始化失败：', guan_err.message);
}

const guan_server = guan_app.listen(guan_env.guan_port, () => {
  console.log(`[guanquancai] 服务已启动：http://localhost:${guan_env.guan_port}`);
  console.log(`[guanquancai] 首页地址：http://localhost:${guan_env.guan_port}/index.html`);
  console.log(`[guanquancai] 知识库管理：http://localhost:${guan_env.guan_port}/knowledge.html`);
  console.log(`[guanquancai] RAG 问答：http://localhost:${guan_env.guan_port}/rag.html`);
  console.log(`[guanquancai] 商业评论分析：http://localhost:${guan_env.guan_port}/review.html`);
  console.log(`[guanquancai] 登录注册：http://localhost:${guan_env.guan_port}/login.html`);
  console.log(`[guanquancai] 接口前缀：http://localhost:${guan_env.guan_port}/api`);
  console.log(`[guanquancai] 对话模型：${guan_env.guan_llm_model}｜向量模型：${guan_env.guan_llm_embed_model}｜密钥：${guan_llm.guan_mask_key(guan_env.guan_llm_api_key)}`);
});

guan_server.on('error', (guan_err) => {
  console.error('[guanquancai] 启动失败：', guan_err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  guan_server.close(() => {
    console.log('[guanquancai] 服务已停止');
    process.exit(0);
  });
});
