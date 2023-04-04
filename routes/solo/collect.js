const user = require('../../models/userSchema')
    , link = require('../../models/links')
const calculateMultiplier = require('../../utils/calculateMultiplier')
const sendRewardsToParent = require("../../utils/functions/sendRewardsToParent")
const notLoggedIn = require('../../utils/notLoggedIn')
const {incChallengeProgress} = require("../../utils/dailyChallenge");

let concurrentRequests = []
setInterval(() => {
    concurrentRequests = concurrentRequests.filter(e => e.timestamp + 5000 >= Date.now())
}, 2500)

module.exports = async function (req, res) {
    if (concurrentRequests.find(e => req.user.id === e.id))
        return res.status(409).send("Another request from your account is in progress, please wait a few seconds")
    else (concurrentRequests.push({id: req.user.id, timestamp: Date.now()}))

    if (!req.user) return notLoggedIn(res);
    // Find user and link data
    let player = await user.findOne({steamId: req.user.id});
    let linkFound = await link.findOne({"childs.id": req.user.id});
    try {
        // find the quest
        let processedQuest = player.solo.finished[req.query.type].find(e => e.id === parseInt(req.query.id))
        if (!processedQuest) {
            let index = concurrentRequests.findIndex(e => e.id === req.user.id)
            if (index !== -1) concurrentRequests.splice(index, 1)
            return res.status(404).send('Quest has already been collected or hasn\'t been completed')
        }
        // Get multiplier status
        let {multiplier, multiplierDetails} = calculateMultiplier(player, linkFound, 100)
        if (player.solo.earnMoreNextQuest === true) multiplier += 1
        if (linkFound && multiplierDetails.link) {
            // If there is a quest and a link found, then send rewards to link parent
            sendRewardsToParent(processedQuest.reward, linkFound)
        }

        let coinsEarned = processedQuest.reward * multiplier
        // Make this object because it's impossible in direct JSON Objects
        let updateObject = {
            $push: {},
            $pull: {},
            $set: {},
            $inc: {
                coinsThisWeek: coinsEarned,
                coins: coinsEarned,
                [`coinLogs.total.${req.query.type}Quests`]: coinsEarned
            },
            "solo.earnMoreNextQuest": false
        }
        await incChallengeProgress(player,"winhallaQuest")

        updateObject.$push[`solo.collected.${req.query.type}`] = processedQuest;
        updateObject.$push[`coinLogs.history`] = {
            type: `${req.query.type}Quest`,
            displayName: `${req.query.type === "daily" ? "Daily" : "Weekly"} Quest`,
            data: processedQuest,
            timestamp: Date.now()
        }

        updateObject.$pull[`solo.finished.${req.query.type}`] = {id: processedQuest.id}

        await user.updateOne({steamId: req.user.id}, updateObject)
        res.sendStatus(204)

        let index = concurrentRequests.findIndex(e => e.id === req.user.id)
        if (index !== -1) concurrentRequests.splice(index, 1)

    } catch (err) {
        console.log(err);
        return res.status(500).send('Unknown error has occured');
    }
}
