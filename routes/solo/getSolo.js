const {Router} = require('express');
const axios = require('axios')
const router = Router();

const user = require('../../models/userSchema');
const callBrawlhallaApi = require('../../utils/functions/callBrawlhallaApi')
const special6 = require('../../utils/special6.js');
const calculateQuestsActualValue = require('../../utils/solo/actualsDaily.js');
const random = require('../../utils/solo/randomQuests.js');
const checkProgress = require('../../utils/solo/checkProgress.js');
const needCalls = require('../../utils/functions/needCalls')
const notLoggedIn = require('../../utils/notLoggedIn')
const collect = require('./collect');

router.get('/solo', async function (req, res) {
    if (!req.user) return notLoggedIn(res)
    try {
        let player = await user.findOne({steamId: req.user.id})
        if(req.query.tutorial === "true"){
            if(!player.tutorialStep.hasDoneTutorialQuest) {
                player.solo.dailyQuests[0].progress = player.solo.dailyQuests[0].goal
                await user.updateOne({steamId: player.steamId}, {
                    $pull: {
                        "solo.dailyQuests": {id: player.solo.dailyQuests[0].id}
                    },
                    $push: {
                        "solo.finished.daily": player.solo.dailyQuests[0]
                    },
                    $set: {
                        "tutorialStep.hasDoneTutorialQuest": true,
                    }
                })
            }
            return res.send({"solo": (await user.findOne({steamId: player.steamId}, {solo: 1})).solo})
        }

        if (!player) res.status(403).send("Account needs to be created")
        // If player needs new quests
        if (player.waitingNewQuestsDaily === true
            || player.waitingNewQuestsWeekly === true
            || player?.solo?.lastDaily + 1000 * 3600 * 24 < Date.now()
            || player?.solo?.lastWeekly + 1000 * 3600 * 24 * 7 < Date.now()) {

            // Get random quests for needed types
            let questsWithoutUserData = random(
                player.waitingNewQuestsDaily || player?.solo?.lastDaily + 1000 * 3600 * 24 < Date.now(),
                player.waitingNewQuestsWeekly || player?.solo?.lastWeekly + 1000 * 3600 * 24 * 7 < Date.now(), player.solo.lastQuests)

            //// Calculates actual total values for quests goal (to do a substaction and get the progress later)
            // optimizes calls to Brawlhalla API
            let calls = await needCalls(questsWithoutUserData.daily, questsWithoutUserData.weekly, player.brawlhallaAccounts, res,)
            for (let i = 0; i < 2; i++) {
                // These vars are to determine if we are calculating daily or weekly quests
                const currentQuestType = i === 0 ? "daily" : "weekly"
                const currentQuestArrayName = currentQuestType + "Quests"
                // If this quest type is not needed then don't calculate it
                if (!questsWithoutUserData[currentQuestType]) continue

                let actualsValues = calculateQuestsActualValue(questsWithoutUserData[currentQuestType], calls)

                // Reset quests array
                player.solo[currentQuestArrayName] = []
                player.solo.collected[currentQuestType] = []
                // Add the new quests to the quest array with the actual value calculated before
                questsWithoutUserData[currentQuestType].forEach((element, i) => {
                    player.solo[currentQuestArrayName].push(element)
                    player.solo[currentQuestArrayName][i].actual = actualsValues[i].actual
                    player.solo[currentQuestArrayName][i].actualArray = actualsValues[i].actualArray
                })
                player.solo.lastQuests[currentQuestType].splice(-2)
                player.solo.lastQuests[currentQuestType].push(...player.solo[currentQuestArrayName].map(e => e.id))
                player.solo[i === 0 ? "lastDaily" : "lastWeekly"] = Date.now()
            }

            //Send new data and update
            res.send({"solo": player.solo,newQuests:true})
            await user.updateOne({steamId: player.steamId}, {
                solo: player.solo,
                "lastRefresh.quests":Date.now(),
                waitingNewQuestsDaily: false,
                waitingNewQuestsWeekly: false
            })

        }
        // If player already got quests
        else if (player.solo.logs.length !== 0 || player.solo.lastDaily) {
            if(player?.lastRefresh?.quests && player?.lastRefresh?.quests + 300 * 1000 > Date.now()) return res.send({solo:player.solo, "updatedPlatforms": []})

            const stats = await callBrawlhallaApi(player.brawlhallaAccounts, "all", res)
            if (stats.stats === "err") return

            // Calculates quests progress, updates document
            // And sends response
            await checkProgress(stats, player, res)
        }
        // If player has never had quests (it initializes quests)
        else {

            //Get new and random quests for both types
            let questsData = random(true, true, {daily: [], weekly: []})

            //Querying brawlhalla api
            const calls = await needCalls(questsData.daily, questsData.weekly, player.brawlhallaAccounts, res)
            if (calls === "network err") return
            //Calculates actual values for daily quests
            let calculatedQuestsValues = calculateQuestsActualValue(questsData.daily, calls, questsData.weekly)

            //Defining solo object for update and response
            player.solo = {
                dailyQuests: [],
                weeklyQuests: [],
                finished: {
                    daily: [],
                    weekly: [],
                },
                collected: {
                    daily: [],
                    weekly: [],
                },
                logs: [],
                lastDaily: Date.now(),
                lastWeekly: Date.now(),
                lastQuests: {daily: [], weekly: []}
            }
            // Populate both arrays with the new quests
            for (let i = 0; i < 2; i++) {
                const currentQuestType = i === 0 ? "daily" : "weekly"
                const currentQuestArrayName = currentQuestType + "Quests"
                questsData[currentQuestType].forEach((element, i) => {
                    player.solo[currentQuestArrayName].push(element)
                    // Set actual value to the one calculated earlier
                    player.solo[currentQuestArrayName][i].actual = calculatedQuestsValues[currentQuestType + "Actuals"][i].actual
                    player.solo[currentQuestArrayName][i].actualArray = calculatedQuestsValues[currentQuestType + "Actuals"][i].actualArray
                })
                player.solo.lastQuests[currentQuestType].push(...player.solo[currentQuestArrayName].map(e => e.id))
            }
            // Update and send response
            await user.updateOne({steamId: player.steamId}, {solo: player.solo,"lastRefresh.quests":Date.now()})
            res.send({"solo": player.solo,newQuests:true})

        }
    } catch (err) {
        console.log(err)
    }

})
router.post('/solo/collect', collect)
router.get('/getSolo', async (req, res) => {
    // Don't answer not logged in users
    if (!req.user) return notLoggedIn(res)
    // Find the user
    const user1 = await user.findOne({steamId: req.user.id})
    if (!user1) return res.send(null)
    // Send it's data
    res.send({"solo": user1.solo})
})
module.exports = router
