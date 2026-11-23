/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：知识库文档文本解析器。支持 TXT / MD / CSV / JSON / LOG / HTML / PDF，
 *      全部使用 Node.js 内置模块（zlib）实现，不依赖第三方解析库。
 */
const path = require('node:path');
const zlib = require('node:zlib');

/** 支持的扩展名（前端提示与此保持一致） */
const guan_supported_ext = ['txt', 'md', 'markdown', 'csv', 'json', 'log', 'html', 'htm', 'pdf'];

/** 取小写扩展名，不带点 */
function guan_ext_of(guan_filename) {
  return path.extname(String(guan_filename || '')).replace('.', '').toLowerCase();
}

/** HTML 实体还原 */
function guan_decode_entities(guan_text) {
  return guan_text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** HTML → 纯文本 */
function guan_html_to_text(guan_html) {
  return guan_decode_entities(
    String(guan_html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(p|div|section|article|li|tr|h[1-6]|br)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

/** PDF 文本字符串解码（支持 UTF-16BE BOM 与常见转义） */
function guan_decode_pdf_string(guan_raw) {
  const guan_inner = guan_raw.slice(1, -1);
  // PDF 中的中文常用 UTF-16BE（以 FE FF 开头），latin1 读入后需按字节还原
  if (guan_inner.charCodeAt(0) === 0xfe && guan_inner.charCodeAt(1) === 0xff) {
    let guan_out = '';
    for (let guan_k = 2; guan_k + 1 < guan_inner.length; guan_k += 2) {
      guan_out += String.fromCharCode((guan_inner.charCodeAt(guan_k) << 8) | guan_inner.charCodeAt(guan_k + 1));
    }
    return guan_out;
  }
  let guan_text = '';
  for (let guan_i = 0; guan_i < guan_inner.length; guan_i += 1) {
    const guan_ch = guan_inner[guan_i];
    if (guan_ch !== '\\') {
      guan_text += guan_ch;
      continue;
    }
    const guan_next = guan_inner[guan_i + 1];
    if (guan_next === undefined) {
      break;
    }
    guan_i += 1;
    if (guan_next === 'n') guan_text += '\n';
    else if (guan_next === 'r') guan_text += '\r';
    else if (guan_next === 't') guan_text += '\t';
    else if (guan_next === '(') guan_text += '(';
    else if (guan_next === ')') guan_text += ')';
    else if (guan_next === '\\') guan_text += '\\';
    else if (/[0-7]/.test(guan_next)) {
      let guan_oct = guan_next;
      while (guan_oct.length < 3 && /[0-7]/.test(guan_inner[guan_i + 1] || '')) {
        guan_i += 1;
        guan_oct += guan_inner[guan_i];
      }
      guan_text += String.fromCharCode(parseInt(guan_oct, 8));
    } else {
      guan_text += guan_next;
    }
  }
  return guan_text;
}

/** 从 PDF 内容流中提取文本（仅处理文本操作符 Tj / TJ / ' / "） */
function guan_pdf_stream_to_text(guan_content) {
  const guan_rows = [];
  let guan_line = '';
  const guan_ops = guan_content.split(/\r?\n/);

  guan_ops.forEach((guan_op) => {
    const guan_is_move = /(Td|TD|T\*|Tm|BT|ET)\s*$/.test(guan_op.trim()) || /\bTd\b|\bTD\b|\bT\*/.test(guan_op);
    const guan_strings = guan_op.match(/\((?:\\.|[^\\()])*\)/g) || [];

    if (guan_strings.length > 0 && /\bTj\b|\bTJ\b|'|"/.test(guan_op)) {
      guan_strings.forEach((guan_str) => {
        const guan_text = guan_decode_pdf_string(guan_str);
        if (guan_text.trim()) {
          guan_line += guan_text;
        }
      });
    }

    if (guan_is_move && guan_line.trim()) {
      guan_rows.push(guan_line.trim());
      guan_line = '';
    }
  });

  if (guan_line.trim()) {
    guan_rows.push(guan_line.trim());
  }
  return guan_rows.join('\n');
}

/** PDF → 纯文本：遍历 stream 对象并解压 FlateDecode 内容 */
function guan_pdf_to_text(guan_buffer) {
  const guan_marker = Buffer.from('stream');
  const guan_end_marker = Buffer.from('endstream');
  const guan_collected = [];
  let guan_pos = 0;

  while (guan_pos < guan_buffer.length) {
    const guan_start = guan_buffer.indexOf(guan_marker, guan_pos);
    if (guan_start < 0) {
      break;
    }
    let guan_data_start = guan_start + guan_marker.length;
    if (guan_buffer[guan_data_start] === 0x0d) guan_data_start += 1;
    if (guan_buffer[guan_data_start] === 0x0a) guan_data_start += 1;

    const guan_end = guan_buffer.indexOf(guan_end_marker, guan_data_start);
    if (guan_end < 0) {
      break;
    }

    const guan_chunk = guan_buffer.slice(guan_data_start, guan_end);
    guan_pos = guan_end + guan_end_marker.length;

    let guan_content = '';
    try {
      guan_content = zlib.inflateSync(guan_chunk).toString('latin1');
    } catch (guan_err) {
      guan_content = guan_chunk.toString('latin1');
    }

    if (/\bBT\b/.test(guan_content) && /\bET\b/.test(guan_content)) {
      const guan_text = guan_pdf_stream_to_text(guan_content);
      if (guan_text) {
        guan_collected.push(guan_text);
      }
    }
  }

  return guan_collected.join('\n');
}

/** 文本清洗：统一换行、去控制字符、压缩空白 */
function guan_clean_text(guan_text) {
  return String(guan_text)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 判断文本有效字符比例，用于识别解析失败（如扫描版 PDF） */
function guan_text_quality(guan_text) {
  const guan_clean = String(guan_text).replace(/\s/g, '');
  if (!guan_clean) {
    return 0;
  }
  const guan_valid = guan_clean.replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！？、；："'（）《》【】,.!?;:()\-]/g, '');
  return guan_valid.length / guan_clean.length;
}

/**
 * 解析上传文件为纯文本
 * @param {Buffer} guan_buffer 文件二进制
 * @param {string} guan_filename 原始文件名
 * @returns {{ guan_text: string, guan_type: string, guan_warning: string }}
 */
function guan_parse_document(guan_buffer, guan_filename) {
  if (!Buffer.isBuffer(guan_buffer) || guan_buffer.length === 0) {
    throw new Error('文件内容为空');
  }

  const guan_type = guan_ext_of(guan_filename);
  if (!guan_supported_ext.includes(guan_type)) {
    throw new Error(`不支持的文件格式：.${guan_type || '未知'}，请上传 ${guan_supported_ext.map((guan_e) => '.' + guan_e).join(' / ')}`);
  }

  let guan_text = '';
  let guan_warning = '';

  if (guan_type === 'pdf') {
    guan_text = guan_pdf_to_text(guan_buffer);
    guan_warning = 'PDF 仅提取文本层，扫描件或加密文件可能无法解析';
  } else if (guan_type === 'html' || guan_type === 'htm') {
    guan_text = guan_html_to_text(guan_buffer.toString('utf8'));
  } else {
    guan_text = guan_buffer.toString('utf8').replace(/^\uFEFF/, '');
  }

  guan_text = guan_clean_text(guan_text);

  if (!guan_text) {
    throw new Error('未解析到任何文本内容（PDF 可能是扫描件，请改用 TXT 或可复制文本的 PDF）');
  }

  const guan_quality = guan_text_quality(guan_text);
  if (guan_quality < 0.35) {
    throw new Error('解析出的文本存在大量乱码，可能是扫描件或特殊编码文件，请另存为 TXT/MD 后重新上传');
  }

  return { guan_text, guan_type, guan_warning };
}

module.exports = {
  guan_supported_ext,
  guan_ext_of,
  guan_parse_document,
  guan_clean_text,
  guan_text_quality
};
