/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：知识库管理页脚本 —— 文件上传（进度条）、解析状态、文档列表检索、片段查看与删除。
 *      所有请求与响应均输出到浏览器控制台。
 */
(function () {
  'use strict';

  var guan_api_base = './api';
  var guan_supported = ['txt', 'md', 'markdown', 'csv', 'json', 'log', 'html', 'htm', 'pdf'];
  var guan_max_bytes = 10 * 1024 * 1024;
  var guan_search_timer = null;
  var guan_queue_items = [];
  var guan_uploading = false;

  /* ================= DOM ================= */
  var guan_dropzone = document.getElementById('guan_dropzone');
  var guan_file_input = document.getElementById('guan_file_input');
  var guan_queue_box = document.getElementById('guan_queue');
  var guan_queue_empty = document.getElementById('guan_queue_empty');
  var guan_queue_count = document.getElementById('guan_queue_count');
  var guan_stat_doc = document.getElementById('guan_stat_doc');
  var guan_stat_chunk = document.getElementById('guan_stat_chunk');
  var guan_stat_embed = document.getElementById('guan_stat_embed');
  var guan_stat_chars = document.getElementById('guan_stat_chars');
  var guan_doc_list = document.getElementById('guan_doc_list');
  var guan_doc_empty = document.getElementById('guan_doc_empty');
  var guan_list_note = document.getElementById('guan_list_note');
  var guan_search_input = document.getElementById('guan_search_input');
  var guan_refresh_btn = document.getElementById('guan_refresh_btn');
  var guan_drawer = document.getElementById('guan_drawer');
  var guan_drawer_mask = document.getElementById('guan_drawer_mask');
  var guan_drawer_title = document.getElementById('guan_drawer_title');
  var guan_drawer_sub = document.getElementById('guan_drawer_sub');
  var guan_drawer_body = document.getElementById('guan_drawer_body');
  var guan_drawer_close = document.getElementById('guan_drawer_close');

  /* ================= 工具 ================= */
  function guan_fmt_bytes(guan_bytes) {
    var guan_num = Number(guan_bytes) || 0;
    if (guan_num < 1024) {
      return guan_num + ' B';
    }
    if (guan_num < 1024 * 1024) {
      return (guan_num / 1024).toFixed(1) + ' KB';
    }
    return (guan_num / 1024 / 1024).toFixed(2) + ' MB';
  }

  function guan_fmt_chars(guan_num) {
    var guan_value = Number(guan_num) || 0;
    if (guan_value >= 10000) {
      return (guan_value / 10000).toFixed(2) + ' 万';
    }
    return String(guan_value);
  }

  function guan_ext_of(guan_name) {
    var guan_parts = String(guan_name || '').split('.');
    return guan_parts.length > 1 ? guan_parts.pop().toLowerCase() : '';
  }

  function guan_status_text(guan_status) {
    if (guan_status === 'indexed') {
      return '已向量化';
    }
    if (guan_status === 'parsed') {
      return '仅解析（未向量化）';
    }
    return '处理失败';
  }

  /** 统一 GET/POST/DELETE 请求，成功与失败都打印控制台 */
  function guan_request(guan_path, guan_options) {
    var guan_opts = guan_options || {};
    console.log('[知识库] 请求：' + (guan_opts.method || 'GET') + ' ' + guan_api_base + guan_path, guan_opts.body || '');

    return fetch(guan_api_base + guan_path, guan_opts)
      .then(function (guan_res) {
        return guan_res.json().then(function (guan_json) {
          console.log('[知识库] 响应：', guan_json);
          return guan_json;
        });
      })
      .catch(function (guan_err) {
        console.error('[知识库] 请求失败：', guan_err);
        throw guan_err;
      });
  }

  /* ================= 统计 ================= */
  function guan_load_stats() {
    return guan_request('/kb/stats').then(function (guan_json) {
      if (guan_json.code !== 0) {
        console.error('[知识库] 统计接口异常：', guan_json.msg);
        return;
      }
      var guan_data = guan_json.data;
      guan_stat_doc.innerHTML = guan_data.guan_document_total + '<small>篇</small>';
      guan_stat_chunk.innerHTML = guan_data.guan_chunk_total + '<small>段</small>';
      guan_stat_embed.innerHTML = guan_data.guan_embed_total + '<small>段</small>';
      guan_stat_chars.innerHTML = guan_fmt_chars(guan_data.guan_chars_total) + '<small>字</small>';
    });
  }

  /* ================= 文档列表 ================= */
  function guan_render_doc_row(guan_doc) {
    var guan_row = document.createElement('div');
    guan_row.className = 'guan_doc_row';

    var guan_main = document.createElement('div');
    guan_main.className = 'guan_doc_main';

    var guan_name = document.createElement('div');
    guan_name.className = 'guan_doc_name';
    var guan_ext = document.createElement('span');
    guan_ext.className = 'guan_doc_ext';
    guan_ext.textContent = (guan_doc.guan_type || 'txt').toUpperCase();
    var guan_name_text = document.createElement('span');
    guan_name_text.textContent = guan_doc.guan_name;
    guan_name.appendChild(guan_ext);
    guan_name.appendChild(guan_name_text);

    var guan_meta = document.createElement('div');
    guan_meta.className = 'guan_doc_meta';
    guan_meta.textContent = '上传于 ' + guan_doc.guan_created_at + ' · ' + guan_fmt_bytes(guan_doc.guan_size) +
      (guan_doc.guan_note ? ' · ' + guan_doc.guan_note : '');

    guan_main.appendChild(guan_name);
    guan_main.appendChild(guan_meta);

    var guan_cell_chars = document.createElement('div');
    guan_cell_chars.className = 'guan_doc_cell';
    guan_cell_chars.innerHTML = '<strong>' + guan_fmt_chars(guan_doc.guan_chars) + '</strong> 字';

    var guan_cell_chunk = document.createElement('div');
    guan_cell_chunk.className = 'guan_doc_cell';
    guan_cell_chunk.innerHTML = '<strong>' + guan_doc.guan_chunk_total + '</strong> 片段';

    var guan_cell_embed = document.createElement('div');
    guan_cell_embed.className = 'guan_doc_cell';
    guan_cell_embed.innerHTML = '<strong>' + guan_doc.guan_embed_total + '</strong> 向量';

    var guan_cell_status = document.createElement('div');
    guan_cell_status.className = 'guan_doc_cell guan_doc_status_cell';
    var guan_badge = document.createElement('span');
    guan_badge.className = 'guan_status_badge guan_status_' + (guan_doc.guan_status || 'parsed');
    guan_badge.textContent = guan_status_text(guan_doc.guan_status);
    guan_cell_status.appendChild(guan_badge);

    var guan_actions = document.createElement('div');
    guan_actions.className = 'guan_doc_actions';

    var guan_view_btn = document.createElement('button');
    guan_view_btn.className = 'guan_btn';
    guan_view_btn.type = 'button';
    guan_view_btn.textContent = '片段';
    guan_view_btn.addEventListener('click', function () {
      guan_open_drawer(guan_doc);
    });

    var guan_del_btn = document.createElement('button');
    guan_del_btn.className = 'guan_btn guan_btn_danger';
    guan_del_btn.type = 'button';
    guan_del_btn.textContent = '删除';
    guan_del_btn.addEventListener('click', function () {
      guan_delete_document(guan_doc, guan_del_btn);
    });

    guan_actions.appendChild(guan_view_btn);
    guan_actions.appendChild(guan_del_btn);

    guan_row.appendChild(guan_main);
    guan_row.appendChild(guan_cell_chars);
    guan_row.appendChild(guan_cell_chunk);
    guan_row.appendChild(guan_cell_embed);
    guan_row.appendChild(guan_cell_status);
    guan_row.appendChild(guan_actions);
    return guan_row;
  }

  function guan_load_documents() {
    var guan_keyword = guan_search_input.value.trim();
    guan_list_note.textContent = '正在加载…';
    return guan_request('/kb/documents?guan_keyword=' + encodeURIComponent(guan_keyword)).then(function (guan_json) {
      guan_doc_list.innerHTML = '';
      if (guan_json.code !== 0) {
        guan_list_note.textContent = '加载失败';
        guan_doc_empty.hidden = false;
        guan_doc_empty.textContent = guan_json.msg;
        return;
      }
      var guan_list = guan_json.data.guan_list || [];
      guan_list_note.textContent = '共 ' + guan_list.length + ' 个文档' + (guan_keyword ? '（关键词：' + guan_keyword + '）' : '');
      guan_doc_empty.hidden = guan_list.length > 0;
      if (guan_list.length === 0) {
        guan_doc_empty.textContent = guan_keyword
          ? '没有匹配「' + guan_keyword + '」的文档'
          : '知识库中还没有文档，请先上传一份 txt / md / pdf 文件';
      }
      guan_list.forEach(function (guan_doc) {
        guan_doc_list.appendChild(guan_render_doc_row(guan_doc));
      });
    });
  }

  function guan_refresh_all() {
    return Promise.all([guan_load_stats(), guan_load_documents()]);
  }

  /* ================= 删除 ================= */
  function guan_delete_document(guan_doc, guan_btn) {
    var guan_ok = window.confirm('确定删除《' + guan_doc.guan_name + '》及其 ' + guan_doc.guan_chunk_total + ' 个片段吗？');
    if (!guan_ok) {
      return;
    }
    guan_btn.disabled = true;
    guan_btn.textContent = '删除中…';
    guan_request('/kb/documents/' + guan_doc.guan_id, { method: 'DELETE' }).then(function (guan_json) {
      if (guan_json.code === 0) {
        console.log('[知识库] 删除成功：', guan_json.msg);
      } else {
        window.alert('删除失败：' + guan_json.msg);
      }
      return guan_refresh_all();
    }).catch(function () {
      window.alert('删除请求失败，请检查后端服务是否启动');
      guan_btn.disabled = false;
      guan_btn.textContent = '删除';
    });
  }

  /* ================= 片段抽屉 ================= */
  function guan_open_drawer(guan_doc) {
    guan_drawer_title.textContent = guan_doc.guan_name;
    guan_drawer_sub.textContent = '共 ' + guan_doc.guan_chunk_total + ' 个片段 · ' + guan_status_text(guan_doc.guan_status) +
      ' · ' + guan_fmt_chars(guan_doc.guan_chars) + ' 字';
    guan_drawer_body.innerHTML = '<p class="guan_drawer_sub">正在加载片段…</p>';
    guan_drawer.classList.add('guan_drawer_open');
    guan_drawer_mask.classList.add('guan_drawer_mask_open');
    guan_drawer.setAttribute('aria-hidden', 'false');

    guan_request('/kb/documents/' + guan_doc.guan_id).then(function (guan_json) {
      guan_drawer_body.innerHTML = '';
      if (guan_json.code !== 0) {
        guan_drawer_body.innerHTML = '<p class="guan_drawer_sub">' + guan_json.msg + '</p>';
        return;
      }
      var guan_chunks = guan_json.data.guan_chunks || [];
      if (guan_chunks.length === 0) {
        guan_drawer_body.innerHTML = '<p class="guan_drawer_sub">该文档没有片段</p>';
        return;
      }
      guan_chunks.forEach(function (guan_chunk) {
        var guan_card = document.createElement('article');
        guan_card.className = 'guan_chunk';
        var guan_head = document.createElement('div');
        guan_head.className = 'guan_chunk_head';
        guan_head.innerHTML = '<span>片段 ' + (guan_chunk.guan_index + 1) + '</span><span>' + guan_chunk.guan_chars + ' 字</span>';
        var guan_text = document.createElement('div');
        guan_text.className = 'guan_chunk_text';
        guan_text.textContent = guan_chunk.guan_content;
        guan_card.appendChild(guan_head);
        guan_card.appendChild(guan_text);
        guan_drawer_body.appendChild(guan_card);
      });
    });
  }

  function guan_close_drawer() {
    guan_drawer.classList.remove('guan_drawer_open');
    guan_drawer_mask.classList.remove('guan_drawer_mask_open');
    guan_drawer.setAttribute('aria-hidden', 'true');
  }

  /* ================= 上传 ================= */
  function guan_validate_file(guan_file) {
    var guan_ext = guan_ext_of(guan_file.name);
    if (guan_supported.indexOf(guan_ext) === -1) {
      return '不支持的格式 .' + (guan_ext || '未知') + '，请上传 ' + guan_supported.join(' / ');
    }
    if (guan_file.size === 0) {
      return '文件内容为空';
    }
    if (guan_file.size > guan_max_bytes) {
      return '文件超过 10 MB 上限';
    }
    return '';
  }

  function guan_create_queue_item(guan_file) {
    var guan_item = {
      guan_file: guan_file,
      guan_state: 'pending',
      guan_el: document.createElement('div')
    };
    guan_item.guan_el.className = 'guan_queue_item';
    guan_item.guan_el.innerHTML =
      '<div class="guan_queue_head">' +
      '<span class="guan_queue_name">' + guan_file.name.replace(/[<>&]/g, '') + '</span>' +
      '<span class="guan_queue_pct">0%</span>' +
      '</div>' +
      '<div class="guan_progress"><span class="guan_progress_bar"></span></div>' +
      '<div class="guan_queue_msg">等待上传…</div>';

    guan_queue_box.appendChild(guan_item.guan_el);
    guan_queue_items.push(guan_item);
    guan_queue_empty.hidden = true;
    guan_update_queue_count();
    return guan_item;
  }

  function guan_update_queue_count() {
    var guan_done = guan_queue_items.filter(function (guan_item) {
      return guan_item.guan_state === 'done' || guan_item.guan_state === 'fail';
    }).length;
    guan_queue_count.textContent = guan_done + ' / ' + guan_queue_items.length;
  }

  function guan_set_item(guan_item, guan_pct, guan_msg, guan_class) {
    var guan_bar = guan_item.guan_el.querySelector('.guan_progress_bar');
    var guan_pct_el = guan_item.guan_el.querySelector('.guan_queue_pct');
    var guan_msg_el = guan_item.guan_el.querySelector('.guan_queue_msg');
    if (guan_bar) {
      guan_bar.style.width = guan_pct + '%';
    }
    if (guan_pct_el) {
      guan_pct_el.textContent = guan_pct + '%';
    }
    if (guan_msg_el) {
      guan_msg_el.className = 'guan_queue_msg' + (guan_class ? ' ' + guan_class : '');
      guan_msg_el.textContent = guan_msg;
    }
  }

  function guan_upload_one(guan_item) {
    return new Promise(function (guan_resolve) {
      var guan_file = guan_item.guan_file;
      guan_item.guan_state = 'uploading';
      guan_set_item(guan_item, 0, '正在上传…');

      var guan_form = new FormData();
      guan_form.append('file', guan_file, guan_file.name);

      var guan_xhr = new XMLHttpRequest();
      guan_xhr.open('POST', guan_api_base + '/kb/documents');
      console.log('[知识库] 开始上传：' + guan_file.name + '（' + guan_fmt_bytes(guan_file.size) + '）');

      guan_xhr.upload.onprogress = function (guan_event) {
        if (!guan_event.lengthComputable) {
          return;
        }
        var guan_pct = Math.round((guan_event.loaded / guan_event.total) * 90);
        guan_set_item(guan_item, guan_pct, '上传中 ' + guan_fmt_bytes(guan_event.loaded) + ' / ' + guan_fmt_bytes(guan_event.total));
      };

      guan_xhr.upload.onload = function () {
        guan_set_item(guan_item, 95, '服务端解析文本、切分并向量化…');
      };

      guan_xhr.onload = function () {
        var guan_json = null;
        try {
          guan_json = JSON.parse(guan_xhr.responseText);
        } catch (guan_err) {
          guan_json = null;
        }
        console.log('[知识库] 上传响应：', guan_json || guan_xhr.responseText);

        if (guan_json && guan_json.code === 0) {
          guan_item.guan_state = 'done';
          guan_set_item(guan_item, 100, guan_json.msg, 'guan_queue_msg_ok');
          guan_update_queue_count();
          guan_refresh_all();
          guan_resolve(true);
          return;
        }

        guan_item.guan_state = 'fail';
        guan_set_item(guan_item, 100, (guan_json && guan_json.msg) || ('上传失败：HTTP ' + guan_xhr.status), 'guan_queue_msg_fail');
        guan_update_queue_count();
        guan_resolve(false);
      };

      guan_xhr.onerror = function () {
        console.error('[知识库] 上传网络错误：' + guan_file.name);
        guan_item.guan_state = 'fail';
        guan_set_item(guan_item, 100, '网络错误，请确认后端已启动', 'guan_queue_msg_fail');
        guan_update_queue_count();
        guan_resolve(false);
      };

      guan_xhr.send(guan_form);
    });
  }

  function guan_upload_files(guan_files) {
    var guan_list = Array.prototype.slice.call(guan_files || []);
    if (guan_list.length === 0 || guan_uploading) {
      return;
    }

    var guan_valid = [];
    guan_list.forEach(function (guan_file) {
      var guan_error = guan_validate_file(guan_file);
      if (guan_error) {
        var guan_item = guan_create_queue_item(guan_file);
        guan_item.guan_state = 'fail';
        guan_set_item(guan_item, 100, guan_error, 'guan_queue_msg_fail');
        guan_update_queue_count();
        console.error('[知识库] 文件校验失败：' + guan_file.name + '｜' + guan_error);
        return;
      }
      guan_valid.push(guan_create_queue_item(guan_file));
    });

    if (guan_valid.length === 0) {
      return;
    }

    guan_uploading = true;
    var guan_chain = Promise.resolve();
    guan_valid.forEach(function (guan_item) {
      guan_chain = guan_chain.then(function () {
        return guan_upload_one(guan_item);
      });
    });
    guan_chain.then(function () {
      guan_uploading = false;
      guan_file_input.value = '';
    });
  }

  /* ================= 事件 ================= */
  guan_dropzone.addEventListener('click', function (guan_event) {
    // 避免 input 自身的 click 冒泡回来造成递归
    if (guan_event.target === guan_file_input) {
      return;
    }
    guan_file_input.click();
  });

  guan_dropzone.addEventListener('keydown', function (guan_event) {
    if (guan_event.key === 'Enter' || guan_event.key === ' ') {
      guan_event.preventDefault();
      guan_file_input.click();
    }
  });

  guan_file_input.addEventListener('change', function () {
    guan_upload_files(guan_file_input.files);
  });

  ['dragenter', 'dragover'].forEach(function (guan_type) {
    guan_dropzone.addEventListener(guan_type, function (guan_event) {
      guan_event.preventDefault();
      guan_dropzone.classList.add('guan_dropzone_active');
    });
  });

  ['dragleave', 'drop'].forEach(function (guan_type) {
    guan_dropzone.addEventListener(guan_type, function (guan_event) {
      guan_event.preventDefault();
      guan_dropzone.classList.remove('guan_dropzone_active');
    });
  });

  guan_dropzone.addEventListener('drop', function (guan_event) {
    if (guan_event.dataTransfer && guan_event.dataTransfer.files) {
      guan_upload_files(guan_event.dataTransfer.files);
    }
  });

  guan_search_input.addEventListener('input', function () {
    clearTimeout(guan_search_timer);
    guan_search_timer = setTimeout(function () {
      guan_load_documents();
    }, 280);
  });

  guan_refresh_btn.addEventListener('click', function () {
    guan_refresh_all();
  });

  guan_drawer_close.addEventListener('click', guan_close_drawer);
  guan_drawer_mask.addEventListener('click', guan_close_drawer);
  document.addEventListener('keydown', function (guan_event) {
    if (guan_event.key === 'Escape') {
      guan_close_drawer();
    }
  });

  /* ================= 初始化 ================= */
  console.log('%c[知识库管理] 页面已就绪', 'color:#56d8ff;font-weight:700',
    '\n接口：' + guan_api_base + '/kb/documents\n提示：上传、列表、删除、片段的请求与响应都会打印在本控制台。');
  guan_refresh_all();
})();
