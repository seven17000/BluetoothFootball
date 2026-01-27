// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const players = event.players

  try {
    const results = []
    for (const player of players) {
      // 转换字段名并添加缺失的字段
      const newPlayer = {
        _id: player._id,
        name: player.name,
        number: player.number || 0,
        position: player.position || '',
        phone: player.phone || '',
        avatar: player.avatar || '',
        joinDate: player.joinDate || player.createdAt,
        isActive: player.isActive !== false,
        createTime: player.createdAt || new Date(),
        updatedAt: player.updatedAt || new Date()
      }

      // 使用upsert来更新或插入
      await db.collection('players').doc(player._id).set(newPlayer)
      results.push({ _id: player._id, success: true })
    }

    return {
      success: true,
      message: `成功导入 ${results.length} 条球员数据`,
      results
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
