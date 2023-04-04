const ObjectId = require("mongoose").Types.ObjectId;
const user = require('../../models/userSchema');

module.exports =  async function (coinsEarned, linkFound,) {

    coinsEarned = coinsEarned * ((process.dbConfig.find(e => e.name === "LINKS CONFIG").value.boost / 2 / 100));
    const parent = await user.findOne({steamId: linkFound.parent.id});
    const notificationIndex = parent.notifications.findIndex(e => e.id === 64);

    const logObj = {
        type: `link`,
        displayName: `Referral link`,
        data: {
            reward: coinsEarned,
        },
        timestamp: Date.now()
    }
    if (notificationIndex !== -1) {
        await user.updateOne({steamId: linkFound.parent.id, "notifications.id": 64}, {
            $inc: {
                coins: coinsEarned,
                "notifications.$.nb": coinsEarned,
                "coinLogs.total.link": coinsEarned
            },
            $push: {
                "coinLogs.history": logObj
            },
            "notifications.$.tip": `You earned ${Math.round((parent.notifications[notificationIndex].nb + coinsEarned)*10)/10}`,
        })
    } else {
        await user.updateOne({steamId: linkFound.parent.id}, {
            $push: {
                notifications: {
                    id: 64,
                    message: `One or more friend(s) you invited earned coins`,
                    tip: `You earned ${coinsEarned}`,
                    _id: ObjectId()
                },
                "coinLogs.history": logObj
            }, $inc: {coins: coinsEarned, "coinLogs.total.link": coinsEarned},
        })
    }
}