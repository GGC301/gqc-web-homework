/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：模仿菜鸟教程首页的交互 —— 分类筛选、关键词搜索、轻提示与接口数据统计。
 */
(function () {
  'use strict';

  var guan_items = Array.prototype.slice.call(document.querySelectorAll('.guan_rb_item'));
  var guan_groups = Array.prototype.slice.call(document.querySelectorAll('.guan_rb_group'));
  var guan_chips = Array.prototype.slice.call(document.querySelectorAll('.guan_rb_chip'));
  var guan_search_input = document.getElementById('guan_rb_search');
  var guan_search_btn = document.getElementById('guan_rb_search_btn');
  var guan_empty_tip = document.getElementById('guan_rb_empty');
  var guan_toast_box = document.getElementById('guan_rb_toast');
  var guan_active_cat = 'all';
  var guan_keyword = '';
  var guan_toast_timer = 0;

  /* ============ 一、筛选与搜索 ============ */
  function guan_apply_filter() {
    var guan_visible_total = 0;

    guan_groups.forEach(function (guan_group) {
      var guan_group_cat = guan_group.getAttribute('data-guan-group');
      var guan_group_visible = 0;

      Array.prototype.forEach.call(guan_group.querySelectorAll('.guan_rb_item'), function (guan_item) {
        var guan_item_cat = guan_item.getAttribute('data-guan-cat');
        var guan_name = (guan_item.getAttribute('data-guan-name') || '').toLowerCase();
        var guan_desc = (guan_item.querySelector('.guan_rb_item_desc') || {}).textContent || '';
        var guan_cat_ok = guan_active_cat === 'all' || guan_item_cat === guan_active_cat;
        var guan_text_ok = !guan_keyword
          || guan_name.indexOf(guan_keyword) !== -1
          || guan_desc.toLowerCase().indexOf(guan_keyword) !== -1;

        var guan_show = guan_cat_ok && guan_text_ok;
        guan_item.style.display = guan_show ? '' : 'none';
        if (guan_show) {
          guan_group_visible += 1;
        }
      });

      var guan_group_show = guan_group_visible > 0
        && (guan_active_cat === 'all' || guan_group_cat === guan_active_cat);
      guan_group.style.display = guan_group_show ? '' : 'none';
      if (guan_group_show) {
        guan_visible_total += guan_group_visible;
      }
    });

    if (guan_empty_tip) {
      guan_empty_tip.hidden = guan_visible_total > 0;
    }
    console.log('[guanquancai] 教程筛选：分类=' + guan_active_cat + '，关键词="' + guan_keyword + '"，命中 ' + guan_visible_total + ' 篇');
  }

  guan_chips.forEach(function (guan_chip) {
    guan_chip.addEventListener('click', function () {
      guan_chips.forEach(function (guan_other) {
        guan_other.classList.remove('guan_rb_chip_active');
      });
      guan_chip.classList.add('guan_rb_chip_active');
      guan_active_cat = guan_chip.getAttribute('data-guan-cat') || 'all';
      guan_apply_filter();
    });
  });

  function guan_do_search() {
    guan_keyword = guan_search_input ? guan_search_input.value.trim().toLowerCase() : '';
    guan_apply_filter();
  }

  if (guan_search_btn) {
    guan_search_btn.addEventListener('click', guan_do_search);
  }

  if (guan_search_input) {
    guan_search_input.addEventListener('keydown', function (guan_event) {
      if (guan_event.key === 'Enter') {
        guan_event.preventDefault();
        guan_do_search();
      }
    });
    guan_search_input.addEventListener('input', function () {
      if (!guan_search_input.value) {
        guan_do_search();
      }
    });
  }

  /* ============ 二、轻提示 ============ */
  function guan_show_toast(guan_text) {
    if (!guan_toast_box) {
      return;
    }
    guan_toast_box.textContent = guan_text;
    guan_toast_box.hidden = false;
    window.clearTimeout(guan_toast_timer);
    window.setTimeout(function () {
      guan_toast_box.setAttribute('data-guan_show', '1');
    }, 10);
    guan_toast_timer = window.setTimeout(function () {
      guan_toast_box.setAttribute('data-guan_show', '0');
      window.setTimeout(function () {
        guan_toast_box.hidden = true;
      }, 260);
    }, 2000);
  }

  document.addEventListener('click', function (guan_event) {
    var guan_link = guan_event.target.closest ? guan_event.target.closest('[data-guan-name]') : null;
    if (!guan_link) {
      return;
    }
    var guan_href = guan_link.getAttribute('href') || '';
    if (guan_href !== '#') {
      return;
    }
    guan_event.preventDefault();
    var guan_name = guan_link.getAttribute('data-guan-name');
    guan_show_toast('《' + guan_name + '》章节页尚未创建，本页为版式模仿练习。');
    console.log('[guanquancai] 点击教程：' + guan_name + '（章节页暂未创建）');
  });

  /* ============ 三、接口数据统计 ============ */
  async function guan_load_stats() {
    var guan_time_el = document.getElementById('guan_rb_load_ms');
    var guan_total_el = document.getElementById('guan_rb_page_total');
    var guan_start = (window.performance && window.performance.now) ? window.performance.now() : Date.now();

    try {
      var guan_res = await fetch('./api/pages', { headers: { Accept: 'application/json' } });
      var guan_json = await guan_res.json();
      console.log('[guanquancai] /api/pages 返回数据：', guan_json);
      if (guan_total_el) {
        guan_total_el.textContent = String(guan_json.data.guan_total);
      }
    } catch (guan_err) {
      console.error('[guanquancai] 读取接口数据失败：', guan_err);
      if (guan_total_el) {
        guan_total_el.textContent = '未连接';
      }
    }

    if (guan_time_el) {
      var guan_end = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
      guan_time_el.textContent = Math.max(1, Math.round(guan_end - guan_start)) + ' ms';
    }
  }

  guan_apply_filter();
  guan_load_stats();
})();
