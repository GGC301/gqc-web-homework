/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：大模型服务客户端（硅基流动 OpenAI 兼容接口）。
 *      统一封装对话补全与向量化请求，服务端把「请求体」与「响应体」打印到终端，
 *      便于实验报告取证；密钥只在服务端使用，绝不返回给前端。
 */
const guan_env = require('../config/guan_env');

/** 密钥掩码，打印日志时使用 */
function guan_mask_key(guan_key) {
  const guan_value = String(guan_key || '');
  if (guan_value.length <= 10) {
    return guan_value ? '******' : '(未配置)';
  }
  return `${guan_value.slice(0, 6)}******${guan_value.slice(-4)}`;
}

/** 是否已配置密钥 */
function guan_is_configured() {
  return Boolean(guan_env.guan_llm_api_key);
}

function guan_assert_configured() {
  if (!guan_is_configured()) {
    const guan_err = new Error('服务端未配置 LLM_API_KEY，请检查 backend/.env');
    guan_err.guan_code = 5002;
    throw guan_err;
  }
}

/** 日志友好的请求体：向量化请求只打印摘要，避免刷屏 */
function guan_log_body(guan_body) {
  if (Array.isArray(guan_body.input)) {
    return {
      model: guan_body.model,
      guan_input_total: guan_body.input.length,
      guan_input_preview: guan_body.input.map((guan_text) => String(guan_text).slice(0, 60) + (String(guan_text).length > 60 ? '…' : ''))
    };
  }
  return guan_body;
}

/** 日志友好的响应体：向量只打印数量与维度 */
function guan_log_response(guan_data, guan_raw) {
  if (guan_data && Array.isArray(guan_data.data) && guan_data.data[0] && Array.isArray(guan_data.data[0].embedding)) {
    return {
      guan_model: guan_data.model,
      guan_vector_total: guan_data.data.length,
      guan_vector_dim: guan_data.data[0].embedding.length,
      guan_usage: guan_data.usage
    };
  }
  return guan_data || guan_raw;
}

/** 统一 POST 请求，带超时与错误映射 */
async function guan_post_json(guan_path, guan_body, guan_title, guan_timeout_ms) {
  guan_assert_configured();

  const guan_url = `${guan_env.guan_llm_base_url}${guan_path}`;
  const guan_started = Date.now();
  const guan_timeout = Number(guan_timeout_ms) > 0 ? Number(guan_timeout_ms) : guan_env.guan_llm_timeout;

  console.log(`\n[LLM 请求][${guan_title}] -> ${guan_url}`);
  console.log('[LLM 请求] 模型：', guan_body.model, '｜密钥：', guan_mask_key(guan_env.guan_llm_api_key));
  console.log('[LLM 请求] 请求体：', JSON.stringify(guan_log_body(guan_body), null, 2));

  let guan_res;
  try {
    guan_res = await fetch(guan_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guan_env.guan_llm_api_key}`
      },
      body: JSON.stringify(guan_body),
      signal: AbortSignal.timeout(guan_timeout)
    });
  } catch (guan_err) {
    const guan_timeout = guan_err.name === 'TimeoutError' || guan_err.name === 'AbortError';
    const guan_error = new Error(guan_timeout
      ? `大模型接口超时（${guan_timeout} ms）`
      : `大模型接口请求失败：${guan_err.message}`);
    guan_error.guan_code = guan_timeout ? 5041 : 5001;
    throw guan_error;
  }

  const guan_raw = await guan_res.text();
  const guan_elapsed = Date.now() - guan_started;

  console.log(`[LLM 响应][${guan_title}] HTTP ${guan_res.status}｜耗时 ${guan_elapsed} ms`);

  let guan_data = null;
  try {
    guan_data = JSON.parse(guan_raw);
  } catch (guan_err) {
    guan_data = null;
  }

  console.log('[LLM 响应] 响应体：', JSON.stringify(guan_log_response(guan_data, guan_raw), null, 2));

  if (!guan_res.ok) {
    const guan_reason = (guan_data && (guan_data.message || (guan_data.error && guan_data.error.message)))
      || `HTTP ${guan_res.status}`;
    const guan_error = new Error(`大模型接口返回错误：${guan_reason}`);
    guan_error.guan_code = guan_res.status === 401 ? 4012 : 5001;
    throw guan_error;
  }

  if (!guan_data) {
    const guan_error = new Error('大模型接口返回的不是合法 JSON');
    guan_error.guan_code = 5001;
    throw guan_error;
  }

  return { guan_data, guan_raw, guan_elapsed };
}

/**
 * 对话补全
 * @param {Array<{role: string, content: string}>} guan_messages 消息数组
 * @param {{guan_temperature?: number, guan_max_tokens?: number}} guan_options 可选参数
 * @returns {Promise<{guan_content: string, guan_model: string, guan_usage: object, guan_elapsed: number}>}
 */
async function guan_chat(guan_messages, guan_options = {}) {
  const guan_body = {
    model: guan_options.guan_model || guan_env.guan_llm_model,
    messages: guan_messages,
    stream: false
  };
  if (typeof guan_options.guan_temperature === 'number') {
    guan_body.temperature = guan_options.guan_temperature;
  }
  if (typeof guan_options.guan_max_tokens === 'number') {
    guan_body.max_tokens = guan_options.guan_max_tokens;
  }

  const guan_pack = await guan_post_json('/chat/completions', guan_body, '对话补全', guan_options.guan_timeout_ms);
  const guan_choice = guan_pack.guan_data.choices && guan_pack.guan_data.choices[0];
  if (!guan_choice || !guan_choice.message) {
    const guan_error = new Error('大模型返回数据结构异常：缺少 choices[0].message');
    guan_error.guan_code = 5001;
    throw guan_error;
  }

  return {
    guan_content: guan_choice.message.content || '',
    guan_model: guan_pack.guan_data.model || guan_body.model,
    guan_usage: guan_pack.guan_data.usage || {},
    guan_elapsed: guan_pack.guan_elapsed
  };
}

/**
 * 文本向量化（自动分批，避免单次请求过大）
 * @param {string[]} guan_texts 文本数组
 * @returns {Promise<number[][]>} 与输入顺序一致的向量数组
 */
async function guan_embed(guan_texts) {
  const guan_input = (guan_texts || []).map((guan_text) => String(guan_text || '').slice(0, 2000));
  if (guan_input.length === 0) {
    return [];
  }

  const guan_batch_size = guan_env.guan_llm_embed_batch;
  const guan_vectors = [];

  for (let guan_start = 0; guan_start < guan_input.length; guan_start += guan_batch_size) {
    const guan_batch = guan_input.slice(guan_start, guan_start + guan_batch_size);
    const guan_body = { model: guan_env.guan_llm_embed_model, input: guan_batch };
    const guan_pack = await guan_post_json('/embeddings', guan_body, `向量化 ${guan_start + 1}-${guan_start + guan_batch.length}`);
    const guan_rows = guan_pack.guan_data.data || [];
    guan_rows
      .slice()
      .sort((guan_a, guan_b) => guan_a.index - guan_b.index)
      .forEach((guan_row) => {
        guan_vectors.push(guan_row.embedding);
      });
  }

  return guan_vectors;
}

module.exports = {
  guan_is_configured,
  guan_chat,
  guan_embed,
  guan_mask_key
};
