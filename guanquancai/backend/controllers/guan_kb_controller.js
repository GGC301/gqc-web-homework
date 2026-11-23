/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：知识库管理控制器 —— 文件上传与格式校验、文本解析与切分、向量化入库、
 *      文档列表、片段查看、删除与统计。
 */
const crypto = require('node:crypto');
const guan_env = require('../config/guan_env');
const guan_kb_model = require('../models/guan_kb_model');
const guan_multipart = require('../utils/guan_multipart');
const guan_text_parser = require('../utils/guan_text_parser');
const guan_splitter = require('../utils/guan_splitter');
const guan_llm = require('../services/guan_llm_service');

/** 单个文档最多入库片段数，防止超长文件把库撑爆 */
const guan_max_chunks = 400;

/** 统一失败响应 */
function guan_fail(guan_res, guan_code, guan_msg, guan_data = null) {
  return guan_res.json({ code: guan_code, msg: guan_msg, data: guan_data });
}

/** 文档行 → 前端字段 */
function guan_map_document(guan_row) {
  if (!guan_row) {
    return null;
  }
  return {
    guan_id: guan_row.guan_id,
    guan_name: guan_row.guan_name,
    guan_type: guan_row.guan_type,
    guan_size: guan_row.guan_size,
    guan_chars: guan_row.guan_chars,
    guan_chunk_total: guan_row.guan_chunk_total,
    guan_embed_total: guan_row.guan_embed_total,
    guan_status: guan_row.guan_status,
    guan_note: guan_row.guan_note,
    guan_created_at: guan_row.guan_created_at
  };
}

/**
 * POST /api/kb/documents —— 上传文档
 * 请求：multipart/form-data，字段名 file
 */
async function guan_upload_document(guan_req, guan_res, guan_next) {
  try {
    const guan_content_type = guan_req.headers['content-type'] || '';
    if (!guan_content_type.includes('multipart/form-data')) {
      return guan_fail(guan_res, 4001, '请使用 multipart/form-data 上传文件');
    }

    const guan_parts = guan_multipart.guan_parse_multipart(guan_req.body, guan_content_type);
    const guan_file = guan_parts.find((guan_part) => guan_part.guan_filename);
    if (!guan_file) {
      return guan_fail(guan_res, 4001, '未接收到文件，请在表单字段 file 中提交文件');
    }

    const guan_size = guan_file.guan_data.length;
    if (guan_size === 0) {
      return guan_fail(guan_res, 4001, '文件内容为空');
    }
    if (guan_size > guan_env.guan_kb_max_file_bytes) {
      return guan_fail(guan_res, 4003, `文件超过上限 ${guan_env.guan_kb_max_file_mb} MB`);
    }

    const guan_name = String(guan_file.guan_filename).replace(/[\\/]/g, '_').slice(0, 120);
    console.log(`\n[知识库上传] 文件：${guan_name}｜大小：${guan_size} 字节｜类型：${guan_file.guan_mime || '未知'}`);

    // 1. 解析文本
    let guan_parsed;
    try {
      guan_parsed = guan_text_parser.guan_parse_document(guan_file.guan_data, guan_name);
    } catch (guan_err) {
      console.error('[知识库上传] 解析失败：', guan_err.message);
      return guan_fail(guan_res, 4002, guan_err.message);
    }

    // 2. 去重（同一文件重复上传）
    const guan_hash = crypto.createHash('sha256').update(guan_file.guan_data).digest('hex');
    const guan_duplicate = guan_kb_model.guan_find_document_by_hash(guan_hash);
    if (guan_duplicate) {
      return guan_fail(guan_res, 4091, `该文件已存在于知识库：${guan_duplicate.guan_name}`, guan_map_document(guan_duplicate));
    }

    // 3. 文本切分
    let guan_chunks = guan_splitter.guan_split_text(guan_parsed.guan_text);
    let guan_note = guan_parsed.guan_warning;
    if (guan_chunks.length > guan_max_chunks) {
      guan_chunks = guan_chunks.slice(0, guan_max_chunks);
      guan_note = [guan_note, `片段过多，仅保留前 ${guan_max_chunks} 段`].filter(Boolean).join('；');
    }
    if (guan_chunks.length === 0) {
      return guan_fail(guan_res, 4002, '文本切分后没有有效片段，请检查文件内容');
    }

    // 4. 向量化（失败时降级为关键词检索，不阻断上传）
    let guan_vectors = [];
    let guan_status = 'indexed';
    try {
      guan_vectors = await guan_llm.guan_embed(guan_chunks.map((guan_chunk) => guan_chunk.guan_content));
    } catch (guan_err) {
      guan_status = 'parsed';
      guan_note = [guan_note, `向量化失败（${guan_err.message}），已退化为关键词检索`].filter(Boolean).join('；');
      console.warn('[知识库上传] 向量化失败：', guan_err.message);
    }

    // 5. 入库
    const guan_doc_id = guan_kb_model.guan_insert_document({
      guan_name,
      guan_type: guan_parsed.guan_type,
      guan_size,
      guan_chars: guan_parsed.guan_text.length,
      guan_chunk_total: guan_chunks.length,
      guan_embed_total: guan_vectors.length,
      guan_status,
      guan_note,
      guan_hash
    });
    guan_kb_model.guan_insert_chunks(guan_doc_id, guan_chunks, guan_vectors);

    const guan_doc = guan_kb_model.guan_get_document(guan_doc_id);
    console.log(`[知识库上传] 入库成功：id=${guan_doc_id}｜字符 ${guan_parsed.guan_text.length}｜片段 ${guan_chunks.length}｜向量 ${guan_vectors.length}`);

    return guan_res.json({
      code: 0,
      msg: `上传成功，已切分 ${guan_chunks.length} 个片段，向量化 ${guan_vectors.length} 个`,
      data: guan_map_document(guan_doc)
    });
  } catch (guan_err) {
    return guan_next(guan_err);
  }
}

/** GET /api/kb/documents —— 文档列表 */
function guan_list_documents(guan_req, guan_res) {
  const guan_keyword = String(guan_req.query.guan_keyword || '').trim();
  const guan_rows = guan_kb_model.guan_list_documents(guan_keyword);
  const guan_list = guan_rows.map(guan_map_document);
  console.log(`[知识库列表] 查询到 ${guan_list.length} 个文档${guan_keyword ? `（关键词：${guan_keyword}）` : ''}`);
  return guan_res.json({
    code: 0,
    msg: `查询成功，共 ${guan_list.length} 个文档`,
    data: { guan_total: guan_list.length, guan_list }
  });
}

/** GET /api/kb/documents/:guan_id —— 文档详情与片段 */
function guan_get_document(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_fail(guan_res, 4001, '参数错误：guan_id 必须为正整数');
  }
  const guan_doc = guan_kb_model.guan_get_document(guan_id);
  if (!guan_doc) {
    return guan_fail(guan_res, 4041, `文档不存在：guan_id = ${guan_id}`);
  }
  const guan_chunks = guan_kb_model.guan_list_chunks(guan_id);
  return guan_res.json({
    code: 0,
    msg: '查询成功',
    data: {
      guan_document: guan_map_document(guan_doc),
      guan_chunk_total: guan_chunks.length,
      guan_chunks
    }
  });
}

/** DELETE /api/kb/documents/:guan_id —— 删除文档及其片段 */
function guan_delete_document(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_fail(guan_res, 4001, '参数错误：guan_id 必须为正整数');
  }
  const guan_doc = guan_kb_model.guan_get_document(guan_id);
  if (!guan_doc) {
    return guan_fail(guan_res, 4041, `文档不存在：guan_id = ${guan_id}`);
  }
  const guan_changes = guan_kb_model.guan_delete_document(guan_id);
  console.log(`[知识库删除] guan_id=${guan_id}｜${guan_doc.guan_name}｜影响 ${guan_changes} 行`);
  return guan_res.json({
    code: 0,
    msg: `已删除文档《${guan_doc.guan_name}》及其全部片段`,
    data: { guan_id, guan_changes }
  });
}

/** GET /api/kb/stats —— 知识库统计 */
function guan_get_stats(guan_req, guan_res) {
  const guan_stats = guan_kb_model.guan_get_stats();
  return guan_res.json({
    code: 0,
    msg: '查询成功',
    data: Object.assign({}, guan_stats, {
      guan_embed_model: guan_env.guan_llm_embed_model,
      guan_chunk_size: guan_env.guan_kb_chunk_size,
      guan_chunk_overlap: guan_env.guan_kb_chunk_overlap,
      guan_max_file_mb: guan_env.guan_kb_max_file_mb,
      guan_supported_ext: guan_text_parser.guan_supported_ext
    })
  });
}

module.exports = {
  guan_upload_document,
  guan_list_documents,
  guan_get_document,
  guan_delete_document,
  guan_get_stats
};
