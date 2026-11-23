/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：用户认证控制器 —— 注册、登录、获取当前用户、退出登录。
 *      统一响应 {code,msg,data}；密码只存哈希，接口不返回密码字段。
 */
const guan_user_model = require('../models/guan_user_model');
const guan_auth = require('../services/guan_auth_service');

function guan_fail(guan_res, guan_code, guan_msg, guan_data = null) {
  return guan_res.json({ code: guan_code, msg: guan_msg, data: guan_data });
}

/** 数据库行 → 前端可见字段（不含密码） */
function guan_map_user(guan_row) {
  if (!guan_row) {
    return null;
  }
  return {
    guan_id: guan_row.guan_id,
    guan_username: guan_row.guan_username,
    guan_nickname: guan_row.guan_nickname || guan_row.guan_username,
    guan_role: guan_row.guan_role,
    guan_status: guan_row.guan_status,
    guan_login_total: guan_row.guan_login_total,
    guan_last_login: guan_row.guan_last_login,
    guan_created_at: guan_row.guan_created_at
  };
}

/** 用户名规则：字母开头，3-20 位字母 / 数字 / 下划线 */
const guan_username_re = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

/** 校验注册参数，返回错误提示（空串表示通过） */
function guan_validate_register(guan_username, guan_password, guan_nickname) {
  if (!guan_username || !guan_password) {
    return '用户名与密码不能为空';
  }
  if (!guan_username_re.test(guan_username)) {
    return '用户名需以字母开头，3-20 位，仅支持字母、数字与下划线';
  }
  if (guan_password.length < 6 || guan_password.length > 32) {
    return '密码长度需为 6-32 位';
  }
  if (!/[a-zA-Z]/.test(guan_password) || !/\d/.test(guan_password)) {
    return '密码需同时包含字母与数字';
  }
  if (guan_nickname && guan_nickname.length > 20) {
    return '昵称最多 20 个字符';
  }
  return '';
}

/**
 * POST /api/auth/register —— 注册并自动登录
 * 请求：{ "guan_username": "guan2026", "guan_password": "abc123456", "guan_nickname": "阿关" }
 */
function guan_register(guan_req, guan_res, guan_next) {
  try {
    const guan_body = guan_req.body || {};
    const guan_username = String(guan_body.guan_username || '').trim();
    const guan_password = String(guan_body.guan_password || '');
    const guan_nickname = String(guan_body.guan_nickname || '').trim();

    const guan_error = guan_validate_register(guan_username, guan_password, guan_nickname);
    if (guan_error) {
      console.warn('[注册] 参数校验失败：', guan_error);
      return guan_fail(guan_res, 4002, guan_error);
    }

    if (guan_user_model.guan_find_by_username(guan_username)) {
      console.warn(`[注册] 用户名已存在：${guan_username}`);
      return guan_fail(guan_res, 4092, `用户名「${guan_username}」已被注册，请换一个`);
    }

    const guan_user_id = guan_user_model.guan_create_user({
      guan_username,
      guan_password: guan_auth.guan_hash_password(guan_password),
      guan_nickname,
      guan_role: 'user',
      guan_status: 'active'
    });

    const guan_user = guan_user_model.guan_get_by_id(guan_user_id);
    const guan_token = guan_auth.guan_sign_token(guan_user);
    console.log(`[注册] 成功：id=${guan_user_id}｜用户名=${guan_username}`);

    return guan_res.json({
      code: 0,
      msg: `注册成功，欢迎你，${guan_user.guan_nickname || guan_user.guan_username}`,
      data: {
        ...guan_token,
        guan_user: guan_map_user(guan_user)
      }
    });
  } catch (guan_err) {
    return guan_next(guan_err);
  }
}

/**
 * POST /api/auth/login —— 登录
 * 请求：{ "guan_username": "guan2026", "guan_password": "abc123456" }
 */
function guan_login(guan_req, guan_res, guan_next) {
  try {
    const guan_body = guan_req.body || {};
    const guan_username = String(guan_body.guan_username || '').trim();
    const guan_password = String(guan_body.guan_password || '');

    if (!guan_username || !guan_password) {
      return guan_fail(guan_res, 4001, '用户名与密码不能为空');
    }

    const guan_row = guan_user_model.guan_find_by_username(guan_username);
    if (!guan_row || !guan_auth.guan_verify_password(guan_password, guan_row.guan_password)) {
      console.warn(`[登录] 失败：用户名=${guan_username}｜密码不匹配`);
      return guan_fail(guan_res, 4011, '用户名或密码错误');
    }
    if (guan_row.guan_status !== 'active') {
      return guan_fail(guan_res, 4031, '该账号已被禁用，请联系管理员');
    }

    guan_user_model.guan_update_login(guan_row.guan_id);
    const guan_user = guan_user_model.guan_get_by_id(guan_row.guan_id);
    const guan_token = guan_auth.guan_sign_token(guan_user);
    console.log(`[登录] 成功：id=${guan_row.guan_id}｜用户名=${guan_username}｜累计登录 ${guan_user.guan_login_total} 次`);

    return guan_res.json({
      code: 0,
      msg: `登录成功，欢迎回来，${guan_user.guan_nickname || guan_user.guan_username}`,
      data: {
        ...guan_token,
        guan_user: guan_map_user(guan_user)
      }
    });
  } catch (guan_err) {
    return guan_next(guan_err);
  }
}

/** GET /api/auth/me —— 校验 token 并返回当前用户 */
function guan_me(guan_req, guan_res) {
  const guan_token = guan_auth.guan_read_token(guan_req);
  if (!guan_token) {
    return guan_fail(guan_res, 4013, '未登录：请求头缺少 Authorization Bearer token');
  }
  const guan_check = guan_auth.guan_verify_token(guan_token);
  if (!guan_check.guan_ok) {
    return guan_fail(guan_res, 4013, guan_check.guan_reason);
  }

  const guan_row = guan_user_model.guan_get_by_id(guan_check.guan_payload.guan_uid);
  if (!guan_row) {
    return guan_fail(guan_res, 4013, '用户不存在或已被删除');
  }
  if (guan_row.guan_status !== 'active') {
    return guan_fail(guan_res, 4031, '该账号已被禁用');
  }

  return guan_res.json({
    code: 0,
    msg: 'token 有效',
    data: {
      guan_user: guan_map_user(guan_row),
      guan_exp: guan_check.guan_payload.guan_exp,
      guan_sign_type: 'HMAC-SHA256'
    }
  });
}

/** POST /api/auth/logout —— 退出登录（token 由前端清除，服务端只做记录） */
function guan_logout(guan_req, guan_res) {
  const guan_token = guan_auth.guan_read_token(guan_req);
  const guan_check = guan_auth.guan_verify_token(guan_token);
  if (guan_check.guan_ok) {
    console.log(`[退出] 用户 ${guan_check.guan_payload.guan_username} 已退出登录`);
  }
  return guan_res.json({ code: 0, msg: '已退出登录', data: { guan_cleared: true } });
}

/** GET /api/auth/users —— 用户列表（演示用，不含密码） */
function guan_list_users(guan_req, guan_res) {
  const guan_list = guan_user_model.guan_list_users(20).map((guan_row) => ({
    guan_id: guan_row.guan_id,
    guan_username: guan_row.guan_username,
    guan_nickname: guan_row.guan_nickname,
    guan_role: guan_row.guan_role,
    guan_login_total: guan_row.guan_login_total,
    guan_last_login: guan_row.guan_last_login
  }));
  return guan_res.json({
    code: 0,
    msg: `查询成功，共 ${guan_list.length} 个用户`,
    data: { guan_total: guan_list.length, guan_list, guan_stats: guan_user_model.guan_get_stats() }
  });
}

module.exports = {
  guan_register,
  guan_login,
  guan_me,
  guan_logout,
  guan_list_users
};
