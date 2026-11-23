/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：知识库文本切分器。按段落 → 句子逐级合并，保证片段不切断语义，
 *      相邻片段保留 overlap 个字符的重叠，便于检索命中上下文。
 */
const guan_env = require('../config/guan_env');

/** 按句子边界切分长段落 */
function guan_split_sentences(guan_text) {
  return String(guan_text)
    .split(/(?<=[。！？；!?;\n])/)
    .map((guan_item) => guan_item.trim())
    .filter(Boolean);
}

/**
 * 切分文本
 * @param {string} guan_text 原文
 * @param {{guan_size?: number, guan_overlap?: number}} guan_options 切分参数
 * @returns {Array<{guan_index: number, guan_content: string, guan_chars: number}>}
 */
function guan_split_text(guan_text, guan_options = {}) {
  const guan_size = guan_options.guan_size || guan_env.guan_kb_chunk_size;
  const guan_overlap = Math.min(guan_options.guan_overlap || guan_env.guan_kb_chunk_overlap, Math.floor(guan_size / 2));

  const guan_paragraphs = String(guan_text)
    .split(/\n{2,}/)
    .map((guan_p) => guan_p.trim())
    .filter(Boolean);

  // 段落过长时先拆成句子级单元
  const guan_units = [];
  guan_paragraphs.forEach((guan_para) => {
    if (guan_para.length <= guan_size) {
      guan_units.push(guan_para);
      return;
    }
    guan_split_sentences(guan_para).forEach((guan_sentence) => {
      if (guan_sentence.length <= guan_size) {
        guan_units.push(guan_sentence);
        return;
      }
      // 单句仍然超长：按窗口硬切
      for (let guan_start = 0; guan_start < guan_sentence.length; guan_start += guan_size) {
        guan_units.push(guan_sentence.slice(guan_start, guan_start + guan_size));
      }
    });
  });

  const guan_chunks = [];
  let guan_buffer = '';

  guan_units.forEach((guan_unit) => {
    const guan_next = guan_buffer ? guan_buffer + '\n' + guan_unit : guan_unit;
    if (guan_next.length <= guan_size) {
      guan_buffer = guan_next;
      return;
    }
    if (guan_buffer) {
      guan_chunks.push(guan_buffer);
      // 重叠：保留上一片段的尾部，帮助跨片段语义衔接
      guan_buffer = guan_overlap > 0 ? guan_buffer.slice(-guan_overlap) + '\n' + guan_unit : guan_unit;
    } else {
      guan_buffer = guan_unit;
    }
    while (guan_buffer.length > guan_size) {
      guan_chunks.push(guan_buffer.slice(0, guan_size));
      guan_buffer = guan_buffer.slice(guan_size - guan_overlap);
    }
  });

  if (guan_buffer.trim()) {
    guan_chunks.push(guan_buffer.trim());
  }

  return guan_chunks
    .map((guan_content) => guan_content.trim())
    .filter((guan_content) => guan_content.length > 0)
    .map((guan_content, guan_index) => ({
      guan_index,
      guan_content,
      guan_chars: guan_content.length
    }));
}

module.exports = { guan_split_text };
