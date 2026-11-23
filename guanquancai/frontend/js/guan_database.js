/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：数据库连接测试页脚本 —— 提交用户名密码到 /api/db/test，成功与失败均有提示。
 */
(function () {
  'use strict';

  var guan_form = document.getElementById('guan_db_form');
  var guan_user_input = document.getElementById('guan_db_user');
  var guan_password_input = document.getElementById('guan_db_password');
  var guan_submit_btn = document.getElementById('guan_db_submit');
  var guan_result_box = document.getElementById('guan_db_result');
  var guan_result_title = document.getElementById('guan_db_result_title');
  var guan_result_desc = document.getElementById('guan_db_result_desc');
  var guan_result_list = document.getElementById('guan_db_result_list');
  var guan_env_list = document.getElementById('guan_db_env_list');

  /** 渲染结果面板 */
  function guan_show_result(guan_state, guan_title, guan_desc, guan_items) {
    if (!guan_result_box) {
      return;
    }
    guan_result_box.setAttribute('data-guan_state', guan_state);
    if (guan_result_title) {
      guan_result_title.textContent = guan_title;
    }
    if (guan_result_desc) {
      guan_result_desc.textContent = guan_desc;
    }
    if (guan_result_list) {
      guan_result_list.innerHTML = '';
      (guan_items || []).forEach(function (guan_item) {
        var guan_li = document.createElement('li');
        var guan_key = document.createElement('span');
        var guan_value = document.createElement('strong');
        guan_key.textContent = guan_item.guan_label;
        guan_value.textContent = guan_item.guan_value;
        guan_li.appendChild(guan_key);
        guan_li.appendChild(guan_value);
        guan_result_list.appendChild(guan_li);
      });
    }
  }

  /** 提交测试 */
  async function guan_handle_submit(guan_event) {
    guan_event.preventDefault();

    var guan_user = guan_user_input ? guan_user_input.value.trim() : '';
    var guan_password = guan_password_input ? guan_password_input.value : '';

    if (!guan_user || !guan_password) {
      guan_show_result('fail', '无法测试', '用户名和密码都不能为空，请补全后重试。', []);
      console.error('[guanquancai] 数据库测试参数不完整：用户名或密码为空');
      return;
    }

    guan_show_result('loading', '正在连接…', '正在请求 /api/db/test，请稍候。', []);
    if (guan_submit_btn) {
      guan_submit_btn.disabled = true;
      guan_submit_btn.textContent = '连接中…';
    }

    try {
      var guan_res = await fetch('./api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          guan_user: guan_user,
          guan_password: guan_password
        })
      });
      var guan_json = await guan_res.json();

      if (guan_json.code === 0) {
        console.log('[guanquancai] /api/db/test 连接成功：', guan_json);
        guan_show_result('ok', '连接成功', guan_json.msg + '，数据库可正常读写。', [
          { guan_label: '数据库类型', guan_value: guan_json.data.guan_db_type },
          { guan_label: '数据库名称', guan_value: guan_json.data.guan_db_name },
          { guan_label: '数据库版本', guan_value: guan_json.data.guan_version },
          { guan_label: 'guan_page 记录数', guan_value: String(guan_json.data.guan_page_total) },
          { guan_label: '测试时间', guan_value: guan_json.data.guan_time }
        ]);
      } else {
        console.error('[guanquancai] /api/db/test 连接失败：', guan_json);
        guan_show_result('fail', '连接失败', guan_json.msg, [
          { guan_label: '错误码', guan_value: String(guan_json.code) },
          { guan_label: '数据库类型', guan_value: (guan_json.data && guan_json.data.guan_db_type) || 'SQLite' }
        ]);
      }
    } catch (guan_err) {
      console.error('[guanquancai] 数据库测试请求异常：', guan_err);
      guan_show_result('fail', '请求失败',
        '无法访问后端接口，请确认已通过 启动后台.bat 或 npm start 启动服务（http://localhost:8301）。', []);
    } finally {
      if (guan_submit_btn) {
        guan_submit_btn.disabled = false;
        guan_submit_btn.textContent = '连接数据库';
      }
    }
  }

  /** 读取当前数据库配置（不含密码） */
  async function guan_load_db_info() {
    if (!guan_env_list) {
      return;
    }
    try {
      var guan_res = await fetch('./api/db/info', { headers: { Accept: 'application/json' } });
      var guan_json = await guan_res.json();
      console.log('[guanquancai] /api/db/info 返回数据：', guan_json);

      var guan_rows = [
        ['数据库类型', guan_json.data.guan_db_type],
        ['数据库名称', guan_json.data.guan_db_name],
        ['主机', guan_json.data.guan_db_host],
        ['用户名', guan_json.data.guan_db_user]
      ];

      guan_env_list.innerHTML = '';
      guan_rows.forEach(function (guan_row) {
        var guan_li = document.createElement('li');
        var guan_key = document.createElement('span');
        var guan_value = document.createElement('strong');
        guan_key.textContent = guan_row[0];
        guan_value.textContent = guan_row[1];
        guan_li.appendChild(guan_key);
        guan_li.appendChild(guan_value);
        guan_env_list.appendChild(guan_li);
      });
    } catch (guan_err) {
      console.error('[guanquancai] 读取数据库信息失败：', guan_err);
      guan_env_list.innerHTML = '<li><span>状态</span><strong>未连接后端接口</strong></li>';
    }
  }

  if (guan_form) {
    guan_form.addEventListener('submit', guan_handle_submit);
    guan_form.addEventListener('reset', function () {
      window.setTimeout(function () {
        guan_show_result('idle', '等待测试', '请输入用户名和密码后点击“连接数据库”。', []);
      }, 0);
    });
  }

  guan_load_db_info();
})();
