/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-16 | 大模型：deepseek-v4.1-flash
 * 说明：商业评论情感分析控制器 —— Excel 上传与解析、大模型三分类、饼图统计、
 *      精选评论挑选、历史批次查询、模板与样例下载。
 */
const fs = require('node:fs');
const path = require('node:path');
const guan_env = require('../config/guan_env');
const guan_review_model = require('../models/guan_review_model');
const guan_review_service = require('../services/guan_review_service');
const guan_multipart = require('../utils/guan_multipart');
const guan_xlsx = require('../utils/guan_xlsx');

/** 单次上传最多分析的评论条数 */
const guan_max_items = 200;
/** 精选评论条数 */
const guan_featured_limit = 6;
/** 项目根目录（3 份 Excel 模拟数据所在目录） */
const guan_root_dir = path.resolve(__dirname, '..', '..');

function guan_fail(guan_res, guan_code, guan_msg, guan_data = null) {
  return guan_res.json({ code: guan_code, msg: guan_msg, data: guan_data });
}

/** 表头关键字匹配 */
const guan_column_rules = [
  { guan_key: 'guan_content', guan_re: /(评论|内容|评价|正文|反馈|意见|content|comment|review|text)/i },
  { guan_key: 'guan_author', guan_re: /(昵称|用户|客户|会员|姓名|账号|author|user|name|nick)/i },
  { guan_key: 'guan_rating', guan_re: /(星级|评分|分数|打分|rating|score|star)/i },
  { guan_key: 'guan_time', guan_re: /(时间|日期|time|date)/i },
  { guan_key: 'guan_index', guan_re: /^(序号|编号|id|no\.?)$/i }
];

/** 在一行中识别各列位置；识别不到评论列时返回 -1 */
function guan_match_header(guan_row) {
  const guan_map = {};
  guan_row.forEach((guan_cell, guan_col) => {
    const guan_text = String(guan_cell || '').trim();
    if (!guan_text) {
      return;
    }
    guan_column_rules.forEach((guan_rule) => {
      if (guan_map[guan_rule.guan_key] == null && guan_rule.guan_re.test(guan_text)) {
        guan_map[guan_rule.guan_key] = guan_col;
      }
    });
  });
  return guan_map;
}

/**
 * 把二维表转成评论数组：优先按表头识别列，无表头时用「平均字数最多的列」当评论列
 */
function guan_rows_to_items(guan_rows) {
  if (!Array.isArray(guan_rows) || guan_rows.length === 0) {
    throw new Error('Excel 中没有数据行，请参考模板填写评论后重新上传');
  }

  let guan_map = guan_match_header(guan_rows[0]);
  let guan_data_rows = guan_rows;
  let guan_has_header = guan_map.guan_content != null;

  if (guan_has_header) {
    guan_data_rows = guan_rows.slice(1);
  } else {
    // 无表头：取前 5 行平均长度最大的列作为评论列
    const guan_scan = guan_rows.slice(0, 5);
    const guan_col_total = guan_scan.reduce((guan_max, guan_row) => Math.max(guan_max, guan_row.length), 0);
    let guan_best_col = 0;
    let guan_best_len = -1;
    for (let guan_col = 0; guan_col < guan_col_total; guan_col += 1) {
      const guan_avg = guan_scan.reduce((guan_sum, guan_row) => guan_sum + String(guan_row[guan_col] || '').length, 0) / guan_scan.length;
      if (guan_avg > guan_best_len) {
        guan_best_len = guan_avg;
        guan_best_col = guan_col;
      }
    }
    guan_map = { guan_content: guan_best_col };
  }

  const guan_items = [];
  guan_data_rows.forEach((guan_row) => {
    const guan_content = String(guan_row[guan_map.guan_content] || '').trim();
    if (guan_content.replace(/\s/g, '').length < 2) {
      return;
    }
    guan_items.push({
      guan_index: guan_items.length + 1,
      guan_content: guan_content.slice(0, 1000),
      guan_author: guan_map.guan_author != null ? String(guan_row[guan_map.guan_author] || '').trim().slice(0, 40) : '',
      guan_rating: guan_map.guan_rating != null ? String(guan_row[guan_map.guan_rating] || '').trim().slice(0, 12) : '',
      guan_time: guan_map.guan_time != null ? String(guan_row[guan_map.guan_time] || '').trim().slice(0, 24) : ''
    });
  });

  if (guan_items.length === 0) {
    throw new Error('未解析到有效评论，请确认「评论内容」列已填写文字');
  }
  if (guan_items.length > guan_max_items) {
    throw new Error(`单次最多分析 ${guan_max_items} 条评论，当前文件有 ${guan_items.length} 条，请拆分后上传`);
  }

  return { guan_items, guan_has_header, guan_map };
}

/** 统计饼图数据 */
function guan_build_pie(guan_rows) {
  const guan_total = guan_rows.length || 1;
  return guan_review_service.guan_labels.map((guan_label) => {
    const guan_count = guan_rows.filter((guan_row) => guan_row.guan_label === guan_label).length;
    return {
      guan_label,
      guan_name: guan_review_service.guan_label_names[guan_label],
      guan_count,
      guan_percent: Number(((guan_count / guan_total) * 100).toFixed(1))
    };
  });
}

/** 数据库行 → 前端字段 */
function guan_map_item(guan_row) {
  return {
    guan_id: guan_row.guan_id,
    guan_index: guan_row.guan_index,
    guan_author: guan_row.guan_author,
    guan_rating: guan_row.guan_rating,
    guan_time: guan_row.guan_time,
    guan_content: guan_row.guan_content,
    guan_label: guan_row.guan_label,
    guan_label_name: guan_review_service.guan_label_names[guan_row.guan_label] || '中评',
    guan_score: guan_row.guan_score,
    guan_value: guan_row.guan_value,
    guan_reason: guan_row.guan_reason,
    guan_tags: guan_row.guan_tags,
    guan_featured: Boolean(guan_row.guan_featured)
  };
}

function guan_map_batch(guan_row) {
  if (!guan_row) {
    return null;
  }
  let guan_usage = {};
  try {
    guan_usage = guan_row.guan_usage ? JSON.parse(guan_row.guan_usage) : {};
  } catch (guan_err) {
    guan_usage = {};
  }
  return {
    guan_id: guan_row.guan_id,
    guan_filename: guan_row.guan_filename,
    guan_sheet: guan_row.guan_sheet,
    guan_total: guan_row.guan_total,
    guan_good: guan_row.guan_good,
    guan_neutral: guan_row.guan_neutral,
    guan_bad: guan_row.guan_bad,
    guan_avg_score: guan_row.guan_avg_score,
    guan_featured_total: guan_row.guan_featured_total,
    guan_status: guan_row.guan_status,
    guan_note: guan_row.guan_note,
    guan_model: guan_row.guan_model,
    guan_usage,
    guan_elapsed: guan_row.guan_elapsed,
    guan_created_at: guan_row.guan_created_at
  };
}

/** 组装批次详情（饼图 + 明细 + 精选） */
function guan_build_detail(guan_batch) {
  const guan_items = guan_review_model.guan_list_items(guan_batch.guan_id).map(guan_map_item);
  const guan_featured = guan_review_model.guan_list_featured(guan_batch.guan_id, guan_featured_limit).map(guan_map_item);
  return {
    guan_batch: guan_map_batch(guan_batch),
    guan_pie: guan_build_pie(guan_items),
    guan_total: guan_items.length,
    guan_items,
    guan_featured
  };
}

/**
 * POST /api/review/upload —— 上传 Excel 分析商业评论
 * 请求：multipart/form-data，字段名 file
 */
async function guan_upload_reviews(guan_req, guan_res, guan_next) {
  const guan_started = Date.now();
  try {
    const guan_content_type = guan_req.headers['content-type'] || '';
    if (!guan_content_type.includes('multipart/form-data')) {
      return guan_fail(guan_res, 4001, '请使用 multipart/form-data 上传 Excel 文件');
    }

    const guan_parts = guan_multipart.guan_parse_multipart(guan_req.body, guan_content_type);
    const guan_file = guan_parts.find((guan_part) => guan_part.guan_filename);
    if (!guan_file) {
      return guan_fail(guan_res, 4001, '未接收到文件，请在表单字段 file 中提交 .xlsx 文件');
    }

    const guan_name = String(guan_file.guan_filename).replace(/[\\/]/g, '_').slice(0, 120);
    const guan_ext = path.extname(guan_name).replace('.', '').toLowerCase();
    if (guan_ext !== 'xlsx') {
      return guan_fail(guan_res, 4002, `仅支持 .xlsx 格式，当前文件为 .${guan_ext || '未知'}（.xls 请另存为 .xlsx）`);
    }
    if (guan_file.guan_data.length === 0) {
      return guan_fail(guan_res, 4001, '文件内容为空');
    }
    if (guan_file.guan_data.length > guan_env.guan_kb_max_file_bytes) {
      return guan_fail(guan_res, 4003, `文件超过上限 ${guan_env.guan_kb_max_file_mb} MB`);
    }

    console.log(`\n[评论上传] 文件：${guan_name}｜大小：${guan_file.guan_data.length} 字节`);

    // 1. 解析 Excel
    let guan_parsed;
    try {
      guan_parsed = guan_xlsx.guan_read_xlsx(guan_file.guan_data);
    } catch (guan_err) {
      console.error('[评论上传] Excel 解析失败：', guan_err.message);
      return guan_fail(guan_res, 4002, guan_err.message);
    }

    // 2. 表格 → 评论数组
    let guan_prepared;
    try {
      guan_prepared = guan_rows_to_items(guan_parsed.guan_rows);
    } catch (guan_err) {
      return guan_fail(guan_res, 4002, guan_err.message);
    }
    const guan_items = guan_prepared.guan_items;
    console.log(`[评论上传] 解析到 ${guan_items.length} 条评论（表头：${guan_prepared.guan_has_header ? '有' : '无'}）`);

    // 3. 大模型三分类
    const guan_analysis = await guan_review_service.guan_analyze_reviews(guan_items);

    // 4. 合并结果并挑选精选评论
    const guan_rows = guan_items.map((guan_item, guan_index) => ({
      ...guan_item,
      ...guan_analysis.guan_items[guan_index]
    }));
    const guan_featured_rows = guan_review_service.guan_pick_featured(guan_rows, guan_featured_limit);
    const guan_featured_index = new Set(guan_featured_rows.map((guan_row) => guan_row.guan_index));
    guan_rows.forEach((guan_row) => {
      guan_row.guan_featured = guan_featured_index.has(guan_row.guan_index);
    });

    const guan_pie = guan_build_pie(guan_rows);
    const guan_avg = guan_rows.length
      ? Number((guan_rows.reduce((guan_sum, guan_row) => guan_sum + guan_row.guan_score, 0) / guan_rows.length).toFixed(1))
      : 0;
    const guan_count = {
      guan_good: guan_pie[0].guan_count,
      guan_neutral: guan_pie[1].guan_count,
      guan_bad: guan_pie[2].guan_count
    };

    // 5. 入库
    const guan_batch_id = guan_review_model.guan_insert_batch({
      guan_filename: guan_name,
      guan_sheet: path.basename(guan_parsed.guan_sheet),
      guan_total: guan_rows.length,
      guan_good: guan_count.guan_good,
      guan_neutral: guan_count.guan_neutral,
      guan_bad: guan_count.guan_bad,
      guan_avg_score: guan_avg,
      guan_featured_total: guan_featured_rows.length,
      guan_status: guan_analysis.guan_fallback ? 'fallback' : 'done',
      guan_note: guan_analysis.guan_note,
      guan_model: guan_analysis.guan_model,
      guan_usage: JSON.stringify(guan_analysis.guan_usage || {}),
      guan_elapsed: guan_analysis.guan_elapsed
    });
    guan_review_model.guan_insert_items(guan_batch_id, guan_rows);

    const guan_detail = guan_build_detail(guan_review_model.guan_get_batch(guan_batch_id));
    console.log(`[评论上传] 入库成功：批次 ${guan_batch_id}｜好评 ${guan_count.guan_good}｜中评 ${guan_count.guan_neutral}｜差评 ${guan_count.guan_bad}｜耗时 ${Date.now() - guan_started} ms`);

    return guan_res.json({
      code: 0,
      msg: `分析完成，共 ${guan_rows.length} 条评论：好评 ${guan_count.guan_good} / 中评 ${guan_count.guan_neutral} / 差评 ${guan_count.guan_bad}`,
      data: {
        ...guan_detail,
        guan_label_names: guan_review_service.guan_label_names,
        guan_usage: guan_analysis.guan_usage,
        guan_model: guan_analysis.guan_model,
        guan_elapsed: guan_analysis.guan_elapsed,
        guan_note: guan_analysis.guan_note,
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

/** GET /api/review/batches —— 历史批次列表 */
function guan_list_batches(guan_req, guan_res) {
  const guan_rows = guan_review_model.guan_list_batches(Number(guan_req.query.guan_limit) || 20);
  const guan_list = guan_rows.map(guan_map_batch);
  return guan_res.json({
    code: 0,
    msg: `查询成功，共 ${guan_list.length} 个批次`,
    data: { guan_total: guan_list.length, guan_list, guan_stats: guan_review_model.guan_get_stats() }
  });
}

/** GET /api/review/batches/:guan_id —— 批次详情 */
function guan_get_batch_detail(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_fail(guan_res, 4001, '参数错误：guan_id 必须为正整数');
  }
  const guan_batch = guan_review_model.guan_get_batch(guan_id);
  if (!guan_batch) {
    return guan_fail(guan_res, 4041, `批次不存在：guan_id = ${guan_id}`);
  }
  const guan_detail = guan_build_detail(guan_batch);
  return guan_res.json({
    code: 0,
    msg: '查询成功',
    data: {
      ...guan_detail,
      guan_label_names: guan_review_service.guan_label_names
    }
  });
}

/** DELETE /api/review/batches/:guan_id —— 删除批次 */
function guan_delete_batch(guan_req, guan_res) {
  const guan_id = Number(guan_req.params.guan_id);
  if (!Number.isInteger(guan_id) || guan_id <= 0) {
    return guan_fail(guan_res, 4001, '参数错误：guan_id 必须为正整数');
  }
  const guan_batch = guan_review_model.guan_get_batch(guan_id);
  if (!guan_batch) {
    return guan_fail(guan_res, 4041, `批次不存在：guan_id = ${guan_id}`);
  }
  guan_review_model.guan_delete_batch(guan_id);
  return guan_res.json({
    code: 0,
    msg: `已删除批次《${guan_batch.guan_filename}》及其 ${guan_batch.guan_total} 条评论`,
    data: { guan_id }
  });
}

/** 模板表头 */
const guan_template_header = ['序号', '评论内容', '用户昵称', '星级(1-5)', '评论时间'];

/** 下载响应头（中文文件名） */
function guan_send_xlsx(guan_res, guan_buffer, guan_filename) {
  guan_res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  guan_res.setHeader(
    'Content-Disposition',
    `attachment; filename="review.xlsx"; filename*=UTF-8''${encodeURIComponent(guan_filename)}`
  );
  guan_res.setHeader('Content-Length', guan_buffer.length);
  return guan_res.end(guan_buffer);
}

/** GET /api/review/template —— 下载上传模板 */
function guan_download_template(guan_req, guan_res, guan_next) {
  try {
    const guan_rows = [
      guan_template_header,
      ['1', '包装很结实，隔天就到了，客服回复也很快，会再回购。', '小明', '5', '2026-11-10 09:20'],
      ['2', '味道还行，分量比想象中小一点，价格略贵，整体一般。', '阿珍', '3', '2026-11-10 12:05'],
      ['3', '收到就有划痕，申请换货拖了三天没人处理，非常失望。', '老李', '1', '2026-11-11 18:40']
    ];
    const guan_buffer = guan_xlsx.guan_write_xlsx('商业评论', guan_rows, [8, 64, 16, 12, 20]);
    console.log('[评论模板] 已生成上传模板');
    return guan_send_xlsx(guan_res, guan_buffer, '商业评论上传模板.xlsx');
  } catch (guan_err) {
    return guan_next(guan_err);
  }
}

/** GET /api/review/samples —— 3 份模拟数据清单 */
function guan_list_samples(guan_req, guan_res) {
  const guan_rows = [1, 2, 3].map((guan_no) => {
    const guan_filename = `商业评论模拟数据-0${guan_no}.xlsx`;
    const guan_full = path.join(guan_root_dir, guan_filename);
    const guan_exists = fs.existsSync(guan_full);
    return {
      guan_no,
      guan_filename,
      guan_exists,
      guan_size: guan_exists ? fs.statSync(guan_full).size : 0,
      guan_download: `/api/review/samples/${guan_no}`
    };
  });
  return guan_res.json({ code: 0, msg: '查询成功', data: { guan_list: guan_rows } });
}

/** GET /api/review/samples/:guan_no —— 下载模拟数据 */
function guan_download_sample(guan_req, guan_res, guan_next) {
  try {
    const guan_no = Number(guan_req.params.guan_no);
    if (![1, 2, 3].includes(guan_no)) {
      return guan_fail(guan_res, 4001, '参数错误：guan_no 只能是 1、2、3');
    }
    const guan_filename = `商业评论模拟数据-0${guan_no}.xlsx`;
    const guan_full = path.join(guan_root_dir, guan_filename);
    if (!fs.existsSync(guan_full)) {
      return guan_fail(guan_res, 4041, `模拟数据文件不存在：${guan_filename}，请先执行 npm run initreview`);
    }
    return guan_send_xlsx(guan_res, fs.readFileSync(guan_full), guan_filename);
  } catch (guan_err) {
    return guan_next(guan_err);
  }
}

module.exports = {
  guan_upload_reviews,
  guan_list_batches,
  guan_get_batch_detail,
  guan_delete_batch,
  guan_download_template,
  guan_list_samples,
  guan_download_sample
};
