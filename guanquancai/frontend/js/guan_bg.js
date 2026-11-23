/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-09 | 大模型：deepseek-v4.1-flash
 * 说明：全站通用 canvas 粒子背景动画（页面中没有 #guan_canvas_bg 时自动跳过）。
 */
(function () {
  'use strict';

  var guan_canvas = document.getElementById('guan_canvas_bg');
  if (!guan_canvas) {
    return;
  }

  var guan_ctx = guan_canvas.getContext('2d');
  if (!guan_ctx) {
    return;
  }

  var guan_reduce_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var guan_width = 0;
  var guan_height = 0;
  var guan_nodes = [];
  var guan_mouse = { guan_x: -9999, guan_y: -9999 };
  var guan_raf_id = 0;
  var guan_link_dist = 132;
  var guan_mouse_dist = 176;
  var guan_colors = ['86, 216, 255', '163, 123, 255', '126, 198, 255'];

  function guan_make_nodes() {
    var guan_area = guan_width * guan_height;
    var guan_count = Math.max(28, Math.min(96, Math.round(guan_area / 17000)));
    guan_nodes = [];
    for (var guan_i = 0; guan_i < guan_count; guan_i += 1) {
      guan_nodes.push({
        guan_x: Math.random() * guan_width,
        guan_y: Math.random() * guan_height,
        guan_vx: (Math.random() - 0.5) * 0.32,
        guan_vy: (Math.random() - 0.5) * 0.32,
        guan_r: Math.random() * 1.5 + 0.9,
        guan_c: guan_colors[Math.floor(Math.random() * guan_colors.length)]
      });
    }
  }

  function guan_resize() {
    var guan_dpr = Math.min(window.devicePixelRatio || 1, 2);
    guan_width = window.innerWidth;
    guan_height = window.innerHeight;
    guan_canvas.width = Math.round(guan_width * guan_dpr);
    guan_canvas.height = Math.round(guan_height * guan_dpr);
    guan_ctx.setTransform(guan_dpr, 0, 0, guan_dpr, 0, 0);
    guan_make_nodes();
  }

  function guan_draw() {
    guan_ctx.clearRect(0, 0, guan_width, guan_height);

    for (var guan_i = 0; guan_i < guan_nodes.length; guan_i += 1) {
      var guan_node = guan_nodes[guan_i];

      if (!guan_reduce_motion) {
        guan_node.guan_x += guan_node.guan_vx;
        guan_node.guan_y += guan_node.guan_vy;
        if (guan_node.guan_x < -20) guan_node.guan_x = guan_width + 20;
        if (guan_node.guan_x > guan_width + 20) guan_node.guan_x = -20;
        if (guan_node.guan_y < -20) guan_node.guan_y = guan_height + 20;
        if (guan_node.guan_y > guan_height + 20) guan_node.guan_y = -20;
      }

      // 节点之间连线
      for (var guan_j = guan_i + 1; guan_j < guan_nodes.length; guan_j += 1) {
        var guan_other = guan_nodes[guan_j];
        var guan_dx = guan_node.guan_x - guan_other.guan_x;
        var guan_dy = guan_node.guan_y - guan_other.guan_y;
        var guan_dist = Math.sqrt(guan_dx * guan_dx + guan_dy * guan_dy);

        if (guan_dist < guan_link_dist) {
          var guan_alpha = (1 - guan_dist / guan_link_dist) * 0.42;
          guan_ctx.strokeStyle = 'rgba(110, 176, 255, ' + guan_alpha.toFixed(3) + ')';
          guan_ctx.lineWidth = 0.8;
          guan_ctx.beginPath();
          guan_ctx.moveTo(guan_node.guan_x, guan_node.guan_y);
          guan_ctx.lineTo(guan_other.guan_x, guan_other.guan_y);
          guan_ctx.stroke();
        }
      }

      // 节点与鼠标连线
      var guan_mdx = guan_node.guan_x - guan_mouse.guan_x;
      var guan_mdy = guan_node.guan_y - guan_mouse.guan_y;
      var guan_mdist = Math.sqrt(guan_mdx * guan_mdx + guan_mdy * guan_mdy);
      if (guan_mdist < guan_mouse_dist) {
        var guan_malpha = (1 - guan_mdist / guan_mouse_dist) * 0.5;
        guan_ctx.strokeStyle = 'rgba(163, 123, 255, ' + guan_malpha.toFixed(3) + ')';
        guan_ctx.lineWidth = 0.9;
        guan_ctx.beginPath();
        guan_ctx.moveTo(guan_node.guan_x, guan_node.guan_y);
        guan_ctx.lineTo(guan_mouse.guan_x, guan_mouse.guan_y);
        guan_ctx.stroke();
      }

      guan_ctx.fillStyle = 'rgba(' + guan_node.guan_c + ', 0.85)';
      guan_ctx.beginPath();
      guan_ctx.arc(guan_node.guan_x, guan_node.guan_y, guan_node.guan_r, 0, Math.PI * 2);
      guan_ctx.fill();
    }

    guan_raf_id = window.requestAnimationFrame(guan_draw);
  }

  window.addEventListener('resize', guan_resize, { passive: true });
  window.addEventListener('mousemove', function (guan_event) {
    guan_mouse.guan_x = guan_event.clientX;
    guan_mouse.guan_y = guan_event.clientY;
  }, { passive: true });
  window.addEventListener('mouseleave', function () {
    guan_mouse.guan_x = -9999;
    guan_mouse.guan_y = -9999;
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      window.cancelAnimationFrame(guan_raf_id);
    } else if (!guan_reduce_motion) {
      guan_raf_id = window.requestAnimationFrame(guan_draw);
    }
  });

  guan_resize();
  guan_draw();
  if (guan_reduce_motion) {
    window.cancelAnimationFrame(guan_raf_id);
  }
})();
