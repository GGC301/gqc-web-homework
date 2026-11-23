/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：基础 AI 聊天页脚本 —— 会话列表、消息渲染（简易 Markdown）、发送与历史压缩提示。
 *      所有请求与响应均打印到浏览器控制台。
 */
(function () {
  'use strict';

  var guan_api = './api/chat';
  var guan_state = {
    guan_talk_id: 0,
    guan_talks: [],
    guan_sending: false
  };

  var guan_el_talk_list = document.getElementById('guan_chat_talk_list');
  var guan_el_talk_note = document.getElementById('guan_chat_talk_note');
  var guan_el_budget = document.getElementById('guan_chat_budget');
  var guan_el_title = document.getElementById('guan_chat_title');
  var guan_el_meta = document.getElementById('guan_chat_meta');
  var guan_el_messages = document.getElementById('guan_chat_messages');
  var guan_el_form = document.getElementById('guan_chat_form');
  var guan_el_input = document.getElementById('guan_chat_input');
  var guan_el_send = document.getElementById('guan_chat_send_btn');
  var guan_el_new = document.getElementById('guan_chat_new_btn');
  var guan_el_tip = document.getElementById('guan_chat_tip');

  /* ================= 工具 ================= */
  function guan_request(guan_path, guan_options) {
    var guan_opts = guan_options || {};
    var guan_headers = Object.assign({ 'Content-Type': 'application/json' }, guan_opts.headers || {});
    console.log('[聊天] 请求：' + (guan_opts.method || 'GET') + ' ' + guan_api + guan_path, guan_opts.body || '');

    return fetch(guan_api + guan_path, Object.assign({}, guan_opts, { headers: guan_headers }))
      .then(function (guan_res) {
        return guan_res.json().then(function (guan_json) {
          console.log('[聊天] 响应：', guan_json);
          return guan_json;
        });
      })
      .catch(function (guan_err) {
        console.error('[聊天] 请求失败：', guan_err);
        throw guan_err;
      });
  }

  function guan_escape(guan_text) {
    return String(guan_text == null ? '' : guan_text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** 简易 Markdown：代码块 / 行内代码 / 加粗 / 无序与有序列表 / 段落 */
  function guan_markdown(guan_text) {
    var guan_blocks = [];
    var guan_text_escaped = guan_escape(guan_text);

    guan_text_escaped = guan_text_escaped.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, function (guan_all, guan_code) {
      guan_blocks.push(guan_code.replace(/\n$/, ''));
      return '\u0001' + (guan_blocks.length - 1) + '\u0001';
    });

    guan_text_escaped = guan_text_escaped
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    var guan_lines = guan_text_escaped.split('\n');
    var guan_html = '';
    var guan_list_open = false;

    function guan_close_list() {
      if (guan_list_open) {
        guan_html += '</ul>';
        guan_list_open = false;
      }
    }

    guan_lines.forEach(function (guan_line) {
      var guan_item = guan_line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
      if (guan_item) {
        if (!guan_list_open) {
          guan_html += '<ul>';
          guan_list_open = true;
        }
        guan_html += '<li>' + guan_item[1] + '</li>';
        return;
      }
      guan_close_list();
      if (!guan_line.trim()) {
        return;
      }
      guan_html += '<p>' + guan_line + '</p>';
    });
    guan_close_list();

    guan_html = guan_html.replace(/\u0001(\d+)\u0001/g, function (guan_all, guan_index) {
      return '<pre><code>' + guan_blocks[Number(guan_index)] + '</code></pre>';
    });

    return guan_html || '<p></p>';
  }

  function guan_scroll_bottom() {
    guan_el_messages.scrollTop = guan_el_messages.scrollHeight;
  }

  /* ================= 渲染 ================= */
  function guan_render_talks(guan_list) {
    guan_state.guan_talks = guan_list || [];
    guan_el_talk_list.innerHTML = '';
    guan_el_talk_note.textContent = '共 ' + guan_state.guan_talks.length + ' 个';

    if (!guan_state.guan_talks.length) {
      guan_el_talk_list.appendChild(guan_el('div', 'guan_app_empty', '还没有会话，点右上角新建'));
      return;
    }

    guan_state.guan_talks.forEach(function (guan_talk) {
      var guan_row = guan_el('div', 'guan_chat_talk_row');
      guan_row.dataset.guanId = guan_talk.guan_id;
      if (guan_talk.guan_id === guan_state.guan_talk_id) {
        guan_row.className += ' guan_chat_talk_active';
      }

      var guan_main = guan_el('span', 'guan_chat_talk_main');
      guan_main.appendChild(guan_el('span', 'guan_chat_talk_name', guan_talk.guan_title));
      guan_main.appendChild(guan_el(
        'span',
        'guan_chat_talk_meta',
        guan_talk.guan_turn_total + ' 条消息' + (guan_talk.guan_compress_total ? ' · 已压缩 ' + guan_talk.guan_compress_total : '')
      ));

      var guan_del = guan_el('button', 'guan_chat_talk_del', '删');
      guan_del.type = 'button';
      guan_del.addEventListener('click', function (guan_event) {
        guan_event.stopPropagation();
        guan_delete_talk(guan_talk);
      });

      guan_row.appendChild(guan_main);
      guan_row.appendChild(guan_del);
      guan_row.addEventListener('click', function () {
        guan_open_talk(guan_talk.guan_id);
      });
      guan_el_talk_list.appendChild(guan_row);
    });
  }

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

  function guan_append_message(guan_role, guan_content, guan_meta) {
    var guan_row = guan_el('div', 'guan_chat_msg' + (guan_role === 'user' ? ' guan_chat_msg_user' : ''));
    var guan_avatar = guan_el('span', 'guan_chat_avatar' + (guan_role === 'user' ? ' guan_chat_avatar_user' : ''), guan_role === 'user' ? '我' : 'AI');
    var guan_bubble = guan_el('div', 'guan_chat_bubble' + (guan_role === 'user' ? ' guan_chat_bubble_user' : ''));

    if (guan_role === 'user') {
      guan_bubble.textContent = guan_content;
    } else {
      guan_bubble.innerHTML = guan_markdown(guan_content);
    }

    if (guan_meta) {
      var guan_meta_row = guan_el('div', 'guan_chat_meta_row');
      guan_meta.forEach(function (guan_item) {
        guan_meta_row.appendChild(guan_el('span', 'guan_app_chip', guan_item));
      });
      guan_bubble.appendChild(guan_meta_row);
    }

    guan_row.appendChild(guan_avatar);
    guan_row.appendChild(guan_bubble);
    guan_el_messages.appendChild(guan_row);
    guan_scroll_bottom();
    return guan_row;
  }

  function guan_append_notice(guan_text) {
    guan_el_messages.appendChild(guan_el('div', 'guan_chat_notice', guan_text));
    guan_scroll_bottom();
  }

  function guan_open_talk(guan_talk_id) {
    guan_state.guan_talk_id = guan_talk_id;
    guan_request('/talks/' + guan_talk_id).then(function (guan_json) {
      if (guan_json.code !== 0) {
        guan_el_messages.innerHTML = '';
        guan_el_messages.appendChild(guan_el('div', 'guan_app_empty', guan_json.msg));
        return;
      }
      var guan_talk = guan_json.data.guan_talk;
      var guan_turns = guan_json.data.guan_turns || [];

      guan_el_title.textContent = guan_talk.guan_title;
      guan_el_meta.textContent = guan_turns.length + ' 条消息' +
        (guan_talk.guan_compress_total ? ' · 已压缩 ' + guan_talk.guan_compress_total + ' 条' : '');
      guan_el_messages.innerHTML = '';

      if (guan_talk.guan_summary) {
        guan_append_notice('历史摘要：' + guan_talk.guan_summary);
      }
      if (!guan_turns.length) {
        guan_el_messages.appendChild(guan_el('div', 'guan_app_empty', '还没有消息，发第一条试试'));
      }
      guan_turns.forEach(function (guan_turn) {
        guan_append_message(guan_turn.guan_role, guan_turn.guan_content,
          guan_turn.guan_compressed ? ['已压缩'] : null);
      });

      guan_load_talks(false);
      guan_el_input.focus();
    });
  }

  function guan_load_talks(guan_select_first) {
    return guan_request('/talks?guan_limit=30').then(function (guan_json) {
      if (guan_json.code !== 0) {
        return [];
      }
      guan_render_talks(guan_json.data.guan_list || []);
      var guan_budget = guan_json.data.guan_budget || {};
      guan_el_budget.textContent = '压缩阈值：原文最多 ' + (guan_budget.guan_live_limit || 12) + ' 条 / '
        + (guan_budget.guan_char_budget || 1800) + ' 字，压缩后保留最近 ' + (guan_budget.guan_keep_turns || 6) + ' 条';

      if (guan_select_first && !guan_state.guan_talk_id && guan_json.data.guan_list.length) {
        guan_open_talk(guan_json.data.guan_list[0].guan_id);
      }
      return guan_json.data.guan_list;
    });
  }

  function guan_create_talk() {
    guan_request('/talks', { method: 'POST', body: JSON.stringify({ guan_title: '新的对话' }) })
      .then(function (guan_json) {
        if (guan_json.code !== 0) {
          return;
        }
        guan_state.guan_talk_id = guan_json.data.guan_talk.guan_id;
        guan_el_messages.innerHTML = '';
        guan_el_title.textContent = guan_json.data.guan_talk.guan_title;
        guan_el_meta.textContent = '0 条消息';
        guan_el_messages.appendChild(guan_el('div', 'guan_app_empty', '新会话已创建，输入问题开始对话'));
        guan_load_talks(false);
        guan_el_input.focus();
      });
  }

  function guan_delete_talk(guan_talk) {
    if (!window.confirm('删除会话《' + guan_talk.guan_title + '》及其 ' + guan_talk.guan_turn_total + ' 条消息？')) {
      return;
    }
    guan_request('/talks/' + guan_talk.guan_id, { method: 'DELETE' }).then(function (guan_json) {
      if (guan_json.code !== 0) {
        return;
      }
      if (guan_state.guan_talk_id === guan_talk.guan_id) {
        guan_state.guan_talk_id = 0;
        guan_el_title.textContent = '未选择会话';
        guan_el_meta.textContent = '—';
        guan_el_messages.innerHTML = '';
        guan_el_messages.appendChild(guan_el('div', 'guan_app_empty', '会话已删除，可新建一个对话'));
      }
      guan_load_talks(true);
    });
  }

  /* ================= 发送 ================= */
  function guan_send() {
    var guan_question = String(guan_el_input.value || '').trim();
    if (!guan_question) {
      guan_el_tip.textContent = '请输入内容后再发送';
      return;
    }
    if (guan_state.guan_sending) {
      return;
    }
    if (!guan_state.guan_talk_id) {
      guan_el_tip.textContent = '请先新建或选择一个会话';
      return;
    }

    guan_state.guan_sending = true;
    guan_el_send.disabled = true;
    guan_el_send.textContent = '发送中…';
    guan_el_input.value = '';

    if (guan_el_messages.querySelector('.guan_app_empty')) {
      guan_el_messages.innerHTML = '';
    }
    guan_append_message('user', guan_question);
    var guan_typing = guan_el('div', 'guan_chat_typing', '模型正在思考…');
    guan_el_messages.appendChild(guan_typing);
    guan_scroll_bottom();

    guan_request('/send', {
      method: 'POST',
      body: JSON.stringify({ guan_talk_id: guan_state.guan_talk_id, guan_question: guan_question })
    }).then(function (guan_json) {
      if (guan_typing.parentNode) {
        guan_typing.parentNode.removeChild(guan_typing);
      }
      guan_state.guan_sending = false;
      guan_el_send.disabled = false;
      guan_el_send.textContent = '发送';

      if (guan_json.code !== 0) {
        guan_append_notice('回答失败：' + guan_json.msg);
        return;
      }

      var guan_data = guan_json.data;
      if (guan_data.guan_compressed_total > 0) {
        guan_append_notice('本轮触发历史压缩：' + guan_data.guan_compressed_total + ' 条早期消息已压成摘要');
      }
      guan_append_message('assistant', guan_data.guan_answer, [
        '模型 ' + guan_data.guan_model,
        '上下文 ' + guan_data.guan_message_total + ' 条',
        '原文 ' + guan_data.guan_history_turns + ' 条',
        (guan_data.guan_elapsed || 0) + ' ms',
        ((guan_data.guan_usage && guan_data.guan_usage.total_tokens) || 0) + ' tokens'
      ]);

      guan_el_meta.textContent = guan_data.guan_talk.guan_turn_total + ' 条消息' +
        (guan_data.guan_talk.guan_compress_total ? ' · 已压缩 ' + guan_data.guan_talk.guan_compress_total + ' 条' : '');
      guan_el_tip.textContent = 'Enter 发送 · Shift + Enter 换行';
      guan_load_talks(false);
    }).catch(function () {
      if (guan_typing.parentNode) {
        guan_typing.parentNode.removeChild(guan_typing);
      }
      guan_state.guan_sending = false;
      guan_el_send.disabled = false;
      guan_el_send.textContent = '发送';
      guan_append_notice('网络异常，请确认后端服务已启动');
    });
  }

  guan_el_form.addEventListener('submit', function (guan_event) {
    guan_event.preventDefault();
    guan_send();
  });

  guan_el_input.addEventListener('keydown', function (guan_event) {
    if (guan_event.key === 'Enter' && !guan_event.shiftKey) {
      guan_event.preventDefault();
      guan_send();
    }
  });

  guan_el_new.addEventListener('click', guan_create_talk);

  guan_load_talks(true);
})();
