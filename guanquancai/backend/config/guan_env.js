/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：统一读取 .env 配置，数据库与大模型凭据只存在于环境变量中，不硬编码。
 */
const path = require('node:path');
const dotenv = require('dotenv');

const guan_root_dir = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(guan_root_dir, 'backend', '.env') });

const guan_default_port = 8301; // AGENTS.md 规定端口固定为 8301

/** 端口合法性校验：非法值自动回退到默认端口 */
function guan_normalize_port(guan_port) {
  const guan_value = Number(guan_port);
  if (!Number.isInteger(guan_value) || guan_value < 1 || guan_value > 65535) {
    console.warn(`[guanquancai] PORT=${guan_port} 不是合法端口（1-65535），已回退为 ${guan_default_port}`);
    return guan_default_port;
  }
  return guan_value;
}

/** 正整数读取，非法值回退 */
function guan_positive_int(guan_value, guan_fallback) {
  const guan_num = Number(guan_value);
  if (!Number.isInteger(guan_num) || guan_num <= 0) {
    return guan_fallback;
  }
  return guan_num;
}

const guan_env = {
  // 服务
  guan_port: guan_normalize_port(process.env.PORT || guan_default_port),
  // 数据库
  guan_db_user: process.env.DB_USER || 'root',
  guan_db_password: process.env.DB_PASSWORD || '',
  guan_db_host: process.env.DB_HOST || '127.0.0.1',
  guan_db_name: process.env.DB_NAME || 'guan_quancai.db',
  guan_db_file: path.join(guan_root_dir, 'backend', process.env.DB_NAME || 'guan_quancai.db'),
  guan_frontend_dir: path.join(guan_root_dir, 'frontend'),
  // 大模型（密钥仅在服务端，禁止出现在前端）
  guan_llm_api_key: process.env.LLM_API_KEY || '',
  guan_llm_base_url: (process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1').replace(/\/+$/, ''),
  guan_llm_model: process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V4-Flash',
  guan_llm_embed_model: process.env.LLM_EMBED_MODEL || 'BAAI/bge-m3',
  guan_llm_vision_model: process.env.LLM_VISION_MODEL || 'Qwen/Qwen3-VL-8B-Instruct',
  guan_llm_timeout: guan_positive_int(process.env.LLM_TIMEOUT_MS, 90000),
  guan_llm_embed_batch: guan_positive_int(process.env.LLM_EMBED_BATCH, 16),
  // 知识库（RAG）
  guan_kb_max_file_mb: guan_positive_int(process.env.KB_MAX_FILE_MB, 10),
  guan_kb_chunk_size: guan_positive_int(process.env.KB_CHUNK_SIZE, 480),
  guan_kb_chunk_overlap: guan_positive_int(process.env.KB_CHUNK_OVERLAP, 80),
  guan_kb_top_k: guan_positive_int(process.env.KB_TOP_K, 4),
  guan_kb_max_top_k: 10,
  // 用户登录（token 签名密钥与有效期）
  guan_auth_secret: process.env.AUTH_TOKEN_SECRET || '',
  guan_auth_token_ttl: guan_positive_int(process.env.AUTH_TOKEN_TTL_HOURS, 168) * 3600
};

/** 上传文件大小上限（字节） */
guan_env.guan_kb_max_file_bytes = guan_env.guan_kb_max_file_mb * 1024 * 1024;

module.exports = guan_env;
