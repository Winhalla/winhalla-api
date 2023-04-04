const quests = require('../questSolo.json');
const characters = require('../characters')

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
// Returns random quests
module.exports = function random(dailies, weeklies,lastQuests) {
    // Prepare return data according to what type of quests is needed
    let returnData = {daily: dailies ? [] : null, weekly: weeklies ? [] : null}

    // Do twice the loop for daily and weekly
    Object.keys(returnData).forEach((e) => {
        // Check if the actual type of quest (daily, weekly) is needed
        if (returnData[e] != null) {
            // Get a random quest id and the according quest data
            let questsId = []
            questsId.push(getRandomInt(quests[e].length))
            while (lastQuests[e].some(id=>id === questsId[0])){
                questsId[0] = getRandomInt(quests[e].length)
            }
            let quest = JSON.parse(JSON.stringify(quests[e][questsId[0]]))
            // If the quest is weapon-related, pick a random weapon and put it in the weapon property of the quest
            if (quest.type === "weapon") {
                const weapon = JSON.parse(JSON.stringify(Object.keys(characters)[getRandomInt(Object.keys(characters).length - 1)]))
                // Replace the weapon name placeholder by the weapon got by random
                quest.name = quest.name.replace("$$weapon$$", weapon)
                quest.weapon = weapon
            }
            // Add the quest to the data returned
            returnData[e].push(quest)
            questsId.push(getRandomInt(quests[e].length))
            // Ensures that the quest chosen is compatible
            while (quests[e][questsId[0]].uncompatibility.some(element => element == questsId[1]) || lastQuests[e].some(id=>id === questsId[1])) {
                questsId[1] = getRandomInt(quests[e].length)
            }
            // Get the quest data by the id randomly chosen
            quest = JSON.parse(JSON.stringify(quests[e][questsId[1]]))

            // If the quest is weapon-related, pick a random weapon and put it in the weapon property of the quest
            if (quest.type === "weapon") {
                const weapon = JSON.parse(JSON.stringify(Object.keys(characters)[getRandomInt(Object.keys(characters).length - 1)]))
                // Replace the weapon name placeholder by the weapon got by random
                quest.name = quest.name.replace("$$weapon$$", weapon)
                quest.weapon = weapon
            }
            // Add the quest to the data returned
            returnData[e].push(quest)
        }
    })
    return returnData
}