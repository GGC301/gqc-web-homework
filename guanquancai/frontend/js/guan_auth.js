/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：登录 / 注册页脚本 —— 表单切换、前端校验、调用 /api/auth/* 接口、
 *      把 token 存入 localStorage 并在下次打开页面时用 /api/auth/me 校验。
 *      所有请求与响应均输出到浏览器控制台。
 */
(function () {
  'use strict';

  var guan_api = './api/auth';
  var guan_token_key = 'guan_auth_token';

  var guan_el_tabs = document.getElementById('guan_auth_tabs');
  var guan_el_login_form = document.getElementById('guan_auth_login_form');
  var guan_el_reg_form = document.getElementById('guan_auth_register_form');
  var guan_el_login_btn = document.getElementById('guan_auth_login_btn');
  var guan_el_reg_btn = document.getElementById('guan_auth_register_btn');
  var guan_el_msg = document.getElementById('guan_auth_msg');
  var guan_el_profile = document.getElementById('guan_auth_profile');
  var guan_el_hint = document.querySelector('.guan_auth_hint');
  var guan_el_user_total = document.getElementById('guan_auth_user_total');

  var guan_inputs = {
    login_username: document.getElementById('guan_auth_login_username'),
    login_password: document.getElementById('guan_auth_login_password'),
    reg_username: document.getElementById('guan_auth_reg_username'),
    reg_nickname: document.getElementById('guan_auth_reg_nickname'),
    reg_password: document.getElementById('guan_auth_reg_password'),
    reg_password2: document.getElementById('guan_auth_reg_password2')
  };

  /* ================= 工具 ================= */
  function guan_get_token() {
    try {
      return window.localStorage.getItem(guan_token_key) || '';
    } catch (guan_err) {
      return '';
    }
  }

  function guan_set_token(guan_token) {
    try {
      window.localStorage.setItem(guan_token_key, guan_token);
    } catch (guan_err) {
      console.error('[登录] 写入 localStorage 失败：', guan_err);
    }
  }

  function guan_clear_token() {
    try {
      window.localStorage.removeItem(guan_token_key);
    } catch (guan_err) {
      console.error('[登录] 清除 localStorage 失败：', guan_err);
    }
  }

  function guan_show_msg(guan_text, guan_type) {
    guan_el_msg.hidden = false;
    guan_el_msg.className = 'guan_auth_msg guan_auth_msg_' + (guan_type || 'info');
    guan_el_msg.textContent = guan_text;
  }

  function guan_mark_bad(guan_input, guan_bad) {
    if (!guan_input) {
      return;
    }
    guan_input.classList[guan_bad ? 'add' : 'remove']('guan_auth_input_bad');
  }

  /** 统一请求：自动带 Bearer token，日志打印请求与响应 */
  function guan_request(guan_path, guan_options) {
    var guan_opts = guan_options || {};
    var guan_headers = Object.assign({}, guan_opts.headers || {});
    var guan_token = guan_get_token();
    if (guan_token) {
      guan_headers.Authorization = 'Bearer ' + guan_token;
    }
    if (guan_opts.body) {
      guan_headers['Content-Type'] = 'application/json';
    }

    console.log('[登录] 请求：' + (guan_opts.method || 'GET') + ' ' + guan_api + guan_path, guan_opts.body || '');

    return fetch(guan_api + guan_path, Object.assign({}, guan_opts, { headers: guan_headers }))
      .then(function (guan_res) {
        return guan_res.json().then(function (guan_json) {
          console.log('[登录] 响应：', guan_json);
          return guan_json;
        });
      })
      .catch(function (guan_err) {
        console.error('[登录] 请求失败：', guan_err);
        throw guan_err;
      });
  }

  /* ================= 视图切换 ================= */
  function guan_switch_tab(guan_tab) {
    Array.prototype.forEach.call(guan_el_tabs.children, function (guan_btn) {
      var guan_active = guan_btn.dataset.guanTab === guan_tab;
      guan_btn.className = 'guan_auth_tab' + (guan_active ? ' guan_auth_tab_active' : '');
      guan_btn.setAttribute('aria-selected', guan_active ? 'true' : 'false');
    });
    guan_el_login_form.hidden = guan_tab !== 'login';
    guan_el_reg_form.hidden = guan_tab !== 'register';
    guan_el_msg.hidden = true;
    console.log('[登录] 切换到' + (guan_tab === 'login' ? '登录' : '注册') + '表单');
  }

  function guan_show_profile(guan_user, guan_extra) {
    guan_el_tabs.hidden = true;
    guan_el_login_form.hidden = true;
    guan_el_reg_form.hidden = true;
    if (guan_el_hint) {
      guan_el_hint.hidden = true;
    }
    guan_el_profile.hidden = false;

    var guan_name = guan_user.guan_nickname || guan_user.guan_username;
    document.getElementById('guan_auth_profile_name').textContent = guan_name;
    document.getElementById('guan_auth_profile_sub').textContent =
      (guan_extra && guan_extra.guan_sign_type ? guan_extra.guan_sign_type + ' 签名 token 已通过校验' : '已登录');
    document.getElementById('guan_auth_avatar').textContent = String(guan_name).slice(0, 2).toUpperCase();
    document.getElementById('guan_auth_meta_username').textContent = guan_user.guan_username;
    document.getElementById('guan_auth_meta_role').textContent = guan_user.guan_role === 'admin' ? '管理员' : '普通用户';
    document.getElementById('guan_auth_meta_count').textContent = guan_user.guan_login_total + ' 次';
    document.getElementById('guan_auth_meta_last').textContent = guan_user.guan_last_login || '首次登录';
  }

  function guan_show_forms() {
    guan_el_tabs.hidden = false;
    guan_el_profile.hidden = true;
    if (guan_el_hint) {
      guan_el_hint.hidden = false;
    }
    guan_switch_tab('login');
  }

  /* ================= 统计 ================= */
  function guan_load_stats() {
    guan_request('/users').then(function (guan_json) {
      if (guan_json.code === 0 && guan_json.data && guan_json.data.guan_stats) {
        guan_el_user_total.textContent = guan_json.data.guan_stats.guan_user_total + ' 个';
      }
    }).catch(function () {
      guan_el_user_total.textContent = '—';
    });
  }

  /* ================= 登录 ================= */
  function guan_do_login(guan_event) {
    guan_event.preventDefault();
    var guan_username = String(guan_inputs.login_username.value || '').trim();
    var guan_password = String(guan_inputs.login_password.value || '');

    guan_mark_bad(guan_inputs.login_username, !guan_username);
    guan_mark_bad(guan_inputs.login_password, !guan_password);

    if (!guan_username || !guan_password) {
      guan_show_msg('请填写用户名与密码', 'bad');
      return;
    }

    guan_el_login_btn.disabled = true;
    guan_el_login_btn.textContent = '登录中…';

    guan_request('/login', {
      method: 'POST',
      body: JSON.stringify({ guan_username: guan_username, guan_password: guan_password })
    }).then(function (guan_json) {
      guan_el_login_btn.disabled = false;
      guan_el_login_btn.textContent = '登录';
      if (guan_json.code !== 0) {
        guan_show_msg(guan_json.msg, 'bad');
        guan_mark_bad(guan_inputs.login_password, true);
        return;
      }
      guan_set_token(guan_json.data.guan_token);
      guan_show_msg(guan_json.msg + '，正在进入首页…', 'ok');
      guan_show_profile(guan_json.data.guan_user, { guan_sign_type: 'HMAC-SHA256' });
      guan_load_stats();
      window.setTimeout(function () {
        window.location.href = './index.html';
      }, 1100);
    }).catch(function () {
      guan_el_login_btn.disabled = false;
      guan_el_login_btn.textContent = '登录';
      guan_show_msg('网络异常，请确认后端服务已启动（npm start）', 'bad');
    });
  }

  /* ================= 注册 ================= */
  function guan_do_register(guan_event) {
    guan_event.preventDefault();
    var guan_username = String(guan_inputs.reg_username.value || '').trim();
    var guan_nickname = String(guan_inputs.reg_nickname.value || '').trim();
    var guan_password = String(guan_inputs.reg_password.value || '');
    var guan_password2 = String(guan_inputs.reg_password2.value || '');

    var guan_rules = [
      { guan_input: guan_inputs.reg_username, guan_bad: !/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(guan_username) },
      { guan_input: guan_inputs.reg_password, guan_bad: guan_password.length < 6 || guan_password.length > 32 || !/[a-zA-Z]/.test(guan_password) || !/\d/.test(guan_password) },
      { guan_input: guan_inputs.reg_password2, guan_bad: guan_password2 !== guan_password || !guan_password2 }
    ];

    var guan_bad_count = 0;
    guan_rules.forEach(function (guan_rule) {
      guan_mark_bad(guan_rule.guan_input, guan_rule.guan_bad);
      if (guan_rule.guan_bad) {
        guan_bad_count += 1;
      }
    });

    if (guan_bad_count > 0) {
      guan_show_msg('用户名需字母开头 3-20 位；密码 6-32 位且含字母与数字；两次密码需一致', 'bad');
      return;
    }

    guan_el_reg_btn.disabled = true;
    guan_el_reg_btn.textContent = '注册中…';

    guan_request('/register', {
      method: 'POST',
      body: JSON.stringify({
        guan_username: guan_username,
        guan_password: guan_password,
        guan_nickname: guan_nickname
      })
    }).then(function (guan_json) {
      guan_el_reg_btn.disabled = false;
      guan_el_reg_btn.textContent = '注册并登录';
      if (guan_json.code !== 0) {
        guan_show_msg(guan_json.msg, 'bad');
        return;
      }
      guan_set_token(guan_json.data.guan_token);
      guan_show_msg(guan_json.msg + '，正在进入首页…', 'ok');
      guan_show_profile(guan_json.data.guan_user, { guan_sign_type: 'HMAC-SHA256' });
      guan_load_stats();
      window.setTimeout(function () {
        window.location.href = './index.html';
      }, 1100);
    }).catch(function () {
      guan_el_reg_btn.disabled = false;
      guan_el_reg_btn.textContent = '注册并登录';
      guan_show_msg('网络异常，请确认后端服务已启动（npm start）', 'bad');
    });
  }

  /* ================= 退出 ================= */
  function guan_do_logout() {
    guan_request('/logout', { method: 'POST' }).then(function () {
      guan_clear_token();
      guan_show_forms();
      guan_show_msg('已退出登录，token 已从本地清除', 'info');
      guan_load_stats();
    }).catch(function () {
      guan_clear_token();
      guan_show_forms();
      guan_show_msg('已退出登录', 'info');
    });
  }

  /* ================= 初始化 ================= */
  guan_el_tabs.addEventListener('click', function (guan_event) {
    var guan_target = guan_event.target;
    if (guan_target && guan_target.dataset && guan_target.dataset.guanTab) {
      guan_switch_tab(guan_target.dataset.guanTab);
    }
  });

  guan_el_login_form.addEventListener('submit', guan_do_login);
  guan_el_reg_form.addEventListener('submit', guan_do_register);
  document.getElementById('guan_auth_logout_btn').addEventListener('click', guan_do_logout);

  [guan_inputs.login_username, guan_inputs.login_password, guan_inputs.reg_username,
    guan_inputs.reg_password, guan_inputs.reg_password2].forEach(function (guan_input) {
    guan_input.addEventListener('input', function () {
      guan_mark_bad(guan_input, false);
    });
  });

  guan_load_stats();

  // 已有 token 则向后端校验一次，避免过期 token 被当成已登录
  if (guan_get_token()) {
    guan_request('/me').then(function (guan_json) {
      if (guan_json.code === 0 && guan_json.data) {
        guan_show_profile(guan_json.data.guan_user, guan_json.data);
        guan_show_msg('检测到本地 token，已通过服务端签名校验', 'ok');
      } else {
        guan_clear_token();
        guan_show_forms();
        guan_show_msg('本地 token 已失效（' + guan_json.msg + '），请重新登录', 'info');
      }
    }).catch(function () {
      guan_show_forms();
    });
  }
})();
