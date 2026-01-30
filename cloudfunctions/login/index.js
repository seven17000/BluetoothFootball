// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { userInfo } = event;

  try {
    // 查询用户是否已存在
    let user;
    try {
      user = await db.collection('users').doc(openid).get();
    } catch (e) {
      // 用户不存在，doc() 会报错
      user = { data: null };
    }

    if (!user.data) {
      // 新用户，创建记录
      // 如果是第一个用户，设置为管理员
      const userCount = await db.collection('users').count();
      const role = userCount.total === 0 ? 'admin' : 'user';

      await db.collection('users').doc(openid).set({
        data: {
          openid,
          role,
          name: userInfo?.nickName || '',
          avatar: userInfo?.avatarUrl || '',
          bio: '',            // 个人简介
          createTime: new Date(),
          lastLoginTime: new Date()
        }
      });

      return {
        success: true,
        data: {
          openid,
          role,
          name: userInfo?.nickName || '',
          avatar: userInfo?.avatarUrl || '',
          bio: '',
          isNewUser: true
        }
      };
    } else {
      // 更新登录时间
      await db.collection('users').doc(openid).update({
        data: {
          lastLoginTime: new Date()
        }
      });

      return {
        success: true,
        data: {
          ...user.data,
          isNewUser: false
        }
      };
    }
  } catch (error) {
    console.error('登录失败', error);
    return {
      success: false,
      error: error.message
    };
  }
};
