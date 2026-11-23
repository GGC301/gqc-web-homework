/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：手写 multipart/form-data 解析器（不依赖第三方上传中间件），
 *      用于知识库文件上传接口，从原始 Buffer 中拆出字段与文件。
 */

/** 从 Content-Type 中取出 boundary */
function guan_get_boundary(guan_content_type) {
  const guan_type = String(guan_content_type || '');
  const guan_match = guan_type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!guan_match) {
    return '';
  }
  return guan_match[1] || guan_match[2] || '';
}

/** 解析单段头部（Content-Disposition / Content-Type） */
function guan_parse_headers(guan_header_text) {
  const guan_headers = {};
  guan_header_text.split('\r\n').forEach((guan_line) => {
    const guan_pos = guan_line.indexOf(':');
    if (guan_pos > 0) {
      guan_headers[guan_line.slice(0, guan_pos).trim().toLowerCase()] = guan_line.slice(guan_pos + 1).trim();
    }
  });

  const guan_result = { guan_name: '', guan_filename: '', guan_mime: guan_headers['content-type'] || '' };
  const guan_disposition = guan_headers['content-disposition'] || '';

  const guan_name_match = guan_disposition.match(/\bname="([^"]*)"/i);
  if (guan_name_match) {
    guan_result.guan_name = guan_name_match[1];
  }

  // 兼容 filename*=UTF-8''xxx 与普通 filename="xxx"
  const guan_filename_star = guan_disposition.match(/filename\*=(?:UTF-8|utf-8)''([^;\r\n]+)/i);
  const guan_filename_match = guan_disposition.match(/\bfilename="([^"]*)"/i);
  if (guan_filename_star) {
    try {
      guan_result.guan_filename = decodeURIComponent(guan_filename_star[1]);
    } catch (guan_err) {
      guan_result.guan_filename = guan_filename_star[1];
    }
  } else if (guan_filename_match) {
    guan_result.guan_filename = guan_filename_match[1];
  }

  return guan_result;
}

/**
 * 解析 multipart 请求体
 * @param {Buffer} guan_buffer 原始请求体
 * @param {string} guan_content_type 请求头 Content-Type
 * @returns {Array<{guan_name: string, guan_filename: string, guan_mime: string, guan_data: Buffer}>}
 */
function guan_parse_multipart(guan_buffer, guan_content_type) {
  const guan_boundary = guan_get_boundary(guan_content_type);
  if (!guan_boundary) {
    throw new Error('缺少 multipart boundary，请求格式不正确');
  }
  if (!Buffer.isBuffer(guan_buffer) || guan_buffer.length === 0) {
    throw new Error('请求体为空，未收到文件内容');
  }

  const guan_delimiter = Buffer.from('--' + guan_boundary);
  const guan_crlf2 = Buffer.from('\r\n\r\n');
  const guan_parts = [];
  let guan_cursor = 0;

  while (guan_cursor < guan_buffer.length) {
    const guan_start = guan_buffer.indexOf(guan_delimiter, guan_cursor);
    if (guan_start < 0) {
      break;
    }

    let guan_pos = guan_start + guan_delimiter.length;
    // 结束标记 --boundary--
    if (guan_buffer[guan_pos] === 0x2d && guan_buffer[guan_pos + 1] === 0x2d) {
      break;
    }
    if (guan_buffer[guan_pos] === 0x0d && guan_buffer[guan_pos + 1] === 0x0a) {
      guan_pos += 2;
    }

    const guan_head_end = guan_buffer.indexOf(guan_crlf2, guan_pos);
    if (guan_head_end < 0) {
      break;
    }
    const guan_head_text = guan_buffer.slice(guan_pos, guan_head_end).toString('utf8');
    const guan_body_start = guan_head_end + guan_crlf2.length;

    const guan_next = guan_buffer.indexOf(guan_delimiter, guan_body_start);
    if (guan_next < 0) {
      break;
    }

    let guan_body_end = guan_next;
    if (guan_buffer[guan_body_end - 2] === 0x0d && guan_buffer[guan_body_end - 1] === 0x0a) {
      guan_body_end -= 2;
    }

    const guan_meta = guan_parse_headers(guan_head_text);
    guan_parts.push({
      guan_name: guan_meta.guan_name,
      guan_filename: guan_meta.guan_filename,
      guan_mime: guan_meta.guan_mime,
      guan_data: guan_buffer.slice(guan_body_start, guan_body_end)
    });

    guan_cursor = guan_next;
  }

  if (guan_parts.length === 0) {
    throw new Error('未能解析出任何表单内容，请检查请求格式');
  }
  return guan_parts;
}

module.exports = { guan_parse_multipart };
