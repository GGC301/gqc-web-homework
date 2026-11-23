/**
 * 姓名：关泉才 | 学号：24001010301 |
 * 时间：2026-11-19 | 大模型：deepseek-v4.1-flash
 * 说明：用户表初始化脚本 —— 幂等建表并写入 8 条测试账号（密码统一 abc123456，
 *      以 scrypt 加盐哈希入库，不存明文）。执行：npm run inituser
 */
const guan_user_model = require('../models/guan_user_model');
const guan_auth = require('../services/guan_auth_service');

const guan_seed_users = [
  { guan_username: 'guanquancai', guan_nickname: '关泉才', guan_role: 'admin' },
  { guan_username: 'zhang_wei', guan_nickname: '张伟', guan_role: 'user' },
  { guan_username: 'li_yan', guan_nickname: '李艳', guan_role: 'user' },
  { guan_username: 'wang_lei', guan_nickname: '王磊', guan_role: 'user' },
  { guan_username: 'chen_jing', guan_nickname: '陈静', guan_role: 'user' },
  { guan_username: 'zhao_yun', guan_nickname: '赵云', guan_role: 'user' },
  { guan_username: 'sun_yu', guan_nickname: '孙宇', guan_role: 'user' },
  { guan_username: 'zhou_lin', guan_nickname: '周琳', guan_role: 'user' }
];

const guan_default_password = 'abc123456';

function guan_main() {
  guan_user_model.guan_ensure_schema();
  console.log('[用户初始化] 表结构已就绪：guan_user');

  let guan_created = 0;
  let guan_skipped = 0;

  guan_seed_users.forEach((guan_user) => {
    if (guan_user_model.guan_find_by_username(guan_user.guan_username)) {
      guan_skipped += 1;
      return;
    }
    guan_user_model.guan_create_user({
      guan_username: guan_user.guan_username,
      guan_password: guan_auth.guan_hash_password(guan_default_password),
      guan_nickname: guan_user.guan_nickname,
      guan_role: guan_user.guan_role,
      guan_status: 'active'
    });
    guan_created += 1;
  });

  const guan_stats = guan_user_model.guan_get_stats();
  console.log(`[用户初始化] 新增 ${guan_created} 个，跳过已存在 ${guan_skipped} 个，现有 ${guan_stats.guan_user_total} 个账号`);
  console.log(`[用户初始化] 测试账号密码统一为 ${guan_default_password}（如 guanquancai / ${guan_default_password}）`);
}

guan_main();
