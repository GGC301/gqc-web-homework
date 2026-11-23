/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：用户认证服务。密码使用 node:crypto 的 scrypt 加盐哈希存储；
 *      token 为「base64url(载荷) + HMAC-SHA256 签名」，不依赖 jsonwebtoken 等第三方库，
 *      签名密钥只从 backend/.env 读取，前端永远拿不到。
 */
const crypto = require('node:crypto');
const guan_env = require('../config/guan_env');

let guan_secret_cache = '';

/** 取签名密钥：优先 .env，缺失时临时生成（仅开发环境，重启后 token 失效） */
function guan_get_secret() {
  if (guan_env.guan_auth_secret) {
    return guan_env.guan_auth_secret;
  }
  if (!guan_secret_cache) {
    guan_secret_cache = crypto.randomBytes(32).toString('hex');
    console.warn('[登录] 未配置 AUTH_TOKEN_SECRET，已临时生成随机密钥，重启后 token 会失效');
  }
  return guan_secret_cache;
}

/** Buffer → base64url */
function guan_base64url(guan_buffer) {
  return Buffer.from(guan_buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** base64url → Buffer */
function guan_from_base64url(guan_text) {
  const guan_padded = String(guan_text).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(guan_padded, 'base64');
}

/** 密码哈希：scrypt$盐$哈希 */
function guan_hash_password(guan_password) {
  const guan_salt = crypto.randomBytes(16).toString('hex');
  const guan_hash = crypto.scryptSync(String(guan_password), guan_salt, 32).toString('hex');
  return `scrypt$${guan_salt}$${guan_hash}`;
}

/** 校验密码（定长比较，避免时序攻击） */
function guan_verify_password(guan_password, guan_stored) {
  const guan_parts = String(guan_stored || '').split('$');
  if (guan_parts.length !== 3 || guan_parts[0] !== 'scrypt') {
    return false;
  }
  const guan_hash = crypto.scryptSync(String(guan_password), guan_parts[1], 32);
  const guan_expected = Buffer.from(guan_parts[2], 'hex');
  if (guan_hash.length !== guan_expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(guan_hash, guan_expected);
}

/**
 * 签发 token
 * @param {{guan_id: number, guan_username: string, guan_nickname: string}} guan_user
 * @returns {{guan_token: string, guan_expire_at: string, guan_expires_in: number}}
 */
function guan_sign_token(guan_user) {
  const guan_ttl = guan_env.guan_auth_token_ttl;
  const guan_payload = {
    guan_uid: guan_user.guan_id,
    guan_username: guan_user.guan_username,
    guan_nickname: guan_user.guan_nickname || guan_user.guan_username,
    guan_iat: Math.floor(Date.now() / 1000),
    guan_exp: Math.floor(Date.now() / 1000) + guan_ttl
  };
  const guan_body = guan_base64url(JSON.stringify(guan_payload));
  const guan_sign = guan_base64url(
    crypto.createHmac('sha256', guan_get_secret()).update(guan_body).digest()
  );
  return {
    guan_token: `${guan_body}.${guan_sign}`,
    guan_expire_at: new Date(guan_payload.guan_exp * 1000).toLocaleString('zh-CN', { hour12: false }),
    guan_expires_in: guan_ttl
  };
}

/**
 * 校验 token
 * @param {string} guan_token
 * @returns {{guan_ok: boolean, guan_payload?: object, guan_reason?: string}}
 */
function guan_verify_token(guan_token) {
  const guan_text = String(guan_token || '').trim();
  const guan_parts = guan_text.split('.');
  if (guan_parts.length !== 2) {
    return { guan_ok: false, guan_reason: 'token 格式不正确' };
  }

  const guan_expected = guan_base64url(
    crypto.createHmac('sha256', guan_get_secret()).update(guan_parts[0]).digest()
  );
  const guan_a = Buffer.from(guan_expected);
  const guan_b = Buffer.from(guan_parts[1]);
  if (guan_a.length !== guan_b.length || !crypto.timingSafeEqual(guan_a, guan_b)) {
    return { guan_ok: false, guan_reason: 'token 签名校验失败' };
  }

  let guan_payload = null;
  try {
    guan_payload = JSON.parse(guan_from_base64url(guan_parts[0]).toString('utf8'));
  } catch (guan_err) {
    return { guan_ok: false, guan_reason: 'token 内容无法解析' };
  }

  if (!guan_payload || !guan_payload.guan_exp || guan_payload.guan_exp * 1000 < Date.now()) {
    return { guan_ok: false, guan_reason: '登录已过期，请重新登录' };
  }
  return { guan_ok: true, guan_payload };
}

/** 从请求头解析 Bearer token */
function guan_read_token(guan_req) {
  const guan_header = String(guan_req.headers.authorization || '');
  const guan_match = guan_header.match(/^Bearer\s+(.+)$/i);
  return guan_match ? guan_match[1].trim() : '';
}

module.exports = {
  guan_hash_password,
  guan_verify_password,
  guan_sign_token,
  guan_verify_token,
  guan_read_token
};
