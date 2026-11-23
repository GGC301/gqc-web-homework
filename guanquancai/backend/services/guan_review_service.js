/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-16 | 大模型：deepseek-v4.1-flash
 * 说明：商业评论情感分析服务。把评论分批交给大模型，要求返回严格的 JSON：
 *      好评 / 中评 / 差评 + 情感分 + 信息价值分 + 判定理由 + 关键词标签。
 *      解析失败时退回本地关键词规则，保证接口不因模型输出异常而 500。
 */
const guan_llm = require('./guan_llm_service');

/** 单批评论条数：控制提示词长度与 JSON 截断风险 */
const guan_batch_size = 8;

/** 单批调用的超时时间：批量任务比单次问答更耗时，单独放宽 */
const guan_timeout_ms = 120000;

/** 单条评论送模型的字数上限 */
const guan_content_limit = 400;

const guan_labels = ['good', 'neutral', 'bad'];

const guan_label_names = {
  good: '好评',
  neutral: '中评',
  bad: '差评'
};

/** 中文标签 → 统一英文枚举 */
function guan_normalize_label(guan_value) {
  const guan_text = String(guan_value || '').trim().toLowerCase();
  if (guan_text === 'good' || guan_text === '好评' || guan_text === 'positive' || guan_text === '正面') {
    return 'good';
  }
  if (guan_text === 'bad' || guan_text === '差评' || guan_text === 'negative' || guan_text === '负面') {
    return 'bad';
  }
  if (guan_text === 'neutral' || guan_text === '中评' || guan_text === '中性' || guan_text === 'mixed') {
    return 'neutral';
  }
  return '';
}

/** 限制到 [guan_min, guan_max] 的整数 */
function guan_clamp_int(guan_value, guan_min, guan_max, guan_fallback) {
  const guan_num = Number(guan_value);
  if (!Number.isFinite(guan_num)) {
    return guan_fallback;
  }
  return Math.min(guan_max, Math.max(guan_min, Math.round(guan_num)));
}

/** 从模型输出中提取 JSON 对象（容忍 ```json 围栏与前后说明文字） */
function guan_extract_json(guan_text) {
  const guan_raw = String(guan_text || '').replace(/```json/gi, '```').trim();
  const guan_unfenced = guan_raw.replace(/```/g, '');
  const guan_start = guan_unfenced.indexOf('{');
  const guan_end = guan_unfenced.lastIndexOf('}');
  if (guan_start < 0 || guan_end <= guan_start) {
    return null;
  }
  try {
    return JSON.parse(guan_unfenced.slice(guan_start, guan_end + 1));
  } catch (guan_err) {
    return null;
  }
}

/** 构造系统提示词 */
function guan_system_prompt() {
  return [
    '你是资深商业评论情感分析专家，负责把顾客评论判定为「好评」「中评」「差评」三类。',
    '判定标准：',
    '1. 好评 good：整体满意，明确肯定产品/服务/物流/体验，即使有轻微建议也以正面为主。',
    '2. 差评 bad：整体不满，明确否定质量、态度、发货、售后等，或表达退货退款、投诉、不再购买。',
    '3. 中评 neutral：褒贬参半、情绪平淡、只描述事实无明确倾向，或信息不足无法判断。',
    '另外为每条评论打分：',
    '- guan_score：情感分 0-100，越高越正面（0-40 差评区间，41-69 中评区间，70-100 好评区间）。',
    '- guan_value：精选价值分 0-100，衡量这条评论对商家改进是否有参考价值，'
      + '包含具体细节（品类、时间、金额、环节、具体问题）、描述充分、可执行的反馈得分高；'
      + '只有「好」「差」「不错」等空洞短句得分低。',
    '- guan_reason：不超过 40 字的中文判定理由，必须结合评论原文。',
    '- guan_tags：1-3 个中文关键词标签（如 物流、包装、客服、价格、质量、口味、退款）。',
    '只输出 JSON，不要输出解释、Markdown 代码块或多余文字，格式为：',
    '{"guan_results":[{"guan_id":1,"guan_label":"good","guan_score":86,"guan_value":73,"guan_reason":"肯定物流速度与包装","guan_tags":["物流","包装"]}]}',
    'guan_id 必须与输入完全一致，且不能遗漏任何一条评论。'
  ].join('\n');
}

/** 本地关键词兜底规则（模型不可用或输出无法解析时使用） */
function guan_rule_classify(guan_content, guan_rating) {
  const guan_text = String(guan_content || '');
  const guan_positive_words = ['好', '满意', '喜欢', '不错', '推荐', '快', '棒', '实惠', '划算', '新鲜', '专业', '耐心', '干净', '惊喜', '值得'];
  const guan_negative_words = ['差', '烂', '慢', '贵', '失望', '退货', '退款', '投诉', '难吃', '破损', '态度恶劣', '骗', '垃圾', '不推荐', '问题', '故障', '异味', '缺斤少两'];
  const guan_negation = /不(好|满意|推荐|新鲜|快)|没(有)?(效果|用)|再也不/;

  let guan_hit = 0;
  guan_positive_words.forEach((guan_word) => {
    if (guan_text.includes(guan_word)) {
      guan_hit += 1;
    }
  });
  let guan_bad_hit = 0;
  guan_negative_words.forEach((guan_word) => {
    if (guan_text.includes(guan_word)) {
      guan_bad_hit += 1;
    }
  });
  if (guan_negation.test(guan_text)) {
    guan_bad_hit += 2;
  }

  // 星级作为辅助信号（1-2 星偏负面，4-5 星偏正面）
  const guan_star = Number(String(guan_rating || '').replace(/[^\d.]/g, ''));
  if (Number.isFinite(guan_star) && guan_star > 0) {
    if (guan_star <= 2) {
      guan_bad_hit += 1;
    } else if (guan_star >= 4) {
      guan_hit += 1;
    }
  }

  const guan_diff = guan_hit - guan_bad_hit;
  let guan_label = 'neutral';
  let guan_score = 60;
  if (guan_diff >= 2) {
    guan_label = 'good';
    guan_score = 68 + Math.min(24, guan_diff * 6);
  } else if (guan_diff <= -2) {
    guan_label = 'bad';
    guan_score = 40 - Math.min(28, Math.abs(guan_diff) * 6);
  } else if (guan_diff === 1) {
    guan_score = 64;
  } else if (guan_diff === -1) {
    guan_score = 52;
  }

  const guan_length = guan_text.replace(/\s/g, '').length;
  const guan_value = Math.min(78, 24 + guan_length + guan_diff * 2);

  return {
    guan_label,
    guan_score: guan_clamp_int(guan_score, 0, 100, 60),
    guan_value: guan_clamp_int(guan_value, 0, 100, 30),
    guan_reason: '本地规则判定（模型结果不可用）',
    guan_tags: ''
  };
}

/** 归一化单条模型结果 */
function guan_normalize_result(guan_result, guan_item) {
  const guan_label = guan_normalize_label(guan_result && (guan_result.guan_label || guan_result.guan_label_name || guan_result.label));
  const guan_fallback = guan_rule_classify(guan_item.guan_content, guan_item.guan_rating);

  const guan_tags = guan_result && guan_result.guan_tags
    ? (Array.isArray(guan_result.guan_tags) ? guan_result.guan_tags : String(guan_result.guan_tags).split(/[、,，;；\s]+/))
      .map((guan_tag) => String(guan_tag || '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .join('、')
    : '';

  return {
    guan_label: guan_label || guan_fallback.guan_label,
    guan_score: guan_clamp_int(guan_result && guan_result.guan_score, 0, 100, guan_fallback.guan_score),
    guan_value: guan_clamp_int(guan_result && guan_result.guan_value, 0, 100, guan_fallback.guan_value),
    guan_reason: String((guan_result && guan_result.guan_reason) || guan_fallback.guan_reason).slice(0, 80),
    guan_tags
  };
}

/** 调用模型分析一批评论 */
async function guan_analyze_batch(guan_items, guan_start_index) {
  const guan_tasks = guan_items.map((guan_item, guan_index) => ({
    guan_id: guan_start_index + guan_index + 1,
    guan_rating: guan_item.guan_rating || '',
    guan_content: String(guan_item.guan_content || '').slice(0, guan_content_limit)
  }));

  const guan_messages = [
    { role: 'system', content: guan_system_prompt() },
    { role: 'user', content: `请分析下面 ${guan_tasks.length} 条评论，严格按约定 JSON 返回：\n${JSON.stringify({ guan_comments: guan_tasks }, null, 0)}` }
  ];

  const guan_pack = await guan_llm.guan_chat(guan_messages, {
    guan_temperature: 0.1,
    guan_max_tokens: 1200,
    guan_timeout_ms
  });
  const guan_json = guan_extract_json(guan_pack.guan_content);
  const guan_results = guan_json && Array.isArray(guan_json.guan_results) ? guan_json.guan_results : [];

  const guan_by_id = new Map();
  guan_results.forEach((guan_result) => {
    const guan_id = Number(guan_result && (guan_result.guan_id || guan_result.id));
    if (Number.isInteger(guan_id)) {
      guan_by_id.set(guan_id, guan_result);
    }
  });

  const guan_output = guan_tasks.map((guan_task, guan_index) => ({
    ...guan_normalize_result(guan_by_id.get(guan_task.guan_id), guan_items[guan_index]),
    guan_miss: !guan_by_id.has(guan_task.guan_id)
  }));

  return {
    guan_output,
    guan_miss_total: guan_output.filter((guan_row) => guan_row.guan_miss).length,
    guan_model: guan_pack.guan_model,
    guan_usage: guan_pack.guan_usage,
    guan_elapsed: guan_pack.guan_elapsed,
    guan_raw: guan_pack.guan_content
  };
}

/** 汇总 token 用量 */
function guan_sum_usage(guan_total, guan_usage) {
  const guan_prompt = (guan_usage && (guan_usage.prompt_tokens || guan_usage.promptTokens)) || 0;
  const guan_completion = (guan_usage && (guan_usage.completion_tokens || guan_usage.completionTokens)) || 0;
  return {
    prompt_tokens: (guan_total.prompt_tokens || 0) + guan_prompt,
    completion_tokens: (guan_total.completion_tokens || 0) + guan_completion,
    total_tokens: (guan_total.total_tokens || 0) + (guan_usage && guan_usage.total_tokens ? guan_usage.total_tokens : guan_prompt + guan_completion)
  };
}

/**
 * 执行一段评论的分析：失败时二分拆批重试，单条仍失败才退回本地规则
 * @param {Array} guan_items 本段评论
 * @param {number} guan_start_index 本段第一条在原数组中的下标
 * @param {string[]} guan_notes 备注收集器
 */
async function guan_analyze_segment(guan_items, guan_start_index, guan_notes) {
  try {
    const guan_pack = await guan_analyze_batch(guan_items, guan_start_index);
    if (guan_pack.guan_miss_total > 0) {
      guan_notes.push(`${guan_items.length} 条中有 ${guan_pack.guan_miss_total} 条缺少模型结果，已用本地规则兜底`);
    }
    return guan_pack;
  } catch (guan_err) {
    if (guan_items.length > 1) {
      const guan_mid = Math.ceil(guan_items.length / 2);
      console.warn(`[评论分析] ${guan_items.length} 条批量调用失败（${guan_err.message}），拆成两批重试`);
      guan_notes.push(`批量调用失败（${guan_err.message}），已自动拆分重试`);

      const guan_left = await guan_analyze_segment(guan_items.slice(0, guan_mid), guan_start_index, guan_notes);
      const guan_right = await guan_analyze_segment(guan_items.slice(guan_mid), guan_start_index + guan_mid, guan_notes);

      return {
        guan_output: guan_left.guan_output.concat(guan_right.guan_output),
        guan_miss_total: (guan_left.guan_miss_total || 0) + (guan_right.guan_miss_total || 0),
        guan_model: guan_left.guan_model || guan_right.guan_model,
        guan_usage: guan_sum_usage(
          guan_sum_usage({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, guan_left.guan_usage),
          guan_right.guan_usage
        ),
        guan_elapsed: (guan_left.guan_elapsed || 0) + (guan_right.guan_elapsed || 0)
      };
    }

    console.warn('[评论分析] 单条调用失败，改用本地规则：', guan_err.message);
    guan_notes.push(`有评论调用失败（${guan_err.message}），已用本地规则兜底`);
    const guan_item = guan_items[0];
    return {
      guan_output: [{ ...guan_rule_classify(guan_item.guan_content, guan_item.guan_rating), guan_miss: true }],
      guan_miss_total: 1,
      guan_model: '',
      guan_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      guan_elapsed: 0
    };
  }
}

/**
 * 分析全部评论
 * @param {Array<{guan_content: string, guan_rating?: string}>} guan_items
 * @returns {Promise<{guan_items: Array, guan_model: string, guan_usage: object, guan_elapsed: number, guan_note: string, guan_fallback: boolean}>}
 */
async function guan_analyze_reviews(guan_items) {
  const guan_output = [];
  let guan_usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let guan_elapsed = 0;
  let guan_model = '';
  let guan_miss_total = 0;
  const guan_notes = [];

  for (let guan_start = 0; guan_start < guan_items.length; guan_start += guan_batch_size) {
    const guan_batch = guan_items.slice(guan_start, guan_start + guan_batch_size);
    console.log(`\n[评论分析] 第 ${Math.floor(guan_start / guan_batch_size) + 1} 批，共 ${guan_batch.length} 条`);

    const guan_pack = await guan_analyze_segment(guan_batch, guan_start, guan_notes);
    guan_output.push(...guan_pack.guan_output);
    guan_usage = guan_sum_usage(guan_usage, guan_pack.guan_usage);
    guan_elapsed += guan_pack.guan_elapsed || 0;
    guan_model = guan_pack.guan_model || guan_model;
    guan_miss_total += guan_pack.guan_miss_total || 0;
  }

  return {
    guan_items: guan_output,
    guan_model,
    guan_usage,
    guan_elapsed,
    guan_miss_total,
    guan_note: guan_notes.join('；'),
    guan_fallback: guan_output.length > 0 && guan_output.every((guan_row) => guan_row.guan_miss)
  };
}

/**
 * 挑选精选评论：按信息价值分排序，并保证三类都有代表
 * @param {Array} guan_rows 含 guan_label / guan_value 的评论数组
 * @param {number} guan_limit 精选条数
 */
function guan_pick_featured(guan_rows, guan_limit) {
  const guan_size = Number(guan_limit) > 0 ? Number(guan_limit) : 6;
  const guan_sorted = guan_rows.slice().sort((guan_a, guan_b) => (guan_b.guan_value || 0) - (guan_a.guan_value || 0));
  const guan_picked = [];
  const guan_used = new Set();
  const guan_cap = Math.max(1, Math.ceil(guan_size / guan_labels.length));
  const guan_count = { good: 0, neutral: 0, bad: 0 };

  // 第一轮：按价值分挑选，但每类最多 guan_cap 条，保证精选覆盖三种情绪
  guan_sorted.forEach((guan_row) => {
    const guan_label = guan_row.guan_label;
    if (guan_picked.length >= guan_size || guan_used.has(guan_row.guan_index)) {
      return;
    }
    if ((guan_count[guan_label] || 0) >= guan_cap) {
      return;
    }
    guan_picked.push(guan_row);
    guan_used.add(guan_row.guan_index);
    guan_count[guan_label] = (guan_count[guan_label] || 0) + 1;
  });

  // 第二轮：名额未满时按价值分补足
  guan_sorted.forEach((guan_row) => {
    if (guan_picked.length >= guan_size || guan_used.has(guan_row.guan_index)) {
      return;
    }
    guan_picked.push(guan_row);
    guan_used.add(guan_row.guan_index);
  });

  return guan_picked;
}

module.exports = {
  guan_labels,
  guan_label_names,
  guan_analyze_reviews,
  guan_pick_featured,
  guan_rule_classify,
  guan_normalize_label
};
