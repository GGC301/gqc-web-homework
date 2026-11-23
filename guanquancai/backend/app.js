/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：Express 应用装配（CORS、JSON 解析、API 路由、静态托管、404 与错误处理）。
 */
const express = require('express');
const cors = require('cors');
const guan_env = require('./config/guan_env');
const guan_api_routes = require('./routes/guan_api_routes');

const guan_app = express();

// 支持所有跨域访问
guan_app.use(cors());
guan_app.use(express.json({ limit: '2mb' }));
guan_app.use(express.urlencoded({ extended: false }));

// 所有接口以 /api 为前缀
guan_app.use('/api', guan_api_routes);

// 托管 frontend/ 目录
guan_app.use(express.static(guan_env.guan_frontend_dir));

// 未匹配路由
guan_app.use((guan_req, guan_res) => {
  if (guan_req.path.startsWith('/api')) {
    return guan_res.status(404).json({
      code: 4040,
      msg: `接口不存在：${guan_req.method} ${guan_req.originalUrl}`,
      data: null
    });
  }
  guan_res.status(404).type('html').send(
    '<meta charset="utf-8"><h1>404 页面不存在</h1><p><a href="/index.html">返回首页</a></p>'
  );
});

// 统一错误处理
guan_app.use((guan_err, guan_req, guan_res, guan_next) => { // eslint-disable-line no-unused-vars
  // 上传体积超限（express.raw 抛出 entity.too.large）
  if (guan_err && guan_err.type === 'entity.too.large') {
    console.error('[guan error] 上传体积超限：', guan_req.originalUrl);
    return guan_res.status(413).json({
      code: 4003,
      msg: `文件超过上限 ${guan_env.guan_kb_max_file_mb} MB，请压缩或拆分后上传`,
      data: null
    });
  }
  console.error('[guan error]', guan_req.method, guan_req.originalUrl, guan_err);
  guan_res.status(500).json({
    code: 5000,
    msg: `服务器内部错误：${guan_err.message}`,
    data: null
  });
});

module.exports = guan_app;
