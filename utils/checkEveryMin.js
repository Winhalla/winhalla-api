const user = require('../models/userSchema.js')
const ObjectId = require("mongoose").Types.ObjectId
const {CronJob} = require('cron')
const ffaEnd = require('../utils/ffaEnd')
const special6 = require('../utils/special6');
const admin = require("firebase-admin");
const axios = require('axios');
const actualsDaily = require('./solo/actualsDaily');
const quests = require('../utils/questSolo.json');
const leaderboard = require('../models/leaderboard')
const renderFx = require('../utils/functions/renderFx')
const callBrawlhallaApi = require("../utils/functions/callBrawlhallaApi");
const {dailyChallengeNotification} = require("./dailyChallenge");

async function checkFinished() {
    setInterval(ffaEnd, 180 * 1000)
    setInterval(dailyChallengeNotification, 180 * 1000)
    setInterval(async function () {

        // Find users that needs updates
        let userNeedingUpdate = await user.find({accountType: "v2",$or: [{"solo.lastDaily": {$lte: Date.now() - 1000 * 3600 * 24}}, {"solo.lastWeekly": {$lte: Date.now() - 1000 * 3600 * 24 * 7}}]})

        for (const element of userNeedingUpdate) {

            let waitingNewQuests = {daily: false, weekly: false,}

            if (element.solo.lastDaily + 1000 * 3600 * 24 < Date.now()) {
                waitingNewQuests.daily = true
            }
            if (element.solo.lastWeekly + 1000 * 3600 * 24 * 7 < Date.now()) {
                waitingNewQuests.weekly = true
            }
            // Get stats of players to refresh for them their data
            let stats = await callBrawlhallaApi(element.brawlhallaAccounts, "all", false)
            if (stats.code === 503 || stats.code === 429) return
            if (stats.stats === "err") continue
            // Global var to store the notification to add
            let newNotification;
            //? is this necessary ? the user is already queried in the "userNeedingUpdate" var
            //* spoiler: no
            const user1 = await user.findById(element._id)

            // Iterate for daily & weekly
            for (let i = 0; i < 2; i++) {
                // These vars are to determine if we are calculating daily or weekly quests
                const currentQuestType = i === 0 ? "daily" : "weekly"
                const currentQuestArrayName = currentQuestType + "Quests"


                // Don't calculate if this type of quests hasn't expired
                if (!waitingNewQuests[currentQuestType]) continue
                element.solo[currentQuestArrayName].forEach((elemen, index) => {
                    if (!elemen) return
                    // Get the quest data stored in local by it's id and add the weapon prop
                    let actualQuest = quests[currentQuestType][elemen.id]
                    actualQuest.weapon = elemen.weapon
                    // Calculate actual values for the quest
                    let actualQuestData = actualsDaily([actualQuest], stats,)[0]
                    // If the quest is finished then make it collectable and add the notification
                    let progress = (actualQuestData.actual - elemen.actual) + elemen.progress
                    if (progress > elemen.goal) {
                        if (!newNotification)
                            newNotification = {
                                id: 1,
                                message: `Collect your quest`,
                                tip: `Click to collect`,
                                type: "regular",
                                _id: ObjectId()
                            }
                        elemen.progress = progress
                        user1.solo.finished[currentQuestType].push(elemen)
                    }
                })
                // This tells the next request to /solo to get new quests
                user1.solo[i === 0 ? "lastDaily" : "lastWeekly"] = undefined
                user1[i === 0 ? "waitingNewQuestsDaily" : "waitingNewQuestsWeekly"] = true
            }

            await user.updateOne({steamId: user1.steamId}, {
                    solo: user1.solo,
                    waitingNewQuestsDaily: user1.waitingNewQuestsDaily,
                    waitingNewQuestsWeekly: user1.waitingNewQuestsWeekly,
                    // Push the notification and limit the notifications number to 10
                    $push: {notifications: {$each: newNotification ? [newNotification] : [], $slice: -10}}
                }
            )
            if(newNotification && user1.notificationTokens.length > 0 && user1.tutorialStep.hasFinishedTutorial === true){
                admin.messaging().sendToDevice(user1.notificationTokens,{
                    notification: {
                        title: "A quest is ready to be collected",
                        body: "Open the app to collect it!",
                        android_channel_id: "quest_completed",
                    },
                    data: {
                        route: "/home?page=1",
                    }
                });
            }
        }
    }, 1000 * 180)

}

let rewardsPerUser
let multipliers

function weeklyRewards() {

    rewardsPerUser = process.dbConfig.find(e => e.name === "LEADERBOARD").value.coinsPerUser
    multipliers = [30, 15, 3.5, 2.5, 1.25, 0.5]
    leaderboardsCalculator(true)
}


function getRewardsPerRank(rank, array, length) {

    if (array === 0 || array === 1) {
        return Math.round((rewardsPerUser * multipliers[array] - ((20) * rank * multipliers[array])))
    } else return rewardsPerUser * multipliers[array] - ((400 / length) * rank * multipliers[array])
}

async function leaderboardsCalculator(distributeRewards) {
    // Calculate clan rewards
    //! The first part is for clans, which are not active yet
    /*let clans = await clan.find({}, {level: 0, avatar: 0})
    clans.sort(e => e.weeklyPoints)
    let clanRepartition = [
        //top 5%
        clans.slice(0, Math.ceil(clans.length / 20)),
        //top 10%
        clans.slice(Math.ceil(clans.length / 20), Math.ceil(clans.length / 10)),
        //top 25%
        clans.slice(Math.ceil(clans.length / 10), Math.ceil(clans.length / 4)),
        //top 50%
        clans.slice(Math.ceil(clans.length / 4), Math.ceil(clans.length / 2)),
        //rest
        clans.slice(Math.ceil(clans.length / 2))
    ]
    let notification = {
        id: 2,
        message: `You can now claim your clan rewards!`,
        tip: "Click this notification to claim",
        type: "regular"
    }
    let clanReward = [500, 250, 100, 50]
    clanRepartition.forEach((portion, i) => {
        portion.forEach(async (clan, j) => {
            if (i > 4) return;
            clan.members.sort((a, b) => b.weeklyScore - a.weeklyScore);
            const top1percent = clan.members.splice(0, Math.ceil(clan.members.length / 100));
            const top10percent = clan.members.slice(Math.ceil(clan.members.length / 100), Math.ceil(clan.members.length / 10));
            const top50percent = clan.members.slice(Math.ceil(clan.members.length / 10), Math.ceil(clan.members.length / 2));
            await user.updateMany({steamId: top1percent.map(e => e.steamId)}, {$push:{notifications:{}},$set:{"coinsObtainable.clanWeekly": i > 2 ? clanReward[i] * 20 : clanReward[i] * 5}});
            await user.updateMany({steamId: top10percent.map(e => e.steamId)}, {"coinsObtainable.clanWeekly": clanReward[i] * 3});
            await user.updateMany({steamId: top50percent.map(e => e.steamId)}, {"coinsObtainable.clanWeekly": clanReward[i]});
        })
    })
    await clan.updateMany({}, {"members.$[].weeklyScore": 0, weeklyScore: 0})
    clanRepartition = undefined
    clans = undefined*/


    // Calculate leaderboard and give rewards
    let users = await user.find({coins: {$gt: 0}}, {
        coinsThisWeek: 1,
        brawlhallaName: 1,
        avatarURL: 1,
        steamId: 1,
        _id: 0
    });
    users.sort((a, b) => b.coinsThisWeek - a.coinsThisWeek)

    let usersRepartition = [ //! don't edit this without editing getRewardsPerRank too
        //top 3
        users.slice(0, 3),
        //top 10
        users.slice(3, 10),/*
            //top 5%
            users.slice(10, Math.ceil(users.length / 20)+10),*/
        //top 10%
        users.slice(10, Math.ceil(users.length / 10) + 10),
        //top 25%
        users.slice(Math.ceil(users.length / 10) + 10, Math.ceil(users.length / 4) + 10),
        //top 50%
        users.slice(Math.ceil(users.length / 4) + 10, Math.ceil(users.length / 2) + 10),
        //rest
        users.slice(Math.ceil(users.length / 2) + 10)
    ]
    usersRepartition.forEach((top, i) => {
        top.forEach((player, ii) => {
            // Stringify + parse to remove the Document status and be able to add the coinsEarned prop
            usersRepartition[i][ii] = JSON.parse(JSON.stringify(usersRepartition[i][ii]))
            usersRepartition[i][ii].coinsEarned = Math.round(getRewardsPerRank(ii, i, users.length))
            if (distributeRewards) user.updateOne({steamId: player.steamId}, {
                $inc: {coins: usersRepartition[i][ii].coinsEarned},
                $set: {coinsThisWeek: 0},
                $push: {
                    notifications: {
                        id: 63,
                        message: `You earned ${getRewardsPerRank(ii, i)} with the weekly leaderboard`,
                        tip: "Good luck for the next week!",
                        type: "regular",
                        _id: ObjectId()
                    }
                }
            })
        })
    })

    await leaderboard.updateOne({name: "weekly players"}, {players: usersRepartition, lastEdited: Date.now()})
    process.leaderboard = usersRepartition
}

function bihourlyLeaderboard() {
    leaderboardsCalculator(false)
}

/*const job = new CronJob('0 0 * * 1', weeklyRewards);
job.start();*/

/*const job2 = new CronJob("* *!/2 * * *", bihourlyLeaderboard)
job2.start();*/


module.exports = checkFinished
