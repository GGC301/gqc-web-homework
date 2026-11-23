/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：识图页脚本 —— 图片选择/拖拽、预览、上传识别（带进度）、结果渲染与历史记录管理。
 *      所有请求与响应均打印到浏览器控制台。
 */
(function () {
  'use strict';

  var guan_api = './api/vision';
  var guan_max_bytes = 8 * 1024 * 1024;
  var guan_uploading = false;

  var guan_el_dropzone = document.getElementById('guan_vision_dropzone');
  var guan_el_file = document.getElementById('guan_vision_file_input');
  var guan_el_drop_meta = document.getElementById('guan_vision_drop_meta');
  var guan_el_progress = document.getElementById('guan_vision_progress');
  var guan_el_progress_bar = document.getElementById('guan_vision_progress_bar');
  var guan_el_progress_text = document.getElementById('guan_vision_progress_text');
  var guan_el_preview = document.getElementById('guan_vision_preview');
  var guan_el_preview_img = document.getElementById('guan_vision_preview_img');
  var guan_el_preview_meta = document.getElementById('guan_vision_preview_meta');
  var guan_el_result = document.getElementById('guan_vision_result');
  var guan_el_meta = document.getElementById('guan_vision_meta');
  var guan_el_records = document.getElementById('guan_vision_records');
  var guan_el_record_note = document.getElementById('guan_vision_record_note');

  function guan_el(guan_tag, guan_class, guan_text) {
    var guan_node = document.createElement(guan_tag);
    if (guan_class) {
      guan_node.className = guan_class;
    }
    if (guan_text != null) {
      guan_node.textContent = guan_text;
    }
    return guan_node;
  }

  function guan_fmt_kb(guan_bytes) {
    var guan_kb = Number(guan_bytes || 0) / 1024;
    return guan_kb >= 1024 ? (guan_kb / 1024).toFixed(2) + ' MB' : guan_kb.toFixed(0) + ' KB';
  }

  function guan_request(guan_path, guan_options) {
    var guan_opts = guan_options || {};
    console.log('[识图] 请求：' + (guan_opts.method || 'GET') + ' ' + guan_api + guan_path);

    return fetch(guan_api + guan_path, guan_opts)
      .then(function (guan_res) {
        return guan_res.json().then(function (guan_json) {
          console.log('[识图] 响应：', guan_json);
          return guan_json;
        });
      })
      .catch(function (guan_err) {
        console.error('[识图] 请求失败：', guan_err);
        throw guan_err;
      });
  }

  /* ================= 结果渲染 ================= */
  function guan_render_result(guan_record, guan_extra) {
    var guan_fields = guan_record.guan_fields || {};
    guan_el_result.innerHTML = '';

    guan_el_result.appendChild(guan_el('p', 'guan_vision_summary', guan_record.guan_summary || '（模型未返回摘要）'));

    var guan_dl = guan_el('dl', 'guan_vision_fields');
    [
      ['文档类型', guan_fields.guan_doc_type || '—'],
      ['标题', guan_fields.guan_title || '—'],
      ['金额', guan_fields.guan_amount || '—'],
      ['日期', guan_fields.guan_date || '—'],
      ['文件', guan_record.guan_filename + '（' + guan_fmt_kb(guan_record.guan_size) + '）']
    ].forEach(function (guan_pair) {
      var guan_box = guan_el('div', 'guan_vision_field');
      guan_box.appendChild(guan_el('dt', null, guan_pair[0]));
      guan_box.appendChild(guan_el('dd', null, guan_pair[1]));
      guan_dl.appendChild(guan_box);
    });
    guan_el_result.appendChild(guan_dl);

    if (guan_fields.guan_keywords && guan_fields.guan_keywords.length) {
      var guan_tags = guan_el('div', 'guan_vision_tags');
      guan_fields.guan_keywords.forEach(function (guan_keyword) {
        guan_tags.appendChild(guan_el('span', 'guan_app_chip', guan_keyword));
      });
      guan_el_result.appendChild(guan_tags);
    }

    var guan_head = guan_el('div', 'guan_vision_text_head');
    guan_head.appendChild(guan_el('span', null, '识别全文'));
    var guan_copy = guan_el('button', 'guan_app_btn guan_app_btn_ghost', '复制');
    guan_copy.type = 'button';
    guan_copy.addEventListener('click', function () {
      var guan_text = guan_record.guan_text || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(guan_text).then(function () {
          guan_copy.textContent = '已复制';
        }).catch(function () {
          guan_copy.textContent = '复制失败';
        });
      } else {
        guan_copy.textContent = '浏览器不支持';
      }
    });
    guan_head.appendChild(guan_copy);
    guan_el_result.appendChild(guan_head);
    guan_el_result.appendChild(guan_el('pre', 'guan_vision_text', guan_record.guan_text || '（未识别到文字）'));

    var guan_meta = [guan_record.guan_model || '—', (guan_extra && guan_extra.guan_elapsed ? guan_extra.guan_elapsed + ' ms' : '')];
    if (guan_extra && guan_extra.guan_usage && guan_extra.guan_usage.total_tokens) {
      guan_meta.push(guan_extra.guan_usage.total_tokens + ' tokens');
    }
    if (guan_extra && guan_extra.guan_parse_ok === false) {
      guan_meta.push('JSON 解析失败，已退化为纯文本');
    }
    guan_el_meta.textContent = guan_meta.filter(Boolean).join(' · ');
  }

  /* ================= 记录 ================= */
  function guan_render_records(guan_list) {
    guan_el_records.innerHTML = '';
    guan_el_record_note.textContent = '共 ' + guan_list.length + ' 条';

    if (!guan_list.length) {
      guan_el_records.appendChild(guan_el('div', 'guan_app_empty', '还没有识别记录'));
      return;
    }

    guan_list.forEach(function (guan_record) {
      var guan_row = guan_el('div', 'guan_vision_record');

      var guan_thumb = guan_el('div', 'guan_vision_record_thumb');
      guan_thumb.style.display = 'grid';
      guan_thumb.style.placeItems = 'center';
      guan_thumb.style.fontSize = '12px';
      guan_thumb.style.color = '#04101f';
      guan_thumb.style.fontWeight = '700';
      guan_thumb.style.background = 'linear-gradient(135deg, #56d8ff, #a37bff)';
      guan_thumb.textContent = (guan_record.guan_fields && guan_record.guan_fields.guan_doc_type
        ? guan_record.guan_fields.guan_doc_type : '图片').slice(0, 4);

      var guan_main = guan_el('div', 'guan_vision_record_main');
      guan_main.appendChild(guan_el('span', 'guan_vision_record_title',
        (guan_record.guan_fields && guan_record.guan_fields.guan_title) || guan_record.guan_filename));
      guan_main.appendChild(guan_el('span', 'guan_vision_record_meta',
        guan_record.guan_created_at + ' · ' + guan_record.guan_summary));

      var guan_del = guan_el('button', 'guan_app_btn guan_app_btn_danger', '删除');
      guan_del.type = 'button';
      guan_del.addEventListener('click', function () {
        guan_delete_record(guan_record);
      });

      guan_row.appendChild(guan_thumb);
      guan_row.appendChild(guan_main);
      guan_row.appendChild(guan_del);
      guan_el_records.appendChild(guan_row);
    });
  }

  function guan_load_records() {
    guan_request('/records?guan_limit=8').then(function (guan_json) {
      if (guan_json.code !== 0) {
        return;
      }
      guan_render_records(guan_json.data.guan_list || []);
    }).catch(function () {
      guan_el_records.innerHTML = '';
      guan_el_records.appendChild(guan_el('div', 'guan_app_empty', '记录读取失败，请确认后端已启动'));
    });
  }

  function guan_delete_record(guan_record) {
    if (!window.confirm('删除记录《' + guan_record.guan_filename + '》？')) {
      return;
    }
    guan_request('/records/' + guan_record.guan_id, { method: 'DELETE' }).then(function (guan_json) {
      if (guan_json.code === 0) {
        guan_load_records();
      }
    });
  }

  /* ================= 上传 ================= */
  function guan_set_progress(guan_percent, guan_text) {
    guan_el_progress.hidden = false;
    guan_el_progress_bar.style.width = Math.max(0, Math.min(100, guan_percent)) + '%';
    guan_el_progress_text.textContent = guan_text;
  }

  function guan_upload(guan_file) {
    if (guan_uploading) {
      return;
    }
    var guan_name = String(guan_file.name || '');
    if (!/\.(png|jpg|jpeg|webp)$/i.test(guan_name)) {
      guan_el_drop_meta.textContent = '只支持 png / jpg / jpeg / webp 图片';
      return;
    }
    if (guan_file.size > guan_max_bytes) {
      guan_el_drop_meta.textContent = '图片超过 8 MB，请压缩后重试';
      return;
    }

    guan_el_preview.hidden = false;
    guan_el_preview_img.src = URL.createObjectURL(guan_file);
    guan_el_preview_meta.textContent = guan_name + ' · ' + guan_fmt_kb(guan_file.size);

    guan_uploading = true;
    guan_el_dropzone.classList.add('guan_vision_dropzone_busy');
    guan_set_progress(6, '正在上传《' + guan_name + '》…');

    var guan_form = new FormData();
    guan_form.append('file', guan_file);

    var guan_xhr = new XMLHttpRequest();
    guan_xhr.open('POST', guan_api + '/analyze');
    console.log('[识图] 上传图片：' + guan_name + '（' + guan_file.size + ' 字节）');

    guan_xhr.upload.onprogress = function (guan_event) {
      if (guan_event.lengthComputable) {
        var guan_percent = Math.round((guan_event.loaded / guan_event.total) * 50);
        guan_set_progress(guan_percent, '已上传 ' + Math.round((guan_event.loaded / guan_event.total) * 100) + '%，等待模型识别…');
      }
    };

    guan_xhr.upload.onload = function () {
      guan_set_progress(70, '图片已上传，视觉模型正在识别…');
    };

    guan_xhr.onerror = function () {
      guan_uploading = false;
      guan_el_dropzone.classList.remove('guan_vision_dropzone_busy');
      guan_set_progress(0, '上传失败：网络异常，请确认后端服务已启动');
    };

    guan_xhr.onload = function () {
      guan_uploading = false;
      guan_el_dropzone.classList.remove('guan_vision_dropzone_busy');
      var guan_json = null;
      try {
        guan_json = JSON.parse(guan_xhr.responseText);
      } catch (guan_err) {
        guan_json = null;
      }
      console.log('[识图] 识别响应：', guan_json);

      if (!guan_json) {
        guan_set_progress(0, '服务端返回内容无法解析，请查看后端终端日志');
        return;
      }
      if (guan_json.code !== 0) {
        guan_set_progress(100, '识别失败（' + guan_json.code + '）：' + guan_json.msg);
        guan_el_drop_meta.textContent = guan_json.msg;
        return;
      }

      guan_set_progress(100, '识别完成：' + guan_json.msg);
      guan_el_drop_meta.textContent = '识别完成 · ' + guan_json.data.guan_record.guan_fields.guan_doc_type;
      guan_render_result(guan_json.data.guan_record, guan_json.data);
      guan_load_records();
    };

    guan_xhr.send(guan_form);
  }

  /* ================= 事件 ================= */
  guan_el_dropzone.addEventListener('click', function () {
    if (!guan_uploading) {
      guan_el_file.click();
    }
  });

  guan_el_dropzone.addEventListener('keydown', function (guan_event) {
    if (guan_event.key === 'Enter' || guan_event.key === ' ') {
      guan_event.preventDefault();
      guan_el_file.click();
    }
  });

  guan_el_file.addEventListener('change', function () {
    if (guan_el_file.files && guan_el_file.files[0]) {
      guan_upload(guan_el_file.files[0]);
      guan_el_file.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(function (guan_type) {
    guan_el_dropzone.addEventListener(guan_type, function (guan_event) {
      guan_event.preventDefault();
      guan_el_dropzone.classList.add('guan_vision_dropzone_active');
    });
  });

  ['dragleave', 'drop'].forEach(function (guan_type) {
    guan_el_dropzone.addEventListener(guan_type, function (guan_event) {
      guan_event.preventDefault();
      guan_el_dropzone.classList.remove('guan_vision_dropzone_active');
    });
  });

  guan_el_dropzone.addEventListener('drop', function (guan_event) {
    var guan_files = guan_event.dataTransfer && guan_event.dataTransfer.files;
    if (guan_files && guan_files[0]) {
      guan_upload(guan_files[0]);
    }
  });

  guan_load_records();
})();
