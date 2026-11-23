/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：AI 控制器 —— 基础对话接口与 RAG 检索增强问答接口。
 *      密钥由服务端 .env 读取，前端只传问题与参数。
 */
const guan_env = require('../config/guan_env');
const guan_llm = require('../services/guan_llm_service');
const guan_rag = require('../services/guan_rag_service');
const guan_kb_model = require('../models/guan_kb_model');

function guan_fail(guan_res, guan_code, guan_msg, guan_data = null) {
  return guan_res.json({ code: guan_code, msg: guan_msg, data: guan_data });
}

/** GET /api/ai/info —— 模型与知识库概况（不含密钥） */
function guan_get_ai_info(guan_req, guan_res) {
  const guan_stats = guan_kb_model.guan_get_stats();
  return guan_res.json({
    code: 0,
    msg: guan_llm.guan_is_configured() ? '模型已配置' : '服务端未配置 LLM_API_KEY',
    data: {
      guan_llm_model: guan_env.guan_llm_model,
      guan_embed_model: guan_env.guan_llm_embed_model,
      guan_base_url: guan_env.guan_llm_base_url,
      guan_configured: guan_llm.guan_is_configured(),
      guan_top_k: guan_env.guan_kb_top_k,
      guan_document_total: guan_stats.guan_document_total,
      guan_chunk_total: guan_stats.guan_chunk_total
    }
  });
}

/**
 * POST /api/ai/chat —— 基础对话（不检索知识库）
 * 请求：{ "guan_messages": [{ "role": "user", "content": "你好" }] }
 */
async function guan_chat(guan_req, guan_res, guan_next) {
  try {
    const guan_messages = Array.isArray(guan_req.body && guan_req.body.guan_messages)
      ? guan_req.body.guan_messages
      : [];
    if (guan_messages.length === 0) {
      return guan_fail(guan_res, 4001, '参数错误：guan_messages 不能为空');
    }

    const guan_clean = guan_messages
      .filter((guan_item) => guan_item && (guan_item.role === 'user' || guan_item.role === 'assistant' || guan_item.role === 'system'))
      .map((guan_item) => ({ role: guan_item.role, content: String(guan_item.content || '').slice(0, 4000) }));
    if (guan_clean.length === 0) {
      return guan_fail(guan_res, 4001, '参数错误：消息格式不正确');
    }

    const guan_result = await guan_llm.guan_chat(guan_clean, { guan_temperature: 0.7 });
    return guan_res.json({
      code: 0,
      msg: '调用成功',
      data: {
        guan_answer: guan_result.guan_content,
        guan_model: guan_result.guan_model,
        guan_usage: guan_result.guan_usage,
        guan_elapsed: guan_result.guan_elapsed
      }
    });
  } catch (guan_err) {
    if (guan_err.guan_code) {
      return guan_fail(guan_res, guan_err.guan_code, guan_err.message);
    }
    return guan_next(guan_err);
  }
}

/**
 * POST /api/ai/rag-chat —— 知识库检索增强问答
 * 请求：{
 *   "guan_question": "问题",
 *   "guan_top_k": 4,
 *   "guan_doc_ids": [1, 2],
 *   "guan_history": [{ "role": "user", "content": "…" }],
 *   "guan_session_id": 1
 * }
 */
async function guan_rag_chat(guan_req, guan_res, guan_next) {
  try {
    const guan_body = guan_req.body || {};
    const guan_question = String(guan_body.guan_question || '').trim();
    if (!guan_question) {
      return guan_fail(guan_res, 4001, '参数错误：guan_question 不能为空');
    }

    const guan_doc_ids = Array.isArray(guan_body.guan_doc_ids)
      ? guan_body.guan_doc_ids.map((guan_id) => Number(guan_id)).filter((guan_id) => Number.isInteger(guan_id) && guan_id > 0)
      : [];

    const guan_history = Array.isArray(guan_body.guan_history) ? guan_body.guan_history.slice(-6) : [];

    const guan_session_id = Number(guan_body.guan_session_id) > 0
      ? Number(guan_body.guan_session_id)
      : guan_kb_model.guan_ensure_session(guan_question.slice(0, 20));

    const guan_result = await guan_rag.guan_answer({
      guan_question,
      guan_top_k: Number(guan_body.guan_top_k) || guan_env.guan_kb_top_k,
      guan_doc_ids,
      guan_history,
      guan_temperature: typeof guan_body.guan_temperature === 'number' ? guan_body.guan_temperature : 0.2
    });

    // 会话落库，便于历史回放
    guan_kb_model.guan_save_message(guan_session_id, 'user', guan_question, '', 0);
    guan_kb_model.guan_save_message(
      guan_session_id,
      'assistant',
      guan_result.guan_answer,
      JSON.stringify(guan_result.guan_citations.map((guan_item) => ({
        guan_no: guan_item.guan_no,
        guan_document_id: guan_item.guan_document_id,
        guan_document_name: guan_item.guan_document_name,
        guan_index: guan_item.guan_index,
        guan_score: guan_item.guan_score
      }))),
      (guan_result.guan_usage && guan_result.guan_usage.total_tokens) || 0
    );

    return guan_res.json({
      code: 0,
      msg: guan_result.guan_fallback ? '未检索到相关资料' : '回答生成成功',
      data: {
        guan_session_id,
        guan_question,
        guan_answer: guan_result.guan_answer,
        guan_citations: guan_result.guan_citations,
        guan_model: guan_result.guan_model,
        guan_usage: guan_result.guan_usage,
        guan_elapsed: guan_result.guan_elapsed,
        guan_top_k: guan_result.guan_top_k,
        guan_fallback: guan_result.guan_fallback,
        guan_time: new Date().toLocaleString('zh-CN', { hour12: false })
      }
    });
  } catch (guan_err) {
    if (guan_err.guan_code) {
      console.error('[RAG 回答] 失败：', guan_err.message);
      return guan_fail(guan_res, guan_err.guan_code, guan_err.message);
    }
    return guan_next(guan_err);
  }
}

module.exports = {
  guan_get_ai_info,
  guan_chat,
  guan_rag_chat
};
