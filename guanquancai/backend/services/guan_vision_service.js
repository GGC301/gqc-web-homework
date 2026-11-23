/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：识图服务（自选题目：图片文字识别与信息抽取）。
 *      把图片转成 base64 data URL，按多模态消息格式发给视觉模型，
 *      要求返回固定 JSON（文档类型、标题、金额、日期、关键词、摘要、全文），
 *      解析失败时退化为「整段文字 + 截断摘要」，不让接口 500。
 */
const guan_env = require('../config/guan_env');

/** 视觉模型请求超时 */
const guan_vision_timeout = 120000;

/** 系统提示词：先定 JSON 结构，再要求只输出该结构 */
function guan_system_prompt() {
  return [
    '你是票据与截图识别助手。请阅读用户上传的图片，先逐字识别图中文字，再抽取关键信息。',
    '只输出 JSON，不要输出解释或 Markdown 代码块，结构固定为：',
    '{',
    '  "guan_doc_type": "票据 / 订单截图 / 证件 / 网页截图 / 商品图 / 其他",',
    '  "guan_title": "图片的主标题，没有则为空",',
    '  "guan_amount": "金额（含币种），没有则为空",',
    '  "guan_date": "日期，统一成 YYYY-MM-DD，没有则为空",',
    '  "guan_keywords": ["3-6 个关键词"],',
    '  "guan_summary": "不超过 60 字的中文摘要",',
    '  "guan_text": "识别到的全部文字，保留原有换行"',
    '}',
    '识别不清的字段留空字符串，不要猜测；guan_text 必须尽量完整。'
  ].join('\n');
}

/** 从模型输出中提取 JSON（容忍 ```json 围栏与前后说明） */
function guan_extract_json(guan_text) {
  const guan_clean = String(guan_text || '').replace(/```json/gi, '```').replace(/```/g, '').trim();
  const guan_start = guan_clean.indexOf('{');
  const guan_end = guan_clean.lastIndexOf('}');
  if (guan_start < 0 || guan_end <= guan_start) {
    return null;
  }
  try {
    return JSON.parse(guan_clean.slice(guan_start, guan_end + 1));
  } catch (guan_err) {
    return null;
  }
}

/**
 * 识别一张图片
 * @param {Buffer} guan_buffer 图片二进制
 * @param {string} guan_mime 图片类型
 * @returns {Promise<object>}
 */
async function guan_analyze_image(guan_buffer, guan_mime) {
  if (!guan_env.guan_llm_api_key) {
    const guan_err = new Error('服务端未配置 LLM_API_KEY，请检查 backend/.env');
    guan_err.guan_code = 5002;
    throw guan_err;
  }

  const guan_data_url = `data:${guan_mime || 'image/png'};base64,${guan_buffer.toString('base64')}`;
  const guan_body = {
    model: guan_env.guan_llm_vision_model,
    messages: [
      { role: 'system', content: guan_system_prompt() },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: guan_data_url } },
          { type: 'text', text: '请按约定的 JSON 结构输出识别结果。' }
        ]
      }
    ],
    max_tokens: 1200,
    temperature: 0.1,
    stream: false
  };

  const guan_url = `${guan_env.guan_llm_base_url}/chat/completions`;
  const guan_started = Date.now();
  console.log(`\n[识图请求] -> ${guan_url}`);
  console.log(`[识图请求] 模型：${guan_body.model}｜图片：${guan_mime}｜${Math.round(guan_buffer.length / 1024)} KB（图片内容不打印）`);

  let guan_res;
  try {
    guan_res = await fetch(guan_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guan_env.guan_llm_api_key}`
      },
      body: JSON.stringify(guan_body),
      signal: AbortSignal.timeout(guan_vision_timeout)
    });
  } catch (guan_err) {
    const guan_timeout = guan_err.name === 'TimeoutError' || guan_err.name === 'AbortError';
    const guan_error = new Error(guan_timeout ? `视觉模型超时（${guan_vision_timeout} ms）` : `视觉模型请求失败：${guan_err.message}`);
    guan_error.guan_code = guan_timeout ? 5041 : 5001;
    throw guan_error;
  }

  const guan_raw = await guan_res.text();
  const guan_elapsed = Date.now() - guan_started;
  console.log(`[识图响应] HTTP ${guan_res.status}｜耗时 ${guan_elapsed} ms`);

  let guan_json = null;
  try {
    guan_json = JSON.parse(guan_raw);
  } catch (guan_err) {
    guan_json = null;
  }

  if (!guan_res.ok || !guan_json) {
    const guan_reason = (guan_json && (guan_json.message || (guan_json.error && guan_json.error.message))) || `HTTP ${guan_res.status}`;
    const guan_error = new Error(`视觉模型返回错误：${guan_reason}`);
    guan_error.guan_code = guan_res.status === 401 ? 4012 : 5001;
    throw guan_error;
  }

  const guan_content = (guan_json.choices && guan_json.choices[0] && guan_json.choices[0].message
    && guan_json.choices[0].message.content) || '';
  console.log('[识图响应] 模型输出：', guan_content.slice(0, 400));

  const guan_parsed = guan_extract_json(guan_content);
  const guan_keywords = guan_parsed && Array.isArray(guan_parsed.guan_keywords)
    ? guan_parsed.guan_keywords.map((guan_k) => String(guan_k).trim()).filter(Boolean).slice(0, 6)
    : [];

  return {
    guan_doc_type: (guan_parsed && guan_parsed.guan_doc_type) || '其他',
    guan_title: (guan_parsed && guan_parsed.guan_title) || '',
    guan_amount: (guan_parsed && guan_parsed.guan_amount) || '',
    guan_date: (guan_parsed && guan_parsed.guan_date) || '',
    guan_keywords,
    guan_summary: (guan_parsed && guan_parsed.guan_summary) || String(guan_content).replace(/\s+/g, ' ').slice(0, 60),
    guan_text: (guan_parsed && guan_parsed.guan_text) || (guan_parsed ? '' : guan_content),
    guan_parse_ok: Boolean(guan_parsed),
    guan_model: guan_json.model || guan_env.guan_llm_vision_model,
    guan_usage: guan_json.usage || {},
    guan_elapsed
  };
}

module.exports = {
  guan_analyze_image,
  guan_system_prompt
};
