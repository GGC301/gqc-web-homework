/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：RAG 智能问答页脚本 —— 文档范围与 Top-K 选择、检索增强问答、引用来源展示。
 *      发送给后端的问题、返回的答案与引用片段全部输出到浏览器控制台。
 */
(function () {
  'use strict';

  var guan_api_base = './api';
  var guan_history = [];
  var guan_session_id = null;
  var guan_is_busy = false;
  var guan_documents = [];

  /* ================= DOM ================= */
  var guan_chat_body = document.getElementById('guan_chat_body');
  var guan_welcome = document.getElementById('guan_welcome');
  var guan_chips = document.getElementById('guan_chips');
  var guan_input = document.getElementById('guan_input');
  var guan_send_btn = document.getElementById('guan_send');
  var guan_clear_btn = document.getElementById('guan_clear_btn');
  var guan_doc_filter = document.getElementById('guan_doc_filter');
  var guan_doc_count = document.getElementById('guan_doc_count');
  var guan_check_all = document.getElementById('guan_check_all');
  var guan_topk = document.getElementById('guan_topk');
  var guan_topk_val = document.getElementById('guan_topk_val');
  var guan_session_id_el = document.getElementById('guan_session_id');
  var guan_model_name = document.getElementById('guan_model_name');
  var guan_embed_name = document.getElementById('guan_embed_name');
  var guan_hit_state = document.getElementById('guan_hit_state');
  var guan_chat_meta = document.getElementById('guan_chat_meta');
  var guan_state_dot = document.getElementById('guan_state_dot');

  /* ================= 工具 ================= */
  function guan_escape(guan_text) {
    return String(guan_text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function guan_inline(guan_text) {
    return guan_text
      .replace(/`([^`\n]+)`/g, '<code class="guan_code_inline">$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  /** 轻量 Markdown 渲染：代码块 + 行内代码 + 加粗 + 换行 */
  function guan_render_markdown(guan_text) {
    var guan_parts = String(guan_text).split('```');
    var guan_html = '';
    for (var guan_i = 0; guan_i < guan_parts.length; guan_i += 1) {
      var guan_part = guan_parts[guan_i];
      if (guan_i % 2 === 1) {
        guan_part = guan_part.replace(/^[a-zA-Z0-9+#._-]*\r?\n/, '');
        guan_html += '<pre class="guan_pre"><code>' + guan_escape(guan_part.replace(/\s+$/, '')) + '</code></pre>';
      } else {
        guan_html += guan_inline(guan_escape(guan_part));
      }
    }
    return guan_html;
  }

  function guan_fmt_time() {
    var guan_now = new Date();
    return String(guan_now.getHours()).padStart(2, '0') + ':' + String(guan_now.getMinutes()).padStart(2, '0');
  }

  function guan_scroll_bottom() {
    guan_chat_body.scrollTop = guan_chat_body.scrollHeight;
  }

  function guan_hide_welcome() {
    if (guan_welcome && guan_welcome.parentNode) {
      guan_welcome.parentNode.removeChild(guan_welcome);
      guan_welcome = null;
    }
  }

  function guan_request(guan_path, guan_options) {
    var guan_opts = guan_options || {};
    console.log('[RAG] 请求：' + (guan_opts.method || 'GET') + ' ' + guan_api_base + guan_path);
    return fetch(guan_api_base + guan_path, guan_opts)
      .then(function (guan_res) {
        return guan_res.json().then(function (guan_json) {
          console.log('[RAG] 响应：', guan_json);
          return guan_json;
        });
      })
      .catch(function (guan_err) {
        console.error('[RAG] 请求失败：', guan_err);
        throw guan_err;
      });
  }

  /* ================= 消息渲染 ================= */
  function guan_add_message(guan_role, guan_text, guan_meta) {
    guan_hide_welcome();

    var guan_row = document.createElement('div');
    guan_row.className = 'guan_msg guan_msg_' + guan_role + (guan_role === 'error' ? ' guan_msg_error' : '');

    var guan_avatar = document.createElement('div');
    guan_avatar.className = 'guan_msg_avatar';
    guan_avatar.textContent = guan_role === 'user' ? '我' : 'AI';

    var guan_body = document.createElement('div');
    guan_body.className = 'guan_msg_body';

    var guan_meta_row = document.createElement('div');
    guan_meta_row.className = 'guan_msg_meta';
    var guan_who = document.createElement('span');
    guan_who.textContent = guan_role === 'user' ? '我' : (guan_role === 'error' ? '请求失败' : '知识库助手');
    var guan_time = document.createElement('span');
    guan_time.textContent = guan_fmt_time();
    guan_meta_row.appendChild(guan_who);
    guan_meta_row.appendChild(guan_time);
    if (guan_meta) {
      var guan_meta_span = document.createElement('span');
      guan_meta_span.textContent = guan_meta;
      guan_meta_row.appendChild(guan_meta_span);
    }

    var guan_bubble = document.createElement('div');
    guan_bubble.className = 'guan_bubble';
    if (guan_role === 'user') {
      guan_bubble.textContent = guan_text;
    } else {
      guan_bubble.innerHTML = guan_render_markdown(guan_text);
    }

    guan_body.appendChild(guan_meta_row);
    guan_body.appendChild(guan_bubble);
    guan_row.appendChild(guan_avatar);
    guan_row.appendChild(guan_body);
    guan_chat_body.appendChild(guan_row);
    guan_scroll_bottom();
    return { guan_row: guan_row, guan_body: guan_body, guan_bubble: guan_bubble };
  }

  /** 渲染引用来源（点击可展开原文片段） */
  function guan_render_citations(guan_body, guan_citations) {
    if (!guan_citations || guan_citations.length === 0) {
      return;
    }

    var guan_box = document.createElement('div');
    guan_box.className = 'guan_cites';

    var guan_title = document.createElement('div');
    guan_title.className = 'guan_cites_title';
    guan_title.textContent = '引用来源（' + guan_citations.length + ' 条，点击查看原文片段）';

    var guan_list = document.createElement('div');
    guan_list.className = 'guan_cite_list';

    var guan_detail = document.createElement('div');
    guan_detail.className = 'guan_cite_detail';
    guan_detail.hidden = true;

    guan_citations.forEach(function (guan_cite) {
      var guan_btn = document.createElement('button');
      guan_btn.className = 'guan_cite';
      guan_btn.type = 'button';
      guan_btn.innerHTML =
        '<span class="guan_cite_no">' + guan_cite.guan_no + '</span>' +
        '<span class="guan_cite_name">' + guan_escape(guan_cite.guan_document_name) + ' #' + (guan_cite.guan_index + 1) + '</span>' +
        '<span class="guan_cite_score">' + Number(guan_cite.guan_score || 0).toFixed(2) + '</span>';

      guan_btn.addEventListener('click', function () {
        var guan_content = '【' + guan_cite.guan_document_name + ' · 片段 ' + (guan_cite.guan_index + 1) +
          '】相似度 ' + Number(guan_cite.guan_score || 0).toFixed(4) + '\n\n' + guan_cite.guan_content;
        guan_detail.textContent = guan_content;
        guan_detail.hidden = false;
        console.log('[RAG] 查看引用片段：', guan_cite);
      });

      guan_list.appendChild(guan_btn);
    });

    guan_box.appendChild(guan_title);
    guan_box.appendChild(guan_list);
    guan_box.appendChild(guan_detail);
    guan_body.appendChild(guan_box);
    guan_scroll_bottom();
  }

  function guan_show_typing() {
    guan_hide_welcome();
    var guan_row = document.createElement('div');
    guan_row.className = 'guan_msg guan_msg_ai';
    guan_row.innerHTML =
      '<div class="guan_msg_avatar">AI</div>' +
      '<div class="guan_msg_body"><div class="guan_bubble guan_typing">' +
      '<span></span><span></span><span></span></div></div>';
    guan_chat_body.appendChild(guan_row);
    guan_scroll_bottom();
    return guan_row;
  }

  /* ================= 文档范围 ================= */
  function guan_render_doc_filter(guan_list) {
    guan_documents = guan_list || [];
    guan_doc_filter.innerHTML = '';
    guan_doc_count.textContent = guan_documents.length;

    if (guan_documents.length === 0) {
      guan_doc_filter.innerHTML = '<p class="guan_side_note">知识库暂无文档，请先到「知识库管理」页上传。</p>';
      guan_hit_state.textContent = '无文档';
      return;
    }

    guan_documents.forEach(function (guan_doc) {
      var guan_label = document.createElement('label');
      guan_label.className = 'guan_check';
      var guan_cb = document.createElement('input');
      guan_cb.type = 'checkbox';
      guan_cb.value = String(guan_doc.guan_id);
      guan_cb.checked = true;
      guan_cb.addEventListener('change', guan_sync_check_all);
      var guan_span = document.createElement('span');
      guan_span.textContent = guan_doc.guan_name;
      guan_span.title = guan_doc.guan_name;
      guan_label.appendChild(guan_cb);
      guan_label.appendChild(guan_span);
      guan_doc_filter.appendChild(guan_label);
    });
    guan_sync_check_all();
  }

  function guan_selected_doc_ids() {
    var guan_boxes = guan_doc_filter.querySelectorAll('input[type="checkbox"]');
    var guan_ids = [];
    for (var guan_i = 0; guan_i < guan_boxes.length; guan_i += 1) {
      if (guan_boxes[guan_i].checked) {
        guan_ids.push(Number(guan_boxes[guan_i].value));
      }
    }
    return guan_ids;
  }

  function guan_sync_check_all() {
    var guan_ids = guan_selected_doc_ids();
    guan_check_all.checked = guan_ids.length === guan_documents.length && guan_documents.length > 0;
    guan_check_all.indeterminate = guan_ids.length > 0 && guan_ids.length < guan_documents.length;
  }

  /* ================= 发送 ================= */
  function guan_set_busy(guan_flag) {
    guan_is_busy = guan_flag;
    guan_send_btn.disabled = guan_flag;
    guan_state_dot.style.background = guan_flag ? '#ffcf80' : '#3ee097';
  }

  function guan_send(guan_question) {
    if (guan_is_busy) {
      return;
    }
    var guan_text = String(guan_question || guan_input.value).trim();
    if (!guan_text) {
      guan_input.focus();
      return;
    }

    var guan_ids = guan_selected_doc_ids();
    var guan_payload = {
      guan_question: guan_text,
      guan_top_k: Number(guan_topk.value),
      guan_doc_ids: guan_ids.length === guan_documents.length ? [] : guan_ids,
      guan_history: guan_history.slice(-6),
      guan_session_id: guan_session_id || undefined
    };

    guan_add_message('user', guan_text, '');
    guan_input.value = '';
    guan_resize_input();
    var guan_typing = guan_show_typing();
    guan_set_busy(true);
    guan_hit_state.textContent = '检索中…';

    console.group('%c[RAG] 发送请求 /api/ai/rag-chat', 'color:#56d8ff;font-weight:700');
    console.log('用户问题：', guan_text);
    console.log('请求参数：', guan_payload);
    console.log('后端将据此检索知识库并拼装提示词，完整提示词见后端终端。');
    console.groupEnd();

    var guan_started = Date.now();

    fetch(guan_api_base + '/ai/rag-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(guan_payload)
    }).then(function (guan_res) {
      return guan_res.json();
    }).then(function (guan_json) {
      var guan_elapsed = Date.now() - guan_started;
      console.log('%c[RAG] 接收到的数据', 'color:#3ee097;font-weight:700', guan_json);

      if (guan_typing.parentNode) {
        guan_typing.parentNode.removeChild(guan_typing);
      }

      if (guan_json.code !== 0) {
        guan_add_message('error', '请求失败：' + guan_json.msg, '');
        guan_hit_state.textContent = '失败';
        console.error('[RAG] 接口返回失败：', guan_json.code, guan_json.msg);
        return;
      }

      var guan_data = guan_json.data;
      guan_session_id = guan_data.guan_session_id;
      guan_session_id_el.textContent = String(guan_session_id);
      guan_hit_state.textContent = guan_data.guan_fallback
        ? '未命中资料'
        : '命中 ' + guan_data.guan_citations.length + ' 条';

      var guan_usage = guan_data.guan_usage || {};
      var guan_meta = [
        guan_data.guan_model,
        guan_usage.total_tokens ? guan_usage.total_tokens + ' tokens' : '',
        (guan_data.guan_elapsed || guan_elapsed) + ' ms'
      ].filter(Boolean).join(' · ');

      var guan_msg = guan_add_message('ai', guan_data.guan_answer, guan_meta);
      guan_render_citations(guan_msg.guan_body, guan_data.guan_citations);

      guan_history.push({ role: 'user', content: guan_text });
      guan_history.push({ role: 'assistant', content: guan_data.guan_answer });
      if (guan_history.length > 12) {
        guan_history = guan_history.slice(guan_history.length - 12);
      }

      console.log('[RAG] 会话 ID：' + guan_session_id + '｜TopK=' + guan_data.guan_top_k +
        '｜耗时 ' + (guan_data.guan_elapsed || guan_elapsed) + ' ms｜用量：', guan_usage);
    }).catch(function (guan_err) {
      if (guan_typing.parentNode) {
        guan_typing.parentNode.removeChild(guan_typing);
      }
      console.error('[RAG] 请求异常：', guan_err);
      guan_add_message('error',
        '请求失败：' + guan_err.message + '\n请确认后端服务已启动（http://localhost:8301），页面需通过 http 访问而不是直接打开文件。', '');
      guan_hit_state.textContent = '异常';
    }).then(function () {
      guan_set_busy(false);
      guan_input.focus();
    });
  }

  function guan_resize_input() {
    guan_input.style.height = 'auto';
    guan_input.style.height = Math.min(guan_input.scrollHeight, 140) + 'px';
  }

  /* ================= 初始化 ================= */
  function guan_init() {
    guan_request('/ai/info').then(function (guan_json) {
      if (guan_json.code !== 0) {
        return;
      }
      var guan_data = guan_json.data;
      guan_model_name.textContent = guan_data.guan_llm_model;
      guan_embed_name.textContent = guan_data.guan_embed_model;
      guan_chat_meta.textContent = guan_data.guan_llm_model.split('/').pop() + ' / TopK=' + guan_topk.value;
      if (!guan_data.guan_configured) {
        guan_hit_state.textContent = '未配置密钥';
      }
    }).catch(function () {
      guan_hit_state.textContent = '后端未连接';
    });

    guan_request('/kb/documents').then(function (guan_json) {
      if (guan_json.code !== 0) {
        guan_doc_filter.innerHTML = '<p class="guan_side_note">' + guan_json.msg + '</p>';
        return;
      }
      guan_render_doc_filter(guan_json.data.guan_list || []);
    }).catch(function () {
      guan_doc_filter.innerHTML = '<p class="guan_side_note">文档加载失败，请检查后端服务。</p>';
    });
  }

  /* ================= 事件 ================= */
  guan_send_btn.addEventListener('click', function () {
    guan_send();
  });

  guan_input.addEventListener('input', guan_resize_input);

  guan_input.addEventListener('keydown', function (guan_event) {
    if (guan_event.key === 'Enter' && !guan_event.shiftKey && !guan_event.isComposing) {
      guan_event.preventDefault();
      guan_send();
    }
  });

  if (guan_chips) {
    guan_chips.addEventListener('click', function (guan_event) {
      var guan_target = guan_event.target.closest('.guan_chip');
      if (guan_target) {
        guan_send(guan_target.getAttribute('data-guan-question') || guan_target.textContent);
      }
    });
  }

  guan_check_all.addEventListener('change', function () {
    var guan_boxes = guan_doc_filter.querySelectorAll('input[type="checkbox"]');
    for (var guan_i = 0; guan_i < guan_boxes.length; guan_i += 1) {
      guan_boxes[guan_i].checked = guan_check_all.checked;
    }
  });

  guan_topk.addEventListener('input', function () {
    guan_topk_val.textContent = guan_topk.value;
    guan_chat_meta.textContent = (guan_model_name.textContent || 'model').split('/').pop() + ' / TopK=' + guan_topk.value;
  });

  guan_clear_btn.addEventListener('click', function () {
    if (!guan_history.length && !guan_chat_body.querySelector('.guan_msg')) {
      return;
    }
    if (!window.confirm('确定清空当前会话？历史上下文将一并丢弃。')) {
      return;
    }
    guan_history = [];
    guan_session_id = null;
    guan_session_id_el.textContent = '—';
    guan_hit_state.textContent = '待提问';
    guan_chat_body.innerHTML =
      '<div class="guan_welcome" id="guan_welcome">' +
      '<span class="guan_brand_mark" style="width:54px;height:54px;border-radius:16px;font-size:15px;">AI</span>' +
      '<h2 class="guan_welcome_title">会话已清空</h2>' +
      '<p class="guan_welcome_text">历史上下文已丢弃，可以开始新的提问。后续回答仍会标注知识库引用来源。</p>' +
      '</div>';
    guan_welcome = document.getElementById('guan_welcome');
    console.clear();
    console.log('%c[RAG] 会话已清空，历史上下文重置', 'color:#93a3c4');
    guan_input.focus();
  });

  console.log('%c[RAG 智能问答] 页面已就绪', 'color:#56d8ff;font-weight:700',
    '\n接口：' + guan_api_base + '/ai/rag-chat\n提示：问题参数、模型回答与引用片段都会打印在本控制台。');
  guan_init();
})();
