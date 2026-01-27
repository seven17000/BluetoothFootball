// 云函数：转换球员比赛记录数据格式
// 将 playerName 和 matchDate 转换为 playerId 和 matchId
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    // 1. 获取所有球员，建立 name -> _id 的映射
    const allPlayers = await db.collection('players').get()
    const playerMap = {}
    const playerNameMap = {} // 处理姓名相似匹配

    allPlayers.data.forEach(p => {
      const name = p.name.trim()
      playerMap[name] = p._id
      playerNameMap[name.replace(/\s/g, '')] = p._id

      // 处理 "赵 勇" -> "赵勇" 这样的匹配
      playerNameMap[name.replace(/\s/g, '')] = p._id
    })
    console.log(`已加载 ${allPlayers.data.length} 名球员`)

    // 2. 获取所有比赛，建立 matchDate -> _id 的映射
    const allMatches = await db.collection('matches').get()
    const matchMap = {}

    allMatches.data.forEach(m => {
      let dateStr = m.matchDate
      if (typeof dateStr === 'string' && dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0]
      }
      matchMap[dateStr] = m._id
    })
    console.log(`已加载 ${allMatches.data.length} 场比赛`)

    // 3. 获取所有 match_records
    const allRecords = await db.collection('match_records').get()
    console.log(`待转换的记录: ${allRecords.data.length} 条`)

    let successCount = 0
    let failCount = 0
    const failedRecords = []

    // 4. 遍历并转换每条记录
    for (const record of allRecords.data) {
      // 如果已经有 playerId，跳过
      if (record.playerId && record.matchId) {
        continue
      }

      // 查找球员ID
      let playerId = null
      const playerName = (record.playerName || '').trim()

      // 尝试多种匹配方式
      if (playerName) {
        playerId = playerMap[playerName] ||
                   playerNameMap[playerName.replace(/\s/g, '')] ||
                   playerNameMap[playerName]

        // 模糊匹配（处理 "赵勇" 和 "赵 勇" 的差异）
        if (!playerId) {
          for (const [name, id] of Object.entries(playerMap)) {
            if (name.includes(playerName) || playerName.includes(name)) {
              playerId = id
              break
            }
          }
        }
      }

      // 查找比赛ID
      let matchId = null
      let matchDate = record.matchDate
      if (typeof matchDate === 'string' && matchDate.includes('T')) {
        matchDate = matchDate.split('T')[0]
      }
      if (matchDate) {
        matchId = matchMap[matchDate]
      }

      if (!playerId) {
        console.log(`找不到球员: ${record.playerName}`)
        failedRecords.push({
          _id: record._id,
          playerName: record.playerName,
          reason: '找不到球员'
        })
        failCount++
        continue
      }

      if (!matchId) {
        console.log(`找不到比赛: ${record.matchDate}`)
        failedRecords.push({
          _id: record._id,
          playerName: record.playerName,
          matchDate: record.matchDate,
          reason: '找不到比赛'
        })
        failCount++
        continue
      }

      // 更新记录
      await db.collection('match_records').doc(record._id).update({
        data: {
          playerId: playerId,
          matchId: matchId,
          // 保留原有字段，删除不需要的
          playerName: _.remove(),
          opponent: _.remove()
        }
      })

      successCount++
    }

    return {
      success: true,
      message: `成功转换 ${successCount} 条，失败 ${failCount} 条`,
      playerCount: allPlayers.data.length,
      matchCount: allMatches.data.length,
      totalRecords: allRecords.data.length,
      failedRecords: failedRecords.slice(0, 20) // 最多返回20条失败记录
    }
  } catch (error) {
    console.error('转换失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
