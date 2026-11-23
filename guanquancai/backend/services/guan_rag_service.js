/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：RAG 核心服务：检索 Top-K 片段（向量余弦 + 关键词混合打分）→ 拼装提示词 →
 *      调用大模型生成基于知识库的回答，并返回引用来源。
 */
const guan_env = require('../config/guan_env');
const guan_kb_model = require('../models/guan_kb_model');
const guan_llm = require('./guan_llm_service');

/* ==================== 检索 ==================== */

/** 余弦相似度 */
function guan_cosine(guan_a, guan_b) {
  if (!Array.isArray(guan_a) || !Array.isArray(guan_b) || guan_a.length !== guan_b.length) {
    return 0;
  }
  let guan_dot = 0;
  let guan_na = 0;
  let guan_nb = 0;
  for (let guan_i = 0; guan_i < guan_a.length; guan_i += 1) {
    guan_dot += guan_a[guan_i] * guan_b[guan_i];
    guan_na += guan_a[guan_i] * guan_a[guan_i];
    guan_nb += guan_b[guan_i] * guan_b[guan_i];
  }
  if (guan_na === 0 || guan_nb === 0) {
    return 0;
  }
  return guan_dot / (Math.sqrt(guan_na) * Math.sqrt(guan_nb));
}

/** 中文按二元词切分，英文数字按单词切分，用于关键词兜底打分 */
function guan_tokenize(guan_text) {
  const guan_source = String(guan_text || '').toLowerCase();
  const guan_terms = [];
  const guan_cjk_blocks = guan_source.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  guan_cjk_blocks.forEach((guan_block) => {
    for (let guan_i = 0; guan_i < guan_block.length - 1; guan_i += 1) {
      guan_terms.push(guan_block.slice(guan_i, guan_i + 2));
    }
  });
  (guan_source.match(/[a-z0-9_]{2,}/g) || []).forEach((guan_word) => guan_terms.push(guan_word));
  return guan_terms;
}

/** 关键词重合度（0~1） */
function guan_keyword_score(guan_query_terms, guan_content) {
  if (guan_query_terms.length === 0) {
    return 0;
  }
  const guan_text = String(guan_content || '').toLowerCase();
  let guan_hit = 0;
  const guan_seen = new Set();
  guan_query_terms.forEach((guan_term) => {
    if (guan_seen.has(guan_term)) {
      return;
    }
    guan_seen.add(guan_term);
    if (guan_text.includes(guan_term)) {
      guan_hit += 1;
    }
  });
  return guan_hit / guan_seen.size;
}

/**
 * 检索最相关片段
 * @param {string} guan_question 用户问题
 * @param {{guan_top_k?: number, guan_doc_ids?: number[]}} guan_options 检索参数
 */
async function guan_retrieve(guan_question, guan_options = {}) {
  const guan_top_k = Math.min(
    Math.max(Number(guan_options.guan_top_k) || guan_env.guan_kb_top_k, 1),
    guan_env.guan_kb_max_top_k
  );

  const guan_rows = guan_kb_model.guan_list_chunks_for_search(guan_options.guan_doc_ids);
  if (guan_rows.length === 0) {
    console.log('[RAG 检索] 知识库暂无可用片段（或所选文档范围为空）');
    return { guan_top_k, guan_hits: [] };
  }

  // 问题向量化：失败时退化为纯关键词检索，保证功能可用
  let guan_query_vector = null;
  try {
    const guan_vectors = await guan_llm.guan_embed([guan_question]);
    guan_query_vector = guan_vectors[0] || null;
  } catch (guan_err) {
    console.warn('[RAG 检索] 问题向量化失败，改用关键词检索：', guan_err.message);
  }

  const guan_terms = guan_tokenize(guan_question);
  const guan_scored = guan_rows.map((guan_row) => {
    let guan_vector_score = 0;
    if (guan_query_vector && guan_row.guan_embedding) {
      try {
        guan_vector_score = guan_cosine(guan_query_vector, JSON.parse(guan_row.guan_embedding));
      } catch (guan_err) {
        guan_vector_score = 0;
      }
    }
    const guan_kw = guan_keyword_score(guan_terms, guan_row.guan_content);
    const guan_score = guan_vector_score > 0
      ? guan_vector_score * 0.7 + guan_kw * 0.3
      : guan_kw;
    return {
      guan_chunk_id: guan_row.guan_id,
      guan_document_id: guan_row.guan_document_id,
      guan_document_name: guan_row.guan_doc_name,
      guan_document_type: guan_row.guan_doc_type,
      guan_index: guan_row.guan_index,
      guan_content: guan_row.guan_content,
      guan_vector_score: Number(guan_vector_score.toFixed(4)),
      guan_keyword_score: Number(guan_kw.toFixed(4)),
      guan_score: Number(guan_score.toFixed(4))
    };
  });

  guan_scored.sort((guan_a, guan_b) => guan_b.guan_score - guan_a.guan_score);

  // 过滤：有向量的片段要求相似度达标；无向量的片段仅靠关键词命中
  const guan_hits = guan_scored
    .filter((guan_item) => (guan_item.guan_vector_score > 0
      ? guan_item.guan_score >= 0.25
      : guan_item.guan_keyword_score > 0))
    .slice(0, guan_top_k);

  console.log(`\n[RAG 检索] 问题：${guan_question}`);
  console.log(`[RAG 检索] 候选片段 ${guan_scored.length} 条，命中 ${guan_hits.length} 条（TopK=${guan_top_k}）`);
  console.table(guan_scored.slice(0, guan_top_k).map((guan_item) => ({
    guan_文档: guan_item.guan_document_name,
    guan_片段: guan_item.guan_index,
    guan_向量分: guan_item.guan_vector_score,
    guan_关键词分: guan_item.guan_keyword_score,
    guan_综合分: guan_item.guan_score
  })));

  return { guan_top_k, guan_hits };
}

/* ==================== 提示词 ==================== */

const guan_system_prompt = [
  '你是「关泉才 · 全栈作品站」的知识库问答助手，负责依据知识库资料回答访客问题。',
  '',
  '【回答规则】',
  '1. 只能依据下方【参考资料】作答，不得使用资料以外的知识，禁止编造事实、数字与链接。',
  '2. 每处结论后用 [编号] 标注来源，编号与参考资料的序号一致，例如 [1]、[1][2]。',
  '3. 若参考资料不足以回答，请明确说明「知识库中没有找到相关资料」，并提示可以上传哪类文档补充。',
  '4. 使用简体中文，先给结论，再给要点；条目不超过 5 条，避免复述无关内容。',
  '5. 不要输出你的推理过程，直接给出答案。'
].join('\n');

/**
 * 组装检索增强提示词
 * @returns {Array<{role: string, content: string}>}
 */
function guan_build_messages(guan_question, guan_hits, guan_history) {
  const guan_context = guan_hits
    .map((guan_hit, guan_i) => `[${guan_i + 1}] 来源：${guan_hit.guan_document_name}（片段 ${guan_hit.guan_index + 1}）\n${guan_hit.guan_content}`)
    .join('\n\n');

  const guan_messages = [{ role: 'system', content: guan_system_prompt }];

  (guan_history || []).forEach((guan_item) => {
    if (guan_item && (guan_item.role === 'user' || guan_item.role === 'assistant') && guan_item.content) {
      guan_messages.push({ role: guan_item.role, content: String(guan_item.content).slice(0, 2000) });
    }
  });

  guan_messages.push({
    role: 'user',
    content: `【参考资料】\n${guan_context}\n\n【用户问题】\n${guan_question}`
  });

  return guan_messages;
}

/* ==================== 问答 ==================== */

/**
 * 检索增强问答
 * @param {{guan_question: string, guan_top_k?: number, guan_doc_ids?: number[], guan_history?: Array, guan_temperature?: number}} guan_params
 */
async function guan_answer(guan_params) {
  const guan_question = String(guan_params.guan_question || '').trim();
  if (!guan_question) {
    const guan_err = new Error('问题不能为空');
    guan_err.guan_code = 4001;
    throw guan_err;
  }
  if (guan_question.length > 1000) {
    const guan_err = new Error('问题过长（最多 1000 字），请精简后重试');
    guan_err.guan_code = 4001;
    throw guan_err;
  }

  const guan_retrieved = await guan_retrieve(guan_question, guan_params);

  if (guan_retrieved.guan_hits.length === 0) {
    const guan_empty_answer = '知识库中没有找到相关资料。请先在「知识库管理」页上传相关文档（支持 TXT / MD / CSV / JSON / HTML / PDF），或换一种说法再提问。';
    console.log('[RAG 回答] 未检索到片段，直接返回兜底提示，未调用大模型');
    return {
      guan_answer: guan_empty_answer,
      guan_citations: [],
      guan_usage: {},
      guan_elapsed: 0,
      guan_model: guan_env.guan_llm_model,
      guan_top_k: guan_retrieved.guan_top_k,
      guan_fallback: true
    };
  }

  const guan_messages = guan_build_messages(guan_question, guan_retrieved.guan_hits, guan_params.guan_history);
  console.log('\n[RAG 提示词] 发送给大模型的 messages：');
  console.log(JSON.stringify(guan_messages, null, 2));

  const guan_result = await guan_llm.guan_chat(guan_messages, {
    guan_temperature: typeof guan_params.guan_temperature === 'number' ? guan_params.guan_temperature : 0.2,
    guan_max_tokens: 900
  });

  const guan_citations = guan_retrieved.guan_hits.map((guan_hit, guan_i) => ({
    guan_no: guan_i + 1,
    guan_chunk_id: guan_hit.guan_chunk_id,
    guan_document_id: guan_hit.guan_document_id,
    guan_document_name: guan_hit.guan_document_name,
    guan_document_type: guan_hit.guan_document_type,
    guan_index: guan_hit.guan_index,
    guan_score: guan_hit.guan_score,
    guan_content: guan_hit.guan_content
  }));

  console.log(`[RAG 回答] 模型：${guan_result.guan_model}｜耗时 ${guan_result.guan_elapsed} ms｜用量：`, guan_result.guan_usage);
  console.log('[RAG 回答] 引用来源：', guan_citations.map((guan_item) => `[${guan_item.guan_no}] ${guan_item.guan_document_name}#${guan_item.guan_index + 1}`).join('  '));

  return {
    guan_answer: guan_result.guan_content,
    guan_citations,
    guan_usage: guan_result.guan_usage,
    guan_elapsed: guan_result.guan_elapsed,
    guan_model: guan_result.guan_model,
    guan_top_k: guan_retrieved.guan_top_k,
    guan_fallback: false
  };
}

module.exports = {
  guan_retrieve,
  guan_answer,
  guan_build_messages,
  guan_cosine
};
