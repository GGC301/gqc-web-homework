/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：首页交互脚本 —— 导航平滑滚动、后端接口连通性检测（canvas 动画见 guan_bg.js）。
 */
(function () {
  'use strict';

  var guan_reduce_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ 一、导航平滑滚动 ============ */
  function guan_bind_nav() {
    var guan_links = document.querySelectorAll('.guan_nav_link');
    Array.prototype.forEach.call(guan_links, function (guan_link) {
      guan_link.addEventListener('click', function (guan_event) {
        var guan_hash = guan_link.getAttribute('href') || '';
        if (guan_hash.charAt(0) !== '#') {
          return;
        }
        var guan_target = document.querySelector(guan_hash);
        if (!guan_target) {
          return;
        }
        guan_event.preventDefault();
        guan_target.scrollIntoView({
          behavior: guan_reduce_motion ? 'auto' : 'smooth',
          block: 'start'
        });
        Array.prototype.forEach.call(guan_links, function (guan_item) {
          guan_item.classList.remove('guan_nav_link_active');
        });
        guan_link.classList.add('guan_nav_link_active');
      });
    });
  }

  /* ============ 二、后端接口连通性检测 ============ */
  function guan_set_status(guan_state, guan_text) {
    var guan_box = document.getElementById('guan_api_status');
    if (!guan_box) {
      return;
    }
    guan_box.setAttribute('data-guan_state', guan_state);
    var guan_text_el = guan_box.querySelector('.guan_status_text');
    if (guan_text_el) {
      guan_text_el.textContent = guan_text;
    }
  }

  async function guan_check_api() {
    try {
      var guan_health_res = await fetch('./api/health', {
        headers: { Accept: 'application/json' }
      });
      if (!guan_health_res.ok) {
        throw new Error('HTTP ' + guan_health_res.status);
      }
      var guan_health_json = await guan_health_res.json();
      console.log('[guanquancai] /api/health 返回数据：', guan_health_json);
      guan_set_status('ok', '后端接口已连接（' + guan_health_json.msg + '）');

      var guan_pages_res = await fetch('./api/pages', {
        headers: { Accept: 'application/json' }
      });
      var guan_pages_json = await guan_pages_res.json();
      console.log('[guanquancai] /api/pages 返回数据：', guan_pages_json);
    } catch (guan_err) {
      console.error('[guanquancai] 接口请求失败：', guan_err);
      guan_set_status('fail', '未连接后端接口（请用 启动后台.bat 或 npm start 启动服务后访问）');
    }
  }

  guan_bind_nav();
  guan_check_api();
})();
