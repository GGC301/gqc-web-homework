/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-16 | 大模型：deepseek-v4.1-flash
 * 说明：手写 Excel（.xlsx）读写工具，仅依赖 Node.js 内置 zlib。
 *      - 读取：按 ZIP 中央目录解出 xl/worksheets/sheetN.xml 与 sharedStrings.xml，
 *        再把 A1 单元格还原为二维数组（兼容共享字符串、内联字符串与数字）。
 *      - 写出：拼装最小可用的 OOXML 包（[Content_Types].xml + workbook + worksheet + styles），
 *        采用 deflateRaw 压缩与 CRC32 校验，生成的 .xlsx 可被 Excel / WPS 正常打开。
 */

const zlib = require('node:zlib');

/* ================= CRC32 ================= */
const guan_crc_table = (function () {
  const guan_table = new Int32Array(256);
  for (let guan_i = 0; guan_i < 256; guan_i += 1) {
    let guan_c = guan_i;
    for (let guan_k = 0; guan_k < 8; guan_k += 1) {
      guan_c = guan_c & 1 ? 0xedb88320 ^ (guan_c >>> 1) : guan_c >>> 1;
    }
    guan_table[guan_i] = guan_c;
  }
  return guan_table;
})();

function guan_crc32(guan_buffer) {
  let guan_crc = -1;
  for (let guan_i = 0; guan_i < guan_buffer.length; guan_i += 1) {
    guan_crc = guan_crc_table[(guan_crc ^ guan_buffer[guan_i]) & 0xff] ^ (guan_crc >>> 8);
  }
  return (guan_crc ^ -1) >>> 0;
}

/* ================= XML 文本处理 ================= */
function guan_decode_xml(guan_text) {
  return String(guan_text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (guan_all, guan_code) => String.fromCharCode(Number(guan_code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (guan_all, guan_code) => String.fromCharCode(parseInt(guan_code, 16)))
    .replace(/&amp;/g, '&');
}

function guan_escape_xml(guan_text) {
  return String(guan_text == null ? '' : guan_text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

/** 列号字母 → 0 基下标（A→0，AA→26） */
function guan_col_index(guan_letters) {
  let guan_result = 0;
  const guan_upper = String(guan_letters || '').toUpperCase();
  for (let guan_i = 0; guan_i < guan_upper.length; guan_i += 1) {
    guan_result = guan_result * 26 + (guan_upper.charCodeAt(guan_i) - 64);
  }
  return guan_result - 1;
}

/** 0 基下标 → 列号字母 */
function guan_col_letters(guan_index) {
  let guan_num = guan_index + 1;
  let guan_text = '';
  while (guan_num > 0) {
    const guan_mod = (guan_num - 1) % 26;
    guan_text = String.fromCharCode(65 + guan_mod) + guan_text;
    guan_num = Math.floor((guan_num - 1) / 26);
  }
  return guan_text;
}

/* ================= ZIP 读取 ================= */
/** 从 xlsx（ZIP）中取出指定文件的原始内容 */
function guan_unzip(guan_buffer) {
  const guan_files = {};
  const guan_eocd_sig = 0x06054b50;
  let guan_eocd = -1;

  for (let guan_i = guan_buffer.length - 22; guan_i >= 0 && guan_i >= guan_buffer.length - 66560; guan_i -= 1) {
    if (guan_buffer.readUInt32LE(guan_i) === guan_eocd_sig) {
      guan_eocd = guan_i;
      break;
    }
  }
  if (guan_eocd < 0) {
    throw new Error('不是合法的 Excel 文件（未找到 ZIP 结束标记），请上传 .xlsx 格式');
  }

  const guan_total = guan_buffer.readUInt16LE(guan_eocd + 10);
  let guan_ptr = guan_buffer.readUInt32LE(guan_eocd + 16);

  for (let guan_i = 0; guan_i < guan_total; guan_i += 1) {
    if (guan_buffer.readUInt32LE(guan_ptr) !== 0x02014b50) {
      break;
    }
    const guan_method = guan_buffer.readUInt16LE(guan_ptr + 10);
    const guan_csize = guan_buffer.readUInt32LE(guan_ptr + 20);
    const guan_name_len = guan_buffer.readUInt16LE(guan_ptr + 28);
    const guan_extra_len = guan_buffer.readUInt16LE(guan_ptr + 30);
    const guan_comment_len = guan_buffer.readUInt16LE(guan_ptr + 32);
    const guan_local = guan_buffer.readUInt32LE(guan_ptr + 42);
    const guan_name = guan_buffer.slice(guan_ptr + 46, guan_ptr + 46 + guan_name_len).toString('utf8');

    const guan_local_name_len = guan_buffer.readUInt16LE(guan_local + 26);
    const guan_local_extra_len = guan_buffer.readUInt16LE(guan_local + 28);
    const guan_data_start = guan_local + 30 + guan_local_name_len + guan_local_extra_len;
    const guan_raw = guan_buffer.slice(guan_data_start, guan_data_start + guan_csize);

    try {
      guan_files[guan_name] = guan_method === 0 ? guan_raw : zlib.inflateRawSync(guan_raw);
    } catch (guan_err) {
      guan_files[guan_name] = null;
    }

    guan_ptr += 46 + guan_name_len + guan_extra_len + guan_comment_len;
  }

  return guan_files;
}

/* ================= 工作表解析 ================= */
function guan_parse_shared_strings(guan_xml) {
  const guan_list = [];
  const guan_re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let guan_match = guan_re.exec(guan_xml);
  while (guan_match) {
    const guan_parts = [];
    const guan_t_re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let guan_t = guan_t_re.exec(guan_match[1]);
    while (guan_t) {
      guan_parts.push(guan_t[1]);
      guan_t = guan_t_re.exec(guan_match[1]);
    }
    guan_list.push(guan_decode_xml(guan_parts.join('')));
    guan_match = guan_re.exec(guan_xml);
  }
  return guan_list;
}

function guan_parse_sheet_xml(guan_xml, guan_shared) {
  const guan_rows = [];
  const guan_row_re = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let guan_row_match = guan_row_re.exec(guan_xml);
  let guan_row_no = 0;

  while (guan_row_match) {
    const guan_row_attr = guan_row_match[0].match(/<row\b[^>]*\br="(\d+)"/);
    const guan_target = guan_row_attr ? Number(guan_row_attr[1]) - 1 : guan_row_no;
    const guan_cells = [];
    const guan_cell_re = /<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let guan_cell = guan_cell_re.exec(guan_row_match[1]);

    while (guan_cell) {
      const guan_attrs = guan_cell[1] || guan_cell[2] || '';
      const guan_body = guan_cell[3] || '';
      const guan_ref = guan_attrs.match(/\br="([A-Z]+)\d+"/i);
      const guan_type = guan_attrs.match(/\bt="([^"]+)"/);
      const guan_col = guan_ref ? guan_col_index(guan_ref[1]) : guan_cells.length;

      let guan_value = '';
      if (guan_type && guan_type[1] === 's') {
        const guan_v = guan_body.match(/<v>([\s\S]*?)<\/v>/);
        const guan_index = guan_v ? Number(guan_v[1]) : -1;
        guan_value = guan_shared[guan_index] != null ? guan_shared[guan_index] : '';
      } else if (guan_type && guan_type[1] === 'inlineStr') {
        const guan_parts = [];
        const guan_t_re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let guan_t = guan_t_re.exec(guan_body);
        while (guan_t) {
          guan_parts.push(guan_t[1]);
          guan_t = guan_t_re.exec(guan_body);
        }
        guan_value = guan_decode_xml(guan_parts.join(''));
      } else {
        const guan_v = guan_body.match(/<v>([\s\S]*?)<\/v>/);
        guan_value = guan_v ? guan_decode_xml(guan_v[1]) : '';
      }

      while (guan_cells.length < guan_col) {
        guan_cells.push('');
      }
      guan_cells[guan_col] = String(guan_value).trim();
      guan_cell = guan_cell_re.exec(guan_row_match[1]);
    }

    while (guan_rows.length < guan_target) {
      guan_rows.push([]);
    }
    guan_rows[guan_target] = guan_cells;
    guan_row_no = guan_target + 1;
    guan_row_match = guan_row_re.exec(guan_xml);
  }

  return guan_rows;
}

/**
 * 读取 Excel 第一张工作表
 * @param {Buffer} guan_buffer .xlsx 文件内容
 * @returns {{ guan_sheet: string, guan_rows: string[][] }}
 */
function guan_read_xlsx(guan_buffer) {
  if (!Buffer.isBuffer(guan_buffer) || guan_buffer.length === 0) {
    throw new Error('Excel 文件内容为空');
  }

  const guan_files = guan_unzip(guan_buffer);

  const guan_shared = guan_files['xl/sharedStrings.xml']
    ? guan_parse_shared_strings(guan_files['xl/sharedStrings.xml'].toString('utf8'))
    : [];

  const guan_sheet_names = Object.keys(guan_files)
    .filter((guan_name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(guan_name))
    .sort((guan_a, guan_b) => Number(guan_a.replace(/\D/g, '')) - Number(guan_b.replace(/\D/g, '')));

  if (guan_sheet_names.length === 0) {
    throw new Error('Excel 中没有找到工作表，请确认文件未损坏');
  }

  const guan_sheet_xml = guan_files[guan_sheet_names[0]].toString('utf8');
  const guan_rows = guan_parse_sheet_xml(guan_sheet_xml, guan_shared);

  // 去掉整行为空的行
  const guan_filtered = guan_rows.filter((guan_row) => guan_row.some((guan_cell) => String(guan_cell || '').trim() !== ''));

  return { guan_sheet: guan_sheet_names[0], guan_rows: guan_filtered };
}

/* ================= ZIP 写出 ================= */
function guan_zip(guan_entries) {
  const guan_local_parts = [];
  const guan_central_parts = [];
  let guan_offset = 0;

  guan_entries.forEach((guan_entry) => {
    const guan_name_buffer = Buffer.from(guan_entry.guan_name, 'utf8');
    const guan_data = Buffer.isBuffer(guan_entry.guan_data)
      ? guan_entry.guan_data
      : Buffer.from(String(guan_entry.guan_data), 'utf8');
    const guan_compressed = zlib.deflateRawSync(guan_data);
    const guan_crc = guan_crc32(guan_data);

    const guan_local = Buffer.alloc(30);
    guan_local.writeUInt32LE(0x04034b50, 0);
    guan_local.writeUInt16LE(20, 4);
    guan_local.writeUInt16LE(0x0800, 6);
    guan_local.writeUInt16LE(8, 8);
    guan_local.writeUInt16LE(0, 10);
    guan_local.writeUInt16LE(0x2821, 12);
    guan_local.writeUInt32LE(guan_crc, 14);
    guan_local.writeUInt32LE(guan_compressed.length, 18);
    guan_local.writeUInt32LE(guan_data.length, 22);
    guan_local.writeUInt16LE(guan_name_buffer.length, 26);
    guan_local.writeUInt16LE(0, 28);

    guan_local_parts.push(guan_local, guan_name_buffer, guan_compressed);

    const guan_central = Buffer.alloc(46);
    guan_central.writeUInt32LE(0x02014b50, 0);
    guan_central.writeUInt16LE(20, 4);
    guan_central.writeUInt16LE(20, 6);
    guan_central.writeUInt16LE(0x0800, 8);
    guan_central.writeUInt16LE(8, 10);
    guan_central.writeUInt16LE(0, 12);
    guan_central.writeUInt16LE(0x2821, 14);
    guan_central.writeUInt32LE(guan_crc, 16);
    guan_central.writeUInt32LE(guan_compressed.length, 20);
    guan_central.writeUInt32LE(guan_data.length, 24);
    guan_central.writeUInt16LE(guan_name_buffer.length, 28);
    guan_central.writeUInt32LE(guan_offset, 42);

    guan_central_parts.push(guan_central, guan_name_buffer);
    guan_offset += guan_local.length + guan_name_buffer.length + guan_compressed.length;
  });

  const guan_central_buffer = Buffer.concat(guan_central_parts);
  const guan_eocd = Buffer.alloc(22);
  guan_eocd.writeUInt32LE(0x06054b50, 0);
  guan_eocd.writeUInt16LE(guan_entries.length, 8);
  guan_eocd.writeUInt16LE(guan_entries.length, 10);
  guan_eocd.writeUInt32LE(guan_central_buffer.length, 12);
  guan_eocd.writeUInt32LE(guan_offset, 16);

  return Buffer.concat([...guan_local_parts, guan_central_buffer, guan_eocd]);
}

/** 生成单元格 XML */
function guan_cell_xml(guan_value, guan_col, guan_row, guan_header) {
  const guan_ref = `${guan_col_letters(guan_col)}${guan_row}`;
  const guan_text = guan_value == null ? '' : String(guan_value);
  const guan_style = guan_header ? ' s="1"' : '';
  if (guan_text === '') {
    return `<c r="${guan_ref}"${guan_style}/>`;
  }
  return `<c r="${guan_ref}"${guan_style} t="inlineStr"><is><t xml:space="preserve">${guan_escape_xml(guan_text)}</t></is></c>`;
}

/**
 * 生成单表 .xlsx
 * @param {string} guan_sheet_name 工作表名
 * @param {string[][]} guan_rows 二维数组，第一行为表头
 * @param {number[]} guan_col_widths 各列宽度（字符数），可省略
 * @returns {Buffer}
 */
function guan_write_xlsx(guan_sheet_name, guan_rows, guan_col_widths) {
  const guan_safe_rows = Array.isArray(guan_rows) ? guan_rows : [];
  const guan_max_cols = guan_safe_rows.reduce((guan_max, guan_row) => Math.max(guan_max, guan_row.length), 0);

  const guan_cols_xml = guan_col_widths && guan_col_widths.length
    ? `<cols>${guan_col_widths.map((guan_width, guan_index) => (
      `<col min="${guan_index + 1}" max="${guan_index + 1}" width="${guan_width}" customWidth="1"/>`
    )).join('')}</cols>`
    : '';

  const guan_rows_xml = guan_safe_rows.map((guan_row, guan_row_index) => {
    const guan_cells = [];
    for (let guan_col = 0; guan_col < guan_max_cols; guan_col += 1) {
      guan_cells.push(guan_cell_xml(guan_row[guan_col], guan_col, guan_row_index + 1, guan_row_index === 0));
    }
    return `<row r="${guan_row_index + 1}">${guan_cells.join('')}</row>`;
  }).join('');

  const guan_sheet_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + guan_cols_xml
    + `<sheetData>${guan_rows_xml}</sheetData>`
    + '</worksheet>';

  const guan_content_types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '</Types>';

  const guan_root_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '</Relationships>';

  const guan_workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + `<sheets><sheet name="${guan_escape_xml(guan_sheet_name || 'Sheet1').slice(0, 28)}" sheetId="1" r:id="rId1"/></sheets>`
    + '</workbook>';

  const guan_workbook_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>';

  const guan_styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2">'
    + '<font><sz val="11"/><name val="等线"/></font>'
    + '<font><b/><sz val="11"/><name val="等线"/></font>'
    + '</fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border/></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="2">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '</cellXfs>'
    + '</styleSheet>';

  return guan_zip([
    { guan_name: '[Content_Types].xml', guan_data: guan_content_types },
    { guan_name: '_rels/.rels', guan_data: guan_root_rels },
    { guan_name: 'xl/workbook.xml', guan_data: guan_workbook },
    { guan_name: 'xl/_rels/workbook.xml.rels', guan_data: guan_workbook_rels },
    { guan_name: 'xl/styles.xml', guan_data: guan_styles },
    { guan_name: 'xl/worksheets/sheet1.xml', guan_data: guan_sheet_xml }
  ]);
}

module.exports = {
  guan_read_xlsx,
  guan_write_xlsx
};
