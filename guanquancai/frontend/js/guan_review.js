/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-16 | 大模型：deepseek-v4.1-flash
 * 说明：商业评论情感分析页脚本 —— Excel 上传（带进度）、饼图绘制、精选评论、
 *      逐条判定明细筛选与历史批次管理。所有请求与响应均输出到浏览器控制台。
 */
(function () {
  'use strict';

  var guan_api_base = './api';
  var guan_label_colors = { good: '#3ee097', neutral: '#ffc65c', bad: '#ff7b93' };
  var guan_label_names = { good: '好评', neutral: '中评', bad: '差评' };
  var guan_max_bytes = 10 * 1024 * 1024;

  var guan_state = {
    guan_batch: null,
    guan_items: [],
    guan_pie: [],
    guan_featured: [],
    guan_filter: 'all',
    guan_keyword: '',
    guan_uploading: false,
    guan_search_timer: null
  };

  /* ================= DOM ================= */
  var guan_dropzone = document.getElementById('guan_review_dropzone');
  var guan_file_input = document.getElementById('guan_review_file_input');
  var guan_drop_meta = document.getElementById('guan_review_drop_meta');
  var guan_progress = document.getElementById('guan_review_progress');
  var guan_progress_bar = document.getElementById('guan_review_progress_bar');
  var guan_progress_text = document.getElementById('guan_review_progress_text');
  var guan_sample_list = document.getElementById('guan_review_sample_list');
  var guan_batch_list = document.getElementById('guan_review_batch_list');
  var guan_batch_note = document.getElementById('guan_review_batch_note');
  var guan_result = document.getElementById('guan_review_result');
  var guan_result_file = document.getElementById('guan_review_result_file');
  var guan_result_meta = document.getElementById('guan_review_result_meta');
  var guan_donut_segments = document.getElementById('guan_review_donut_segments');
  var guan_total_el = document.getElementById('guan_review_total');
  var guan_legend = document.getElementById('guan_review_legend');
  var guan_summary = document.getElementById('guan_review_summary');
  var guan_featured_box = document.getElementById('guan_review_featured');
  var guan_featured_note = document.getElementById('guan_review_featured_note');
  var guan_items_box = document.getElementById('guan_review_items');
  var guan_items_empty = document.getElementById('guan_review_items_empty');
  var guan_item_note = document.getElementById('guan_review_item_note');
  var guan_filters = document.getElementById('guan_review_filters');
  var guan_search_input = document.getElementById('guan_review_search_input');

  /* ================= 工具 ================= */
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

  function guan_label_color(guan_label) {
    return guan_label_colors[guan_label] || '#93a3c4';
  }

  function guan_label_name(guan_label) {
    return guan_label_names[guan_label] || '中评';
  }

  function guan_request(guan_path, guan_options) {
    var guan_opts = guan_options || {};
    console.log('[评论分析] 请求：' + (guan_opts.method || 'GET') + ' ' + guan_api_base + guan_path, guan_opts.body || '');

    return fetch(guan_api_base + guan_path, guan_opts)
      .then(function (guan_res) {
        return guan_res.json().then(function (guan_json) {
          console.log('[评论分析] 响应：', guan_json);
          return guan_json;
        });
      })
      .catch(function (guan_err) {
        console.error('[评论分析] 请求失败：', guan_err);
        throw guan_err;
      });
  }

  /* ================= 样例下载 ================= */
  function guan_load_samples() {
    guan_request('/review/samples').then(function (guan_json) {
      guan_sample_list.innerHTML = '';
      if (guan_json.code !== 0 || !guan_json.data || !guan_json.data.guan_list) {
        guan_sample_list.appendChild(guan_el('span', 'guan_review_samples_note', '样例清单读取失败：' + guan_json.msg));
        return;
      }
      var guan_missing = 0;
      guan_json.data.guan_list.forEach(function (guan_sample) {
        if (!guan_sample.guan_exists) {
          guan_missing += 1;
          return;
        }
        var guan_link = guan_el('a', 'guan_review_sample_link', guan_sample.guan_filename);
        guan_link.href = guan_sample.guan_download;
        guan_link.setAttribute('download', guan_sample.guan_filename);
        guan_sample_list.appendChild(guan_link);
      });
      if (guan_missing > 0) {
        guan_sample_list.appendChild(guan_el(
          'span',
          'guan_review_samples_note',
          guan_missing + ' 份样例缺失，请在项目根目录执行 npm run genreview 生成'
        ));
      }
    }).catch(function () {
      guan_sample_list.innerHTML = '';
      guan_sample_list.appendChild(guan_el('span', 'guan_review_samples_note', '样例清单读取失败，请确认后端已启动'));
    });
  }

  /* ================= 历史批次 ================= */
  function guan_render_batches(guan_list) {
    guan_batch_list.innerHTML = '';
    if (!guan_list || guan_list.length === 0) {
      guan_batch_list.appendChild(guan_el('div', 'guan_review_empty', '还没有分析记录，上传一份 Excel 试试'));
      guan_batch_note.textContent = '共 0 个批次';
      return;
    }

    guan_batch_note.textContent = '共 ' + guan_list.length + ' 个批次';
    guan_list.forEach(function (guan_batch) {
      var guan_row = guan_el('div', 'guan_review_batch_row');
      guan_row.dataset.guanId = guan_batch.guan_id;
      if (guan_state.guan_batch && guan_state.guan_batch.guan_id === guan_batch.guan_id) {
        guan_row.className += ' guan_review_batch_row_active';
      }

      var guan_bar = guan_el('span', 'guan_review_batch_bar');
      var guan_total = guan_batch.guan_total || 1;
      [['good', guan_batch.guan_good], ['neutral', guan_batch.guan_neutral], ['bad', guan_batch.guan_bad]].forEach(function (guan_pair) {
        var guan_part = document.createElement('i');
        guan_part.className = 'guan_review_bar_' + guan_pair[0];
        guan_part.style.width = ((guan_pair[1] || 0) / guan_total) * 100 + '%';
        guan_bar.appendChild(guan_part);
      });

      var guan_main = guan_el('span', 'guan_review_batch_main');
      guan_main.appendChild(guan_el('span', 'guan_review_batch_name', guan_batch.guan_filename));
      guan_main.appendChild(guan_el(
        'span',
        'guan_review_batch_meta',
        guan_batch.guan_total + ' 条 · 好 ' + guan_batch.guan_good + ' / 中 ' + guan_batch.guan_neutral + ' / 差 ' + guan_batch.guan_bad + ' · ' + guan_batch.guan_created_at
      ));

      var guan_del = guan_el('button', 'guan_review_batch_del', '删除');
      guan_del.type = 'button';
      guan_del.addEventListener('click', function (guan_event) {
        guan_event.stopPropagation();
        guan_delete_batch(guan_batch);
      });

      guan_row.appendChild(guan_bar);
      guan_row.appendChild(guan_main);
      guan_row.appendChild(guan_del);
      guan_row.addEventListener('click', function () {
        guan_open_batch(guan_batch.guan_id, true);
      });

      guan_batch_list.appendChild(guan_row);
    });
  }

  function guan_load_batches(guan_selectLatest) {
    return guan_request('/review/batches?guan_limit=20').then(function (guan_json) {
      if (guan_json.code !== 0) {
        console.error('[评论分析] 批次列表异常：', guan_json.msg);
        return [];
      }
      var guan_list = guan_json.data.guan_list || [];
      guan_render_batches(guan_list);
      if (guan_selectLatest && guan_list.length > 0 && !guan_state.guan_batch) {
        guan_open_batch(guan_list[0].guan_id);
      }
      return guan_list;
    });
  }

  function guan_open_batch(guan_batch_id, guan_scroll) {
    guan_request('/review/batches/' + guan_batch_id).then(function (guan_json) {
      if (guan_json.code !== 0) {
        guan_drop_meta.textContent = '读取批次失败：' + guan_json.msg;
        return;
      }
      guan_render_result(guan_json.data, Boolean(guan_scroll));
      guan_load_batches(false);
    }).catch(function () {
      guan_drop_meta.textContent = '读取批次失败，请检查后端服务';
    });
  }

  function guan_delete_batch(guan_batch) {
    if (!window.confirm('确定删除批次《' + guan_batch.guan_filename + '》及其 ' + guan_batch.guan_total + ' 条评论吗？')) {
      return;
    }
    guan_request('/review/batches/' + guan_batch.guan_id, { method: 'DELETE' }).then(function (guan_json) {
      if (guan_json.code !== 0) {
        window.alert('删除失败：' + guan_json.msg);
        return;
      }
      if (guan_state.guan_batch && guan_state.guan_batch.guan_id === guan_batch.guan_id) {
        guan_state.guan_batch = null;
        guan_state.guan_items = [];
        guan_result.hidden = true;
      }
      guan_load_batches(false);
    });
  }

  /* ================= 饼图 ================= */
  function guan_render_pie(guan_pie, guan_total) {
    var guan_radius = 70;
    var guan_circumference = 2 * Math.PI * guan_radius;
    var guan_offset = 0;

    guan_donut_segments.innerHTML = '';
    guan_total_el.textContent = guan_total;

    var guan_safe_total = guan_total || 1;
    guan_pie.forEach(function (guan_slice) {
      if (!guan_slice.guan_count) {
        return;
      }
      var guan_length = (guan_slice.guan_count / guan_safe_total) * guan_circumference;
      var guan_circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      guan_circle.setAttribute('class', 'guan_review_donut_seg');
      guan_circle.setAttribute('cx', '100');
      guan_circle.setAttribute('cy', '100');
      guan_circle.setAttribute('r', String(guan_radius));
      guan_circle.setAttribute('stroke', guan_label_color(guan_slice.guan_label));
      guan_circle.setAttribute('stroke-dasharray', '0 ' + guan_circumference);
      guan_circle.setAttribute('stroke-dashoffset', String(-guan_offset));
      guan_donut_segments.appendChild(guan_circle);

      // 下一帧再赋真实长度，触发过渡动画
      (function (guan_node, guan_len, guan_full) {
        window.requestAnimationFrame(function () {
          guan_node.setAttribute('stroke-dasharray', guan_len + ' ' + (guan_full - guan_len));
        });
      })(guan_circle, guan_length, guan_circumference);

      guan_offset += guan_length;
    });
  }

  function guan_render_legend(guan_pie, guan_total) {
    guan_legend.innerHTML = '';
    guan_pie.forEach(function (guan_slice) {
      var guan_item = guan_el('li', 'guan_review_legend_item');
      var guan_dot = guan_el('span', 'guan_review_legend_dot');
      guan_dot.style.background = guan_label_color(guan_slice.guan_label);
      guan_item.appendChild(guan_dot);
      guan_item.appendChild(guan_el('span', 'guan_review_legend_name', guan_slice.guan_name));

      var guan_val = guan_el('span', 'guan_review_legend_val');
      var guan_strong = guan_el('strong', null, String(guan_slice.guan_count));
      guan_val.appendChild(guan_strong);
      guan_val.appendChild(document.createTextNode(guan_slice.guan_percent + '%'));
      guan_item.appendChild(guan_val);
      guan_legend.appendChild(guan_item);
    });

    guan_summary.innerHTML = '';
    var guan_good = guan_pie.filter(function (guan_slice) { return guan_slice.guan_label === 'good'; })[0];
    var guan_bad = guan_pie.filter(function (guan_slice) { return guan_slice.guan_label === 'bad'; })[0];
    var guan_avg = guan_state.guan_batch ? guan_state.guan_batch.guan_avg_score : 0;

    [
      { guan_key: '平均情感分', guan_val: guan_avg + ' 分' },
      { guan_key: '好评率', guan_val: (guan_good ? guan_good.guan_percent : 0) + '%' },
      { guan_key: '差评率', guan_val: (guan_bad ? guan_bad.guan_percent : 0) + '%' },
      { guan_key: '评论总数', guan_val: guan_total + ' 条' }
    ].forEach(function (guan_card) {
      var guan_box = guan_el('div', 'guan_review_summary_card');
      guan_box.appendChild(guan_el('span', 'guan_review_summary_key', guan_card.guan_key));
      guan_box.appendChild(guan_el('span', 'guan_review_summary_val', String(guan_card.guan_val)));
      guan_summary.appendChild(guan_box);
    });
  }

  /* ================= 精选评论 ================= */
  function guan_render_featured(guan_list) {
    guan_featured_box.innerHTML = '';
    guan_featured_note.textContent = '共 ' + guan_list.length + ' 条';

    if (!guan_list || guan_list.length === 0) {
      guan_featured_box.appendChild(guan_el('div', 'guan_review_empty', '暂无精选评论'));
      return;
    }

    guan_list.forEach(function (guan_item) {
      var guan_card = guan_el('article', 'guan_review_featured_card');
      guan_card.dataset.guanLabel = guan_item.guan_label;

      var guan_top = guan_el('div', 'guan_review_featured_top');
      guan_top.appendChild(guan_el('span', 'guan_review_badge guan_review_badge_' + guan_item.guan_label, guan_item.guan_label_name));
      guan_top.appendChild(guan_el('span', 'guan_review_badge guan_review_badge_value', '价值分 ' + guan_item.guan_value));
      guan_top.appendChild(guan_el('span', 'guan_review_featured_author', (guan_item.guan_author || '匿名') + ' · ' + (guan_item.guan_rating || '无') + ' 星'));

      guan_card.appendChild(guan_top);
      guan_card.appendChild(guan_el('p', 'guan_review_featured_text', guan_item.guan_content));

      if (guan_item.guan_tags) {
        var guan_tags = guan_el('div', 'guan_review_tags');
        String(guan_item.guan_tags).split('、').forEach(function (guan_tag) {
          if (guan_tag) {
            guan_tags.appendChild(guan_el('span', 'guan_review_tag_item', guan_tag));
          }
        });
        guan_card.appendChild(guan_tags);
      }

      guan_card.appendChild(guan_el('p', 'guan_review_featured_reason', '判定理由：' + (guan_item.guan_reason || '—')));
      guan_featured_box.appendChild(guan_card);
    });
  }

  /* ================= 明细 ================= */
  function guan_filtered_items() {
    var guan_keyword = guan_state.guan_keyword.toLowerCase();
    return guan_state.guan_items.filter(function (guan_item) {
      if (guan_state.guan_filter !== 'all' && guan_item.guan_label !== guan_state.guan_filter) {
        return false;
      }
      if (!guan_keyword) {
        return true;
      }
      var guan_haystack = [guan_item.guan_content, guan_item.guan_author, guan_item.guan_tags, guan_item.guan_reason]
        .join(' ').toLowerCase();
      return guan_haystack.indexOf(guan_keyword) >= 0;
    });
  }

  function guan_render_items() {
    var guan_list = guan_filtered_items();
    guan_items_box.innerHTML = '';
    guan_items_empty.hidden = guan_list.length > 0;
    guan_item_note.textContent = '显示 ' + guan_list.length + ' / ' + guan_state.guan_items.length + ' 条';

    guan_list.forEach(function (guan_item) {
      var guan_row = guan_el('div', 'guan_review_item_row');
      guan_row.appendChild(guan_el('span', 'guan_review_item_no', '#' + guan_item.guan_index));

      var guan_main = guan_el('div', 'guan_review_item_main');
      guan_main.appendChild(guan_el('p', 'guan_review_item_text', guan_item.guan_content));

      var guan_foot = guan_el('div', 'guan_review_item_foot');
      guan_foot.appendChild(guan_el('span', 'guan_review_badge guan_review_badge_' + guan_item.guan_label, guan_item.guan_label_name));
      guan_foot.appendChild(guan_el('span', null, (guan_item.guan_author || '匿名') + ' · ' + (guan_item.guan_time || '时间未知')));
      if (guan_item.guan_tags) {
        guan_foot.appendChild(guan_el('span', null, '标签：' + guan_item.guan_tags));
      }
      guan_foot.appendChild(guan_el('span', null, '理由：' + (guan_item.guan_reason || '—')));
      guan_main.appendChild(guan_foot);
      guan_row.appendChild(guan_main);

      var guan_side = guan_el('div', 'guan_review_item_side');
      var guan_score = guan_el('span', 'guan_review_score');
      guan_score.innerHTML = '情感分 <strong>' + guan_item.guan_score + '</strong>';
      guan_side.appendChild(guan_score);

      var guan_meter = guan_el('span', 'guan_review_score_meter');
      var guan_fill = document.createElement('i');
      guan_fill.style.width = Math.max(0, Math.min(100, guan_item.guan_score)) + '%';
      guan_fill.style.background = guan_label_color(guan_item.guan_label);
      guan_meter.appendChild(guan_fill);
      guan_side.appendChild(guan_meter);
      guan_side.appendChild(guan_el('span', 'guan_review_score', '价值分 ' + guan_item.guan_value));
      guan_row.appendChild(guan_side);

      guan_items_box.appendChild(guan_row);
    });
  }

  /* ================= 结果渲染 ================= */
  function guan_render_result(guan_data, guan_scroll) {
    guan_state.guan_batch = guan_data.guan_batch;
    guan_state.guan_items = guan_data.guan_items || [];
    guan_state.guan_pie = guan_data.guan_pie || [];
    guan_state.guan_featured = guan_data.guan_featured || [];

    var guan_batch = guan_data.guan_batch || {};
    guan_result.hidden = false;
    guan_result_file.textContent = guan_batch.guan_filename ? ' · ' + guan_batch.guan_filename : '';

    var guan_meta_parts = [];
    if (guan_batch.guan_model) {
      guan_meta_parts.push('模型 ' + guan_batch.guan_model);
    }
    if (guan_batch.guan_elapsed) {
      guan_meta_parts.push('耗时 ' + guan_batch.guan_elapsed + ' ms');
    }
    if (guan_batch.guan_usage && guan_batch.guan_usage.total_tokens) {
      guan_meta_parts.push('tokens ' + guan_batch.guan_usage.total_tokens);
    }
    guan_meta_parts.push('分析于 ' + (guan_batch.guan_created_at || '—'));
    if (guan_batch.guan_note) {
      guan_meta_parts.push('备注：' + guan_batch.guan_note);
    }
    guan_result_meta.textContent = guan_meta_parts.join('｜');

    guan_render_pie(guan_state.guan_pie, guan_data.guan_total || guan_state.guan_items.length);
    guan_render_legend(guan_state.guan_pie, guan_data.guan_total || guan_state.guan_items.length);
    guan_render_featured(guan_state.guan_featured);
    guan_render_items();

    if (guan_scroll) {
      window.scrollTo({ top: guan_result.offsetTop - 90, behavior: 'smooth' });
    }
  }

  /* ================= 上传 ================= */
  function guan_set_progress(guan_percent, guan_text) {
    guan_progress.hidden = false;
    guan_progress_bar.style.width = Math.max(0, Math.min(100, guan_percent)) + '%';
    guan_progress_text.textContent = guan_text;
  }

  function guan_upload_file(guan_file) {
    if (guan_state.guan_uploading) {
      return;
    }
    var guan_name = String(guan_file.name || '');
    if (!/\.xlsx$/i.test(guan_name)) {
      guan_drop_meta.textContent = '只支持 .xlsx 文件，请先用 Excel 另存为 .xlsx 格式';
      window.alert('只支持 .xlsx 文件，请先用 Excel 另存为 .xlsx 格式');
      return;
    }
    if (guan_file.size > guan_max_bytes) {
      guan_drop_meta.textContent = '文件超过 10 MB，请压缩或拆分后上传';
      return;
    }

    guan_state.guan_uploading = true;
    guan_dropzone.classList.add('guan_review_dropzone_busy');
    guan_set_progress(4, '正在上传《' + guan_name + '》…');

    var guan_form = new FormData();
    guan_form.append('file', guan_file);

    var guan_xhr = new XMLHttpRequest();
    guan_xhr.open('POST', guan_api_base + '/review/upload');
    console.log('[评论分析] 上传文件：' + guan_name + '（' + guan_file.size + ' 字节）');

    guan_xhr.upload.onprogress = function (guan_event) {
      if (guan_event.lengthComputable) {
        var guan_percent = Math.round((guan_event.loaded / guan_event.total) * 55);
        guan_set_progress(guan_percent, '已上传 ' + Math.round((guan_event.loaded / guan_event.total) * 100) + '%，等待大模型逐条判定…');
      }
    };

    guan_xhr.upload.onload = function () {
      guan_set_progress(70, '文件已上传，大模型正在逐条判定评论情绪…');
    };

    guan_xhr.onerror = function () {
      guan_state.guan_uploading = false;
      guan_dropzone.classList.remove('guan_review_dropzone_busy');
      guan_set_progress(0, '上传失败：网络异常，请确认后端服务已启动');
    };

    guan_xhr.onload = function () {
      guan_state.guan_uploading = false;
      guan_dropzone.classList.remove('guan_review_dropzone_busy');
      var guan_json = null;
      try {
        guan_json = JSON.parse(guan_xhr.responseText);
      } catch (guan_err) {
        guan_json = null;
      }
      console.log('[评论分析] 上传响应：', guan_json);

      if (!guan_json) {
        guan_set_progress(0, '服务端返回内容无法解析，请查看后端终端日志');
        return;
      }
      if (guan_json.code !== 0) {
        guan_set_progress(100, '分析失败（' + guan_json.code + '）：' + guan_json.msg);
        guan_drop_meta.textContent = guan_json.msg;
        return;
      }

      guan_set_progress(100, '分析完成：' + guan_json.msg);
      guan_drop_meta.textContent = guan_json.msg;
      guan_render_result(guan_json.data, true);
      guan_load_batches(false);
    };

    guan_xhr.send(guan_form);
  }

  /* ================= 事件绑定 ================= */
  guan_dropzone.addEventListener('click', function () {
    if (!guan_state.guan_uploading) {
      guan_file_input.click();
    }
  });

  guan_dropzone.addEventListener('keydown', function (guan_event) {
    if (guan_event.key === 'Enter' || guan_event.key === ' ') {
      guan_event.preventDefault();
      guan_file_input.click();
    }
  });

  guan_file_input.addEventListener('change', function () {
    if (guan_file_input.files && guan_file_input.files[0]) {
      guan_upload_file(guan_file_input.files[0]);
      guan_file_input.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(function (guan_type) {
    guan_dropzone.addEventListener(guan_type, function (guan_event) {
      guan_event.preventDefault();
      guan_dropzone.classList.add('guan_review_dropzone_active');
    });
  });

  ['dragleave', 'drop'].forEach(function (guan_type) {
    guan_dropzone.addEventListener(guan_type, function (guan_event) {
      guan_event.preventDefault();
      guan_dropzone.classList.remove('guan_review_dropzone_active');
    });
  });

  guan_dropzone.addEventListener('drop', function (guan_event) {
    var guan_files = guan_event.dataTransfer && guan_event.dataTransfer.files;
    if (guan_files && guan_files[0]) {
      guan_upload_file(guan_files[0]);
    }
  });

  guan_filters.addEventListener('click', function (guan_event) {
    var guan_target = guan_event.target;
    if (!guan_target || !guan_target.dataset || !guan_target.dataset.guanFilter) {
      return;
    }
    guan_state.guan_filter = guan_target.dataset.guanFilter;
    Array.prototype.forEach.call(guan_filters.children, function (guan_btn) {
      guan_btn.className = 'guan_review_filter' + (guan_btn === guan_target ? ' guan_review_filter_active' : '');
    });
    guan_render_items();
  });

  guan_search_input.addEventListener('input', function () {
    window.clearTimeout(guan_state.guan_search_timer);
    guan_state.guan_search_timer = window.setTimeout(function () {
      guan_state.guan_keyword = String(guan_search_input.value || '').trim();
      guan_render_items();
    }, 200);
  });

  /* ================= 初始化 ================= */
  guan_load_samples();
  guan_load_batches(true);
})();
