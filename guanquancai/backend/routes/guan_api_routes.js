/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-12 | 大模型：deepseek-v4.1-flash
 * 说明：全部接口路由，统一挂载在 /api 前缀下（含知识库 RAG 接口）。
 */
const express = require('express');
const guan_env = require('../config/guan_env');
const { guan_get_health } = require('../controllers/guan_health_controller');
const {
  guan_list_pages,
  guan_get_page_detail
} = require('../controllers/guan_page_controller');
const {
  guan_test_db_connection,
  guan_get_db_info
} = require('../controllers/guan_db_controller');
const {
  guan_upload_document,
  guan_list_documents,
  guan_get_document,
  guan_delete_document,
  guan_get_stats
} = require('../controllers/guan_kb_controller');
const {
  guan_get_ai_info,
  guan_chat,
  guan_rag_chat
} = require('../controllers/guan_ai_controller');
const {
  guan_list_talks,
  guan_create_talk,
  guan_get_talk,
  guan_delete_talk,
  guan_send
} = require('../controllers/guan_chat_controller');
const {
  guan_analyze,
  guan_list_records,
  guan_delete_record
} = require('../controllers/guan_vision_controller');
const {
  guan_register,
  guan_login,
  guan_me,
  guan_logout,
  guan_list_users
} = require('../controllers/guan_auth_controller');
const {
  guan_upload_reviews,
  guan_list_batches,
  guan_get_batch_detail,
  guan_delete_batch,
  guan_download_template,
  guan_list_samples,
  guan_download_sample
} = require('../controllers/guan_review_controller');

const guan_api_routes = express.Router();

// 上传请求体上限：文件上限 + 2MB 表单冗余
const guan_raw_limit = `${guan_env.guan_kb_max_file_mb + 2}mb`;

guan_api_routes.get('/health', guan_get_health);
guan_api_routes.get('/pages', guan_list_pages);
guan_api_routes.get('/pages/:guan_id', guan_get_page_detail);
guan_api_routes.post('/db/test', guan_test_db_connection);
guan_api_routes.get('/db/info', guan_get_db_info);

// ===== 知识库（RAG）=====
guan_api_routes.post('/kb/documents', express.raw({ type: 'multipart/form-data', limit: guan_raw_limit }), guan_upload_document);
guan_api_routes.get('/kb/documents', guan_list_documents);
guan_api_routes.get('/kb/documents/:guan_id', guan_get_document);
guan_api_routes.delete('/kb/documents/:guan_id', guan_delete_document);
guan_api_routes.get('/kb/stats', guan_get_stats);

// ===== AI 接口 =====
guan_api_routes.get('/ai/info', guan_get_ai_info);
guan_api_routes.post('/ai/chat', guan_chat);
guan_api_routes.post('/ai/rag-chat', guan_rag_chat);

// ===== 商业评论情感分析 =====
guan_api_routes.post('/review/upload', express.raw({ type: 'multipart/form-data', limit: guan_raw_limit }), guan_upload_reviews);
guan_api_routes.get('/review/batches', guan_list_batches);
guan_api_routes.get('/review/batches/:guan_id', guan_get_batch_detail);
guan_api_routes.delete('/review/batches/:guan_id', guan_delete_batch);
guan_api_routes.get('/review/template', guan_download_template);
guan_api_routes.get('/review/samples', guan_list_samples);
guan_api_routes.get('/review/samples/:guan_no', guan_download_sample);

// ===== 用户登录与注册 =====
guan_api_routes.post('/auth/register', guan_register);
guan_api_routes.post('/auth/login', guan_login);
guan_api_routes.get('/auth/me', guan_me);
guan_api_routes.post('/auth/logout', guan_logout);
guan_api_routes.get('/auth/users', guan_list_users);

// ===== 基础 AI 聊天（多轮对话 + 历史压缩）=====
guan_api_routes.get('/chat/talks', guan_list_talks);
guan_api_routes.post('/chat/talks', guan_create_talk);
guan_api_routes.get('/chat/talks/:guan_id', guan_get_talk);
guan_api_routes.delete('/chat/talks/:guan_id', guan_delete_talk);
guan_api_routes.post('/chat/send', guan_send);

// ===== 识图（自选题目：OCR 与信息抽取）=====
guan_api_routes.post('/vision/analyze', express.raw({ type: 'multipart/form-data', limit: '12mb' }), guan_analyze);
guan_api_routes.get('/vision/records', guan_list_records);
guan_api_routes.delete('/vision/records/:guan_id', guan_delete_record);

module.exports = guan_api_routes;
