/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：识图控制器 —— 图片上传识别、识别记录查询与删除。
 */
const path = require('node:path');
const guan_env = require('../config/guan_env');
const guan_vision_model = require('../models/guan_vision_model');
const guan_vision_service = require('../services/guan_vision_service');
const guan_multipart = require('../utils/guan_multipart');

/** 支持的图片格式与上限 */
const guan_image_ext = ['png', 'jpg', 'jpeg', 'webp'];
const guan_image_max_bytes = 8 * 1024 * 1024;

function guan_fail(guan_res, guan_code, guan_msg, guan_data = null) {
  return guan_res.json({ code: guan_code, msg: guan_msg, data: guan_data });
}

function guan_mime_of(guan_ext, guan_fallback) {
  if (guan_ext === 'png') return 'image/png';
  if (guan_ext === 'jpg' || guan_ext === 'jpeg') return 'image/jpeg';
  if (guan_ext === 'webp') return 'image/webp';
  return guan_fallback || 'image/png';
}

function guan_map_record(guan_row) {
  let guan_fields = {};
  try {
    guan_fields = guan_row.guan_fields ? JSON.parse(guan_row.guan_fields) : {};
  } catch (guan_err) {
    guan_fields = {};
  }
  return {
    guan_id: guan_row.guan_id,
    guan_filename: guan_row.guan_filename,
    guan_mime: guan_row.guan_mime,
    guan_size: guan_row.guan_size,
    guan_summary: guan_row.guan_summary,
    guan_text: guan_row.guan_text,
    guan_fields,
    guan_tags: guan_row.guan_tags,
    guan_model: guan_row.guan_model,
    guan_elapsed: guan_row.guan_elapsed,
    guan_created_at: guan_row.guan_created_at
  };
}

/**
 * POST /api/vision/analyze —— 上传图片并识别
 * 请求：multipart/form-data，字段名 file（png / jpg / jpeg / webp，≤ 8 MB）
 */
async function guan_analyze(guan_req, guan_res, guan_next) {
  try {
    const guan_content_type = guan_req.headers['content-type'] || '';
    if (!guan_content_type.includes('multipart/form-data')) {
      return guan_fail(guan_res, 4001, '请使用 multipart/form-data 上传图片');
    }

    const guan_parts = guan_multipart.guan_parse_multipart(guan_req.body, guan_content_type);
    const guan_file = guan_parts.find((guan_part) => guan_part.guan_filename);
    if (!guan_file) {
      return guan_fail(guan_res, 4001, '未接收到图片，请在表单字段 file 中提交图片文件');
    }

    const guan_name = String(guan_file.guan_filename).replace(/[\\/]/g, '_').slice(0, 120);
    const guan_ext = path.extname(guan_name).replace('.', '').toLowerCase();
    if (!guan_image_ext.includes(guan_ext)) {
      return guan_fail(guan_res, 4002, `仅支持 png / jpg / jpeg / webp 图片，当前为 .${guan_ext || '未知'}`);
    }
    if (guan_file.guan_data.length === 0) {
      return guan_fail(guan_res, 4001, '图片内容为空');
    }
    if (guan_file.guan_data.length > guan_image_max_bytes) {
      return guan_fail(guan_res, 4003, `图片超过上限 ${Math.round(guan_image_max_bytes / 1024 / 1024)} MB，请压缩后重试`);
    }

    console.log(`\n[识图上传] 文件：${guan_name}｜${Math.round(guan_file.guan_data.length / 1024)} KB`);

    const guan_result = await guan_vision_service.guan_analyze_image(
      guan_file.guan_data,
      guan_file.guan_mime || guan_mime_of(guan_ext)
    );

    const guan_id = guan_vision_model.guan_insert_record({
      guan_filename: guan_name,
      guan_mime: guan_mime_of(guan_ext, guan_file.guan_mime),
      guan_size: guan_file.guan_data.length,
      guan_summary: guan_result.guan_summary,
      guan_text: guan_result.guan_text,
      guan_fields: JSON.stringify({
        guan_doc_type: guan_result.guan_doc_type,
        guan_title: guan_result.guan_title,
        guan_amount: guan_result.guan_amount,
        guan_date: guan_result.guan_date,
        guan_keywords: guan_result.guan_keywords
      }),
      guan_tags: guan_result.guan_keywords.join('、'),
      guan_model: guan_result.guan_model,
      guan_elapsed: guan_result.guan_elapsed,
      guan_usage: JSON.stringify(guan_result.guan_usage || {})
    });

    console.log(`[识图上传] 入库成功：id=${guan_id}｜类型=${guan_result.guan_doc_type}｜耗时 ${guan_result.guan_elapsed} ms`);

    return guan_res.json({
      code: 0,
      msg: `识别完成（${guan_result.guan_doc_type}）`,
      data: {
        guan_record: guan_map_record(guan_vision_model.guan_get_record(guan_id)),
        guan_parse_ok: guan_result.guan_parse_ok,
        guan_model: guan_result.guan_model,
        guan_usage: guan_result.guan_usage,
        guan_elapsed: guan_result.guan_elapsed,
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

/** GET /api/vision/records —— 识别记录 */
function guan_list_records(guan_req, guan_res) {
  const guan_list = guan_vision_model.guan_list_records(Number(guan_req.query.guan_limit) || 10).map(guan_map_record);
  return guan_res.json({
    code: 0,
    msg: `查询成功，共 ${guan_list.length} 条记录`,
    data: { guan_total: guan_list.length, guan_list, guan_stats: guan_vision_model.guan_get_stats() }
  });
}

/** DELETE /api/vision/records/:guan_id */
function guan_delete_record(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_fail(guan_res, 4001, '参数错误：guan_id 必须为正整数');
  }
  if (!guan_vision_model.guan_get_record(guan_id)) {
    return guan_fail(guan_res, 4041, `记录不存在：guan_id = ${guan_id}`);
  }
  guan_vision_model.guan_delete_record(guan_id);
  return guan_res.json({ code: 0, msg: '记录已删除', data: { guan_id } });
}

module.exports = {
  guan_analyze,
  guan_list_records,
  guan_delete_record,
  guan_image_ext,
  guan_image_max_bytes,
  guan_vision_model_name: guan_env.guan_llm_vision_model
};
