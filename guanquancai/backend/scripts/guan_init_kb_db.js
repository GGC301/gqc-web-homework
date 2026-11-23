/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：知识库（RAG）初始化脚本：建表 + 8 篇示例文档 + 每篇的切分片段 + 示例会话与消息，
 *      并对未向量化的片段调用硅基流动向量模型补录向量（失败不影响建库）。
 * 执行：npm run initkb
 */
const guan_env = require('../config/guan_env');
const guan_kb_model = require('../models/guan_kb_model');
const guan_splitter = require('../utils/guan_splitter');
const guan_llm = require('../services/guan_llm_service');

// 8 篇有真实业务意义的示例文档（模拟「专属自动客服」知识库）
const guan_seed_documents = [
  {
    guan_name: '售后服务政策.txt',
    guan_type: 'txt',
    guan_content: [
      '关泉才全栈作品站售后服务政策（2026 版）',
      '',
      '一、七天无理由退换',
      '自签收之日起 7 个自然日内，商品保持完好、配件与赠品齐全的，可申请无理由退换；定制类与促销清仓商品除外。',
      '',
      '二、质量问题处理',
      '签收后 15 日内出现非人为损坏的质量问题，可免费维修、换新或全额退款；超过 15 日按整机一年保修政策执行。',
      '',
      '三、退款时效',
      '审核通过后 1 个工作日内原路退回，银行卡到账时间为 1-3 个工作日，第三方支付平台为即时到账。',
      '',
      '四、客服渠道',
      '在线客服工作时间 09:00-21:00；紧急问题可拨打 400-800-8301 转 3，节假日不休。'
    ].join('\n')
  },
  {
    guan_name: '配送与物流说明.txt',
    guan_type: 'txt',
    guan_content: [
      '配送与物流说明',
      '',
      '发货时效：现货商品在付款后 24 小时内发出，预售商品以下单页面标注的发货日期为准。',
      '配送范围：全国大陆地区包邮（新疆、西藏、内蒙古部分地区加收 12 元运费）；港澳台及海外暂不支持。',
      '物流查询：订单详情页可查看实时物流轨迹，物流信息一般在下单后 12 小时内更新。',
      '签收提醒：贵重商品需本人持有效身份证件签收；如发现外包装破损，请当场拍照并拒收。',
      '异常处理：超过 72 小时无物流更新，可在订单页发起「物流催单」，客服将在 4 小时内跟进。'
    ].join('\n')
  },
  {
    guan_name: '会员与积分规则.md',
    guan_type: 'md',
    guan_content: [
      '# 会员与积分规则',
      '',
      '## 会员等级',
      '- 普通会员：注册即可获得，享受积分累计。',
      '- 银卡会员：累计消费满 1000 元，积分 1.2 倍。',
      '- 金卡会员：累计消费满 5000 元，积分 1.5 倍，享受专属客服。',
      '',
      '## 积分获取与使用',
      '消费 1 元累计 1 积分；评价晒单额外 +20 积分；积分有效期为获得之日起 12 个月。',
      '100 积分可抵扣 1 元，单笔订单最多抵扣订单金额的 20%。',
      '',
      '## 权益变更',
      '等级每月 1 日复算，降级后已发放的优惠券仍可使用至有效期结束。'
    ].join('\n')
  },
  {
    guan_name: '知识库使用说明.md',
    guan_type: 'md',
    guan_content: [
      '# 知识库使用说明',
      '',
      '## 支持的格式',
      'TXT、MD、CSV、JSON、LOG、HTML、PDF，单个文件不超过 10 MB。',
      '',
      '## 处理流程',
      '1. 上传后在服务端完成文本解析与格式校验；',
      '2. 按 480 字切分、80 字重叠生成片段；',
      '3. 调用 BAAI/bge-m3 向量模型，将片段转为 1024 维向量入库；',
      '4. 提问时先检索 Top-K 片段，再拼装提示词交给大模型作答。',
      '',
      '## 使用建议',
      '文档标题写清主题；避免上传扫描版 PDF；同一文件重复上传会被哈希校验拦截。'
    ].join('\n')
  },
  {
    guan_name: '常见问题FAQ.txt',
    guan_type: 'txt',
    guan_content: [
      '常见问题 FAQ',
      '',
      'Q1：订单多久发货？  A：现货 24 小时内发出，预售以页面标注为准。',
      'Q2：可以修改收货地址吗？  A：未发货可在订单详情页自助修改，已发货需联系客服拦截。',
      'Q3：发票如何开具？  A：下单时填写抬头与税号，电子发票在确认收货后 48 小时内发送至邮箱。',
      'Q4：忘记密码怎么办？  A：登录页点击「忘记密码」，通过手机号验证码重置。',
      'Q5：知识库问答答不上来怎么办？  A：请先在知识库管理页上传相关文档，再重新提问。',
      'Q6：服务端密钥会暴露吗？  A：不会。密钥只保存在后端 .env，前端只与 /api 接口通信。'
    ].join('\n')
  },
  {
    guan_name: '账号与登录安全.txt',
    guan_type: 'txt',
    guan_content: [
      '账号与登录安全',
      '',
      '密码要求：长度不少于 8 位，需同时包含字母与数字；建议每 90 天更换一次。',
      '登录保护：连续 5 次密码错误将锁定 15 分钟；异地登录需短信二次验证。',
      '设备管理：可在「账号安全」页面查看最近登录设备，并可一键下线其它设备。',
      '注销账号：提交注销申请后 7 天内可撤回，超期将清除个人数据且不可恢复。'
    ].join('\n')
  },
  {
    guan_name: '技术栈与接口规范.md',
    guan_type: 'md',
    guan_content: [
      '# 技术栈与接口规范',
      '',
      '## 技术栈',
      '- 前端：原生 HTML / CSS / JavaScript，禁止第三方库与 CDN；',
      '- 后端：Node.js 24 + Express 5，RESTful + MVC 分层；',
      '- 数据库：SQLite（Node.js 内置 node:sqlite）；',
      '- 模型：硅基流动 deepseek-ai/DeepSeek-V4-Flash（对话）与 BAAI/bge-m3（向量）。',
      '',
      '## 接口规范',
      '所有接口以 /api 为前缀，统一返回 { code, msg, data }；code 为 0 表示成功。',
      '服务端口固定 8301，前端页面由 express.static 托管。',
      '密钥只存放在 backend/.env，前端通过 /api/ai/rag-chat 间接调用模型。'
    ].join('\n')
  },
  {
    guan_name: '隐私与数据安全说明.txt',
    guan_type: 'txt',
    guan_content: [
      '隐私与数据安全说明',
      '',
      '收集范围：仅收集完成问答所必需的问题文本与上传文档内容。',
      '存储位置：文档、片段与会话记录保存在本机 SQLite 数据库，不自动上传第三方。',
      '调用说明：生成回答时，检索到的片段会发送给大模型服务商用于推理，不用于训练。',
      '删除机制：删除文档时，其全部片段向量一并删除；会话可在问答页一键清空。',
      '密钥管理：API Key 仅存于后端 .env 且已加入 .gitignore，前端代码与提交记录中不含密钥。'
    ].join('\n')
  }
];

// 8 个示例会话
const guan_seed_sessions = [
  '售后政策咨询', '退换货流程', '会员积分怎么用', '发票与配送问题',
  '知识库怎么上传文档', '接口与端口说明', '隐私数据如何存储', '模型与向量选型'
];

// 第 1 个会话的 8 条示例消息（4 轮问答）
const guan_seed_messages = [
  ['user', '售后可以几天无理由退换？', '', 0],
  ['assistant', '签收之日起 7 个自然日内可申请无理由退换，需保持商品完好、配件与赠品齐全；定制类与促销清仓商品除外。[1]', '[]', 0],
  ['user', '质量问题怎么处理？', '', 0],
  ['assistant', '签收后 15 日内出现非人为损坏的质量问题，可免费维修、换新或全额退款；超过 15 日按整机一年保修执行。[1]', '[]', 0],
  ['user', '退款多久到账？', '', 0],
  ['assistant', '审核通过后 1 个工作日内原路退回，银行卡一般 1-3 个工作日到账，第三方支付平台即时到账。[1]', '[]', 0],
  ['user', '客服电话是多少？', '', 0],
  ['assistant', '在线客服工作时间 09:00-21:00；紧急问题可拨打 400-800-8301 转 3，节假日不休。[1]', '[]', 0]
];

/** 幂等写入示例文档与片段 */
function guan_seed_documents_to_db() {
  const guan_exist = guan_kb_model.guan_list_documents();
  if (guan_exist.length > 0) {
    console.log(`[guanquancai] 知识库已有 ${guan_exist.length} 个文档，跳过示例文档写入`);
    return 0;
  }

  let guan_total = 0;
  guan_seed_documents.forEach((guan_doc) => {
    const guan_chunks = guan_splitter.guan_split_text(guan_doc.guan_content);
    const guan_doc_id = guan_kb_model.guan_insert_document({
      guan_name: guan_doc.guan_name,
      guan_type: guan_doc.guan_type,
      guan_size: Buffer.byteLength(guan_doc.guan_content, 'utf8'),
      guan_chars: guan_doc.guan_content.length,
      guan_chunk_total: guan_chunks.length,
      guan_embed_total: 0,
      guan_status: 'parsed',
      guan_note: '初始化脚本写入的示例文档',
      guan_hash: `seed-${guan_doc.guan_name}`
    });
    guan_kb_model.guan_insert_chunks(guan_doc_id, guan_chunks, []);
    guan_total += guan_chunks.length;
  });
  console.log(`[guanquancai] 已写入示例文档 ${guan_seed_documents.length} 篇，片段 ${guan_total} 个`);
  return guan_total;
}

/** 幂等写入示例会话与消息 */
function guan_seed_chats_to_db() {
  const guan_ids = guan_kb_model.guan_ensure_session_list(guan_seed_sessions);
  const guan_session_id = guan_ids[0];
  const guan_messages = guan_kb_model.guan_list_messages(guan_session_id, 100);
  if (guan_messages.length === 0) {
    guan_seed_messages.forEach((guan_row) => {
      guan_kb_model.guan_save_message(guan_session_id, guan_row[0], guan_row[1], guan_row[2], guan_row[3]);
    });
    console.log(`[guanquancai] 已写入示例会话 ${guan_ids.length} 个、示例消息 ${guan_seed_messages.length} 条`);
  }
  return guan_session_id;
}

/** 为未向量化的片段补录向量（失败只告警，不阻断初始化） */
async function guan_embed_pending_chunks() {
  const guan_pending = guan_kb_model.guan_list_chunks_without_embed();
  if (guan_pending.length === 0) {
    console.log('[guanquancai] 全部片段已有向量，无需补录');
    return 0;
  }
  if (!guan_llm.guan_is_configured()) {
    console.warn('[guanquancai] 未配置 LLM_API_KEY，跳过向量补录（问答将退化为关键词检索）');
    return 0;
  }

  console.log(`[guanquancai] 开始为 ${guan_pending.length} 个片段补录向量（模型：${guan_env.guan_llm_embed_model}）`);
  try {
    const guan_vectors = await guan_llm.guan_embed(guan_pending.map((guan_row) => guan_row.guan_content));
    let guan_done = 0;
    guan_pending.forEach((guan_row, guan_i) => {
      if (guan_vectors[guan_i]) {
        guan_kb_model.guan_set_chunk_embedding(guan_row.guan_id, guan_vectors[guan_i]);
        guan_done += 1;
      }
    });
    // 同步文档的向量计数与状态
    guan_kb_model.guan_list_documents().forEach((guan_doc) => {
      const guan_chunks = guan_kb_model.guan_list_chunks(guan_doc.guan_id);
      guan_kb_model.guan_update_document_index(guan_doc.guan_id, guan_chunks.length, 'indexed');
    });
    console.log(`[guanquancai] 向量补录完成：${guan_done} 个片段`);
    return guan_done;
  } catch (guan_err) {
    console.warn('[guanquancai] 向量补录失败（问答将退化为关键词检索）：', guan_err.message);
    return 0;
  }
}

/** 主流程 */
async function guan_init_kb_database() {
  guan_kb_model.guan_ensure_schema();
  guan_seed_documents_to_db();
  guan_seed_chats_to_db();
  await guan_embed_pending_chunks();
  const guan_stats = guan_kb_model.guan_get_stats();
  console.log('[guanquancai] 知识库初始化完成：', JSON.stringify(guan_stats));
}

if (require.main === module) {
  guan_init_kb_database().catch((guan_err) => {
    console.error('[guanquancai] 知识库初始化失败：', guan_err.message);
    process.exit(1);
  });
}

module.exports = { guan_init_kb_database };
