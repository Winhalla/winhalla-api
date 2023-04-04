const user = require('../models/userSchema')
module.exports = async (type, data, user1) => {
    let suspicious = user1.isSucpicious.ffa;
    if (type === "FFA") {
        if (user1.stats.ffa.gamesPlayed > 15) {
            if (user1.stats.ffa.wins / user1.stats.ffa.gamesPlayed >= 0.3) {
                suspicious = true
            }
        }
        await user.updateOne({ steamId: user1.steamId }, { $inc: { "stats.ffa.wins": data.hasWinned === true ? 1 : 0, "stats.ffa.gamesPlayed": 1 }, $set: { "isSucpicious.ffa": suspicious } })
    } else if (type === "solo") {
        if(data.time <= 30 || isNaN(data.time)){
            await user.updateOne({ steamId: user1.steamId }, { $set:{ "isSucpicious.solo": true } })
        }
    }
}