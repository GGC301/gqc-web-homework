/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：基础 AI 聊天控制器 —— 会话列表、新建/删除会话、加载历史、发送消息（含历史压缩）。
 */
const guan_chat_model = require('../models/guan_chat_model');
const guan_chat_service = require('../services/guan_chat_service');
const guan_llm = require('../services/guan_llm_service');

function guan_fail(guan_res, guan_code, guan_msg, guan_data = null) {
  return guan_res.json({ code: guan_code, msg: guan_msg, data: guan_data });
}

function guan_map_talk(guan_row) {
  return {
    guan_id: guan_row.guan_id,
    guan_title: guan_row.guan_title,
    guan_summary: guan_row.guan_summary,
    guan_turn_total: guan_row.guan_turn_total,
    guan_compress_total: guan_row.guan_compress_total,
    guan_created_at: guan_row.guan_created_at,
    guan_updated_at: guan_row.guan_updated_at
  };
}

/** GET /api/chat/talks —— 会话列表 */
function guan_list_talks(guan_req, guan_res) {
  const guan_list = guan_chat_model.guan_list_talks(Number(guan_req.query.guan_limit) || 20).map(guan_map_talk);
  return guan_res.json({
    code: 0,
    msg: `查询成功，共 ${guan_list.length} 个会话`,
    data: {
      guan_total: guan_list.length,
      guan_list,
      guan_stats: guan_chat_model.guan_get_stats(),
      guan_budget: {
        guan_live_limit: guan_chat_service.guan_live_limit,
        guan_char_budget: guan_chat_service.guan_char_budget,
        guan_keep_turns: guan_chat_service.guan_keep_turns
      }
    }
  });
}

/** POST /api/chat/talks —— 新建会话 */
function guan_create_talk(guan_req, guan_res) {
  const guan_title = String((guan_req.body && guan_req.body.guan_title) || '新的对话').trim() || '新的对话';
  const guan_id = guan_chat_model.guan_create_talk(guan_title);
  console.log(`[聊天] 新建会话 ${guan_id}：${guan_title}`);
  return guan_res.json({
    code: 0,
    msg: '会话已创建',
    data: { guan_talk: guan_map_talk(guan_chat_model.guan_get_talk(guan_id)) }
  });
}

/** GET /api/chat/talks/:guan_id —— 会话详情与全部消息 */
function guan_get_talk(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_fail(guan_res, 4001, '参数错误：guan_id 必须为正整数');
  }
  const guan_talk = guan_chat_model.guan_get_talk(guan_id);
  if (!guan_talk) {
    return guan_fail(guan_res, 4041, `会话不存在：guan_id = ${guan_id}`);
  }
  const guan_turns = guan_chat_model.guan_list_turns(guan_id, 200).map((guan_row) => ({
    guan_id: guan_row.guan_id,
    guan_role: guan_row.guan_role,
    guan_content: guan_row.guan_content,
    guan_tokens: guan_row.guan_tokens,
    guan_compressed: Boolean(guan_row.guan_compressed),
    guan_created_at: guan_row.guan_created_at
  }));
  return guan_res.json({
    code: 0,
    msg: '查询成功',
    data: { guan_talk: guan_map_talk(guan_talk), guan_turns, guan_turn_total: guan_turns.length }
  });
}

/** DELETE /api/chat/talks/:guan_id —— 删除会话 */
function guan_delete_talk(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_fail(guan_res, 4001, '参数错误：guan_id 必须为正整数');
  }
  if (!guan_chat_model.guan_get_talk(guan_id)) {
    return guan_fail(guan_res, 4041, `会话不存在：guan_id = ${guan_id}`);
  }
  guan_chat_model.guan_delete_talk(guan_id);
  console.log(`[聊天] 已删除会话 ${guan_id}`);
  return guan_res.json({ code: 0, msg: '会话已删除', data: { guan_id } });
}

/**
 * POST /api/chat/send —— 发送消息
 * 请求：{ "guan_talk_id": 1, "guan_question": "……" }
 */
async function guan_send(guan_req, guan_res, guan_next) {
  try {
    const guan_body = guan_req.body || {};
    const guan_talk_id = Number(guan_body.guan_talk_id);
    const guan_question = String(guan_body.guan_question || '').trim();

    if (!Number.isInteger(guan_talk_id) || guan_talk_id <= 0) {
      return guan_fail(guan_res, 4001, '参数错误：guan_talk_id 必须为正整数');
    }
    if (!guan_question) {
      return guan_fail(guan_res, 4001, '参数错误：guan_question 不能为空');
    }
    if (guan_question.length > 2000) {
      return guan_fail(guan_res, 4002, '单条问题最多 2000 字');
    }
    if (!guan_llm.guan_is_configured()) {
      return guan_fail(guan_res, 5002, '服务端未配置 LLM_API_KEY，请检查 backend/.env');
    }

    const guan_result = await guan_chat_service.guan_reply({ guan_talk_id, guan_question });
    const guan_talk = guan_chat_model.guan_get_talk(guan_talk_id);

    return guan_res.json({
      code: 0,
      msg: '回答生成成功',
      data: {
        guan_talk: guan_map_talk(guan_talk),
        guan_question,
        guan_answer: guan_result.guan_answer,
        guan_model: guan_result.guan_model,
        guan_usage: guan_result.guan_usage,
        guan_elapsed: guan_result.guan_elapsed,
        guan_message_total: guan_result.guan_message_total,
        guan_history_turns: guan_result.guan_history_turns,
        guan_compressed_total: guan_result.guan_compressed_total,
        guan_summary: guan_result.guan_summary,
        guan_time: new Date().toLocaleString('zh-CN', { hour12: false })
      }
    });
  } catch (guan_err) {
    if (guan_err.guan_code) {
      return guan_fail(guan_res, guan_err.guan_code, guan_err.message);
    }
    return guan_next(guan_err);
  }
}

module.exports = {
  guan_list_talks,
  guan_create_talk,
  guan_get_talk,
  guan_delete_talk,
  guan_send
};
