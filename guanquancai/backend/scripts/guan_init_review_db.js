/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-16 | 大模型：deepseek-v4.1-flash
 * 说明：商业评论分析表初始化脚本 —— 幂等建表并写入 8 条有真实业务意义的测试数据
 *      （一个已完成的点评批次：拾光咖啡 8 条评论，含好评 / 中评 / 差评与精选标记）。
 *      执行：npm run initreview
 */
const guan_review_model = require('../models/guan_review_model');

const guan_seed_filename = '门店评论示例-拾光咖啡.xlsx';

/** 8 条测试评论（业务字段完整：昵称、星级、时间、内容、分类、分数、价值分、理由、标签） */
const guan_seed_items = [
  {
    guan_author: '林小满',
    guan_rating: '5',
    guan_time: '2026-11-01 09:12',
    guan_content: '手冲耶加雪菲香气很足，入口有柑橘的明亮酸感，店员主动介绍了豆子的产地和处理法。',
    guan_label: 'good',
    guan_score: 92,
    guan_value: 78,
    guan_reason: '明确肯定风味与店员专业介绍',
    guan_tags: '口味、服务',
    guan_featured: 1
  },
  {
    guan_author: '周予安',
    guan_rating: '5',
    guan_time: '2026-11-01 10:35',
    guan_content: '工作日七点半就开门，拿铁 22 元用料扎实，赶地铁前买一杯刚好，出杯速度快。',
    guan_label: 'good',
    guan_score: 88,
    guan_value: 71,
    guan_reason: '肯定营业时间、价格与出杯速度',
    guan_tags: '价格、效率',
    guan_featured: 1
  },
  {
    guan_author: '苏晚',
    guan_rating: '3',
    guan_time: '2026-11-02 16:48',
    guan_content: '味道中规中矩，美式偏淡，价格在这条街上算偏高的，偶尔来一次可以。',
    guan_label: 'neutral',
    guan_score: 55,
    guan_value: 62,
    guan_reason: '褒贬参半，指出美式偏淡与价格偏高',
    guan_tags: '口味、价格',
    guan_featured: 1
  },
  {
    guan_author: '郑柏川',
    guan_rating: '2',
    guan_time: '2026-11-03 08:55',
    guan_content: '连续两次都做错单，一次加了糖浆一次忘了去冰，跟店员说明后才重做，耽误了二十分钟。',
    guan_label: 'bad',
    guan_score: 22,
    guan_value: 84,
    guan_reason: '连续做错单且耽误时间，问题具体可改进',
    guan_tags: '出品、效率',
    guan_featured: 1
  },
  {
    guan_author: '陈嘉树',
    guan_rating: '1',
    guan_time: '2026-11-03 15:10',
    guan_content: '等单等了 25 分钟，最后发现我的杯子被给错了人，店员没有道歉，不会再来了。',
    guan_label: 'bad',
    guan_score: 8,
    guan_value: 80,
    guan_reason: '等单过久、给错单且未道歉，明确流失',
    guan_tags: '服务、效率',
    guan_featured: 0
  },
  {
    guan_author: '赵星野',
    guan_rating: '3',
    guan_time: '2026-11-05 13:15',
    guan_content: '店内没有卫生间，要去隔壁商场，带小孩来不太方便；咖啡本身没什么问题。',
    guan_label: 'neutral',
    guan_score: 58,
    guan_value: 66,
    guan_reason: '设施不足影响体验，咖啡本身无异议',
    guan_tags: '设施、环境',
    guan_featured: 0
  },
  {
    guan_author: '沈墨',
    guan_rating: '1',
    guan_time: '2026-11-08 12:10',
    guan_content: '喝到杯底有异物，找店员反映只是换了一杯，没有解释原因也没有任何补偿。',
    guan_label: 'bad',
    guan_score: 5,
    guan_value: 90,
    guan_reason: '食品安全问题且处理敷衍，价值高',
    guan_tags: '食品安全、售后',
    guan_featured: 1
  },
  {
    guan_author: '韩青禾',
    guan_rating: '4',
    guan_time: '2026-11-08 20:05',
    guan_content: '冷萃很顺口，冰块是手凿的，融化慢不冲淡味道；缺点是晚上九点就打烊。',
    guan_label: 'good',
    guan_score: 76,
    guan_value: 68,
    guan_reason: '肯定冷萃口感，仅对营业时间有建议',
    guan_tags: '口味、营业时间',
    guan_featured: 0
  }
];

function guan_main() {
  guan_review_model.guan_ensure_schema();
  console.log('[评论初始化] 表结构已就绪：guan_review_batch / guan_review_item');

  // 幂等：先清掉同名示例批次，避免重复执行产生脏数据
  const guan_exists = guan_review_model.guan_list_batches(200)
    .filter((guan_row) => guan_row.guan_filename === guan_seed_filename);
  guan_exists.forEach((guan_row) => {
    guan_review_model.guan_delete_batch(guan_row.guan_id);
    console.log(`[评论初始化] 已清理旧的示例批次：${guan_row.guan_id}`);
  });

  const guan_good = guan_seed_items.filter((guan_item) => guan_item.guan_label === 'good').length;
  const guan_neutral = guan_seed_items.filter((guan_item) => guan_item.guan_label === 'neutral').length;
  const guan_bad = guan_seed_items.filter((guan_item) => guan_item.guan_label === 'bad').length;
  const guan_avg = Number((guan_seed_items.reduce((guan_sum, guan_item) => guan_sum + guan_item.guan_score, 0) / guan_seed_items.length).toFixed(1));

  const guan_batch_id = guan_review_model.guan_insert_batch({
    guan_filename: guan_seed_filename,
    guan_sheet: 'sheet1.xml',
    guan_total: guan_seed_items.length,
    guan_good,
    guan_neutral,
    guan_bad,
    guan_avg_score: guan_avg,
    guan_featured_total: guan_seed_items.filter((guan_item) => guan_item.guan_featured).length,
    guan_status: 'done',
    guan_note: '初始化测试数据（未调用大模型）',
    guan_model: 'deepseek-ai/DeepSeek-V4-Flash',
    guan_usage: JSON.stringify({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }),
    guan_elapsed: 0
  });

  guan_review_model.guan_insert_items(guan_batch_id, guan_seed_items.map((guan_item, guan_index) => ({
    ...guan_item,
    guan_index: guan_index + 1
  })));

  console.log(`[评论初始化] 已写入批次 ${guan_batch_id}：${guan_seed_items.length} 条评论（好评 ${guan_good} / 中评 ${guan_neutral} / 差评 ${guan_bad}）`);
  console.log('[评论初始化] 完成');
}

guan_main();
