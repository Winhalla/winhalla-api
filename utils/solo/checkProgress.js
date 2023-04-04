const quests = require('../questSolo.json')
const user = require('../../models/userSchema.js');
const centurionWatcher = require('../centurionWatcher');
const actualsDaily = require('./actualsDaily')

    module.exports = async function checkProgress(stats, player, res) {
    let actualQuest;
    let updates = {
        daily: {quests: [], updateNeeded: false},
        weekly: {quests: [], updateNeeded: false}
    }
    let updatedPlatforms = []
    //Checking each quest
    for (let i = 0; i < 2; i++) {
        const currentQuestType = i === 0 ? "daily" : "weekly"
        const currentQuestArrayName = currentQuestType + "Quests"
        player.solo[currentQuestArrayName].forEach(async (element, index) => {
            if (element == undefined) return
            actualQuest = quests[currentQuestType][element.id]
            actualQuest.weapon = element.weapon
            //Get actual values for each quest
            let nb = actualsDaily([actualQuest], stats)[0]
            // If the actual value has changed, update the actual value and the progress value
            if (nb.actual !== player.solo[currentQuestArrayName][index].actual) {
                //Update progress and actual
                let progress = (nb.actual - player.solo[currentQuestArrayName][index].actual) + player.solo[currentQuestArrayName][index].progress
                if(progress < player.solo[currentQuestArrayName][index].progress){
                    progress = player.solo[currentQuestArrayName][index].progress
                }
                // This tells the update script to update this quest type
                updates[currentQuestType].updateNeeded = true;
                nb.actualArray.forEach((e, i) => {
                    if (e > player.solo[currentQuestArrayName][index].actualArray[i]) {
                        if(!updatedPlatforms.includes(player.brawlhallaAccounts[i].platformId))
                            updatedPlatforms.push(player.brawlhallaAccounts[i].platformId)
                    }
                })
                // Add the quest to the array of quests that needs to be updated
                updates[currentQuestType].quests.push({
                    actual: nb.actual,
                    index,
                    progress: progress,
                    actualArray: nb.actualArray
                })
            }
        });
    }
    // If an update is needed
    if (updates.daily.updateNeeded || updates.weekly.updateNeeded) {
        for (let i = 0; i < 2; i++) {
            const currentQuestType = i === 0 ? "daily" : "weekly"
            const currentQuestArrayName = currentQuestType + "Quests"
            // If there is an update for this type of quest
            if (updates[currentQuestType].quests.length > 0) {
                updates[currentQuestType].quests.forEach((e, index) => {
                    player.solo[currentQuestArrayName][e.index].actual = e.actual
                    player.solo[currentQuestArrayName][e.index].actualArray = e.actualArray
                    player.solo[currentQuestArrayName][e.index].progress = e.progress
                })
            }
            // This var compensates the array indexes change if an item is removed from the array
            let times = 0
            // We need this var because using the length proprety of the array doesn't work because it changes when an item is removed
            let arrayLength = player.solo[currentQuestArrayName].length + 1 - 1
            for (let i = 0; i < arrayLength; i++) {
                // Get the quest
                let element = player.solo[currentQuestArrayName][i - times]
                // If the quest is finished add it to logs and change player data accordingly
                if (player.solo[currentQuestArrayName][i - times].goal <= updates[currentQuestType].quests.find(e => e.index === i)?.progress) {
                    if (player.solo.logs.length > 10) player.solo.logs.splice(10, player.solo.logs.length - 10)
                    player.solo.logs.push({
                        type: currentQuestType,
                        reward: element.reward,
                        "id": element.id,
                        "name": element.name,
                        "time": Math.round((Date.now() - player.solo[i === 0 ? "lastDaily" : "lastWeekly"]) / 1000 / 60),
                        "earned": player.solo[currentQuestArrayName][i - times].reward
                    })
                    // Check if this was not cheat
                    centurionWatcher("solo", {time: Math.round((Date.now() - player.solo[i === 0 ? "lastDaily" : "lastWeekly"]) / 1000 / 60)}, player)
                    // Pull quest from the quests array and push it to the finished (collectible quests) array
                    player.solo.finished[currentQuestType].push(player.solo[currentQuestArrayName].splice(i - times, 1)[0])
                    // Inc the number of items pulled from the quests array
                    times += 1
                }
            }
        }
        // Update player data if an update has been made
        await user.updateOne({steamId: player.steamId}, {solo: player.solo, "lastRefresh.quests": Date.now()})
    } else {
        await user.updateOne({steamId: player.steamId}, {"lastRefresh.quests": Date.now()})
    }
    // Send player data in any case
    res.send({"solo": player.solo, "updatedPlatforms": updatedPlatforms})
}