/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：基础 AI 聊天服务（多轮对话 + 历史压缩）。
 *      保留最近若干条原文；当消息条数或总字符数超过预算时，调用大模型把更早的消息
 *      压缩成一段摘要写入会话表，原消息标记为已压缩，从而把上下文控制在窗口预算内。
 */
const guan_llm = require('./guan_llm_service');
const guan_chat_model = require('../models/guan_chat_model');

/** 触发压缩的阈值：原文最多保留 12 条消息、1800 字 */
const guan_live_limit = 12;
const guan_char_budget = 1800;
/** 压缩后保留的最近消息条数（避免刚压缩完又立刻触发） */
const guan_keep_turns = 6;

/** 系统提示词 */
function guan_system_prompt() {
  return [
    '你是「关泉才 · 全栈作品站」里的中文智能助手。',
    '回答要求：1) 先给结论再给理由，必要时分点；2) 使用简体中文，口吻专业但不啰嗦；',
    '3) 不确定的内容要说明不确定，不要编造数据或链接；4) 代码用 Markdown 代码块包裹。'
  ].join('\n');
}

/**
 * 判断是否需要压缩，并执行压缩
 * @param {object} guan_talk 会话行
 * @param {Array} guan_turns 未压缩消息（正序）
 * @returns {Promise<{guan_turns: Array, guan_compressed_total: number, guan_summary: string}>}
 */
async function guan_compress_history(guan_talk, guan_turns) {
  const guan_chars = guan_turns.reduce((guan_sum, guan_turn) => guan_sum + String(guan_turn.guan_content || '').length, 0);
  if (guan_turns.length <= guan_live_limit && guan_chars <= guan_char_budget) {
    return { guan_turns, guan_compressed_total: 0, guan_summary: guan_talk.guan_summary || '' };
  }

  const guan_cut = guan_turns.slice(0, Math.max(0, guan_turns.length - guan_keep_turns));
  if (guan_cut.length === 0) {
    return { guan_turns, guan_compressed_total: 0, guan_summary: guan_talk.guan_summary || '' };
  }

  const guan_material = (guan_talk.guan_summary ? `【已有摘要】${guan_talk.guan_summary}\n` : '')
    + guan_cut.map((guan_turn) => `${guan_turn.guan_role === 'user' ? '用户' : '助手'}：${guan_turn.guan_content}`).join('\n');

  console.log(`\n[聊天压缩] 会话 ${guan_talk.guan_id}：${guan_turns.length} 条消息 / ${guan_chars} 字，压缩前 ${guan_cut.length} 条`);

  const guan_pack = await guan_llm.guan_chat([
    {
      role: 'system',
      content: '你是对话摘要助手。把给定的多轮对话压缩成不超过 180 字的中文摘要：保留用户的关键信息、偏好、已确认的结论与未完成的需求，不要添加对话里没有的内容，也不要评论。只输出摘要正文。'
    },
    { role: 'user', content: guan_material.slice(0, 6000) }
  ], { guan_temperature: 0.2, guan_max_tokens: 320 });

  const guan_summary = String(guan_pack.guan_content || '').trim().slice(0, 400);
  guan_chat_model.guan_mark_compressed(guan_cut.map((guan_turn) => guan_turn.guan_id));
  guan_chat_model.guan_update_summary(guan_talk.guan_id, guan_summary, guan_cut.length);

  console.log(`[聊天压缩] 生成摘要 ${guan_summary.length} 字，已压缩 ${guan_cut.length} 条，保留最近 ${guan_keep_turns} 条原文`);

  return {
    guan_turns: guan_turns.slice(-guan_keep_turns),
    guan_compressed_total: guan_cut.length,
    guan_summary
  };
}

/**
 * 发送一条消息并返回回答
 * @param {{guan_talk_id: number, guan_question: string}} guan_input
 */
async function guan_reply(guan_input) {
  const guan_talk = guan_chat_model.guan_get_talk(guan_input.guan_talk_id);
  if (!guan_talk) {
    const guan_err = new Error(`会话不存在：guan_talk_id = ${guan_input.guan_talk_id}`);
    guan_err.guan_code = 4041;
    throw guan_err;
  }

  const guan_live = guan_chat_model.guan_list_live_turns(guan_talk.guan_id, 60);
  const guan_prepared = await guan_compress_history(guan_talk, guan_live);

  const guan_messages = [{ role: 'system', content: guan_system_prompt() }];
  if (guan_prepared.guan_summary) {
    guan_messages.push({
      role: 'system',
      content: `以下是本次对话更早内容的摘要，请在回答时作为背景参考（不要向用户复述摘要本身）：\n${guan_prepared.guan_summary}`
    });
  }
  guan_prepared.guan_turns.forEach((guan_turn) => {
    guan_messages.push({
      role: guan_turn.guan_role === 'user' ? 'user' : 'assistant',
      content: String(guan_turn.guan_content).slice(0, 4000)
    });
  });
  guan_messages.push({ role: 'user', content: String(guan_input.guan_question).slice(0, 4000) });

  const guan_pack = await guan_llm.guan_chat(guan_messages, { guan_temperature: 0.7, guan_max_tokens: 1200 });

  guan_chat_model.guan_add_turn(guan_talk.guan_id, 'user', guan_input.guan_question, 0);
  guan_chat_model.guan_add_turn(
    guan_talk.guan_id,
    'assistant',
    guan_pack.guan_content,
    (guan_pack.guan_usage && guan_pack.guan_usage.total_tokens) || 0
  );

  // 首条消息用作用户没手动命名时的会话标题
  if (guan_talk.guan_turn_total === 0 && (!guan_talk.guan_title || guan_talk.guan_title === '新的对话')) {
    guan_chat_model.guan_rename_talk(guan_talk.guan_id, guan_input.guan_question.slice(0, 20));
  }

  return {
    guan_answer: guan_pack.guan_content,
    guan_model: guan_pack.guan_model,
    guan_usage: guan_pack.guan_usage,
    guan_elapsed: guan_pack.guan_elapsed,
    guan_message_total: guan_messages.length,
    guan_compressed_total: guan_prepared.guan_compressed_total,
    guan_summary: guan_prepared.guan_summary,
    guan_history_turns: guan_prepared.guan_turns.length
  };
}

module.exports = {
  guan_reply,
  guan_system_prompt,
  guan_live_limit,
  guan_char_budget,
  guan_keep_turns
};
