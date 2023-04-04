const characters = require('../characters');

module.exports = function actualsDaily(quests, stats, additionalData) {
    let dailyActuals = []

    // We use a function because it permits using it on 2 foreach callbacks
    function processQuestsArray(element) {
        let nb = 0;
        let numbersByAccount = []
        // Weapon-related quests
        if (element.category[0].includes("weapon")) {
            // Metric wanted (kos, damages...)
            let metric = element.category[0].split(":")[1]
            // Iterate over each legend because weapon data is held under each legend data
            stats.forEach((e,i)=>{
                let oldNb = nb
                e.stats.data.legends.forEach((e) => {
                    // Find the character to get if the current weapon is weaponone or weapontwo
                    const character = characters[element.weapon].find(ee => ee.legend === e.legend_name_key)
                    // If the character has the weapon
                    if (character) {
                        // Add the wanted data to the total
                        nb += parseInt(e[metric + character.weapon])
                    }
                })
                numbersByAccount.push(nb-oldNb)
            })
        }

        // Array quests (e.g. the data needed is in the legends array)
        else if (element.category[0].includes(':')) {

            // Array name and property name, to get the data
            let wanted = element.category[0].split(":")
                // Iterate over each object in the array wanted=
                stats.forEach((e,i)=>{
                    let oldNb = nb
                    e[element.need].data[wanted[0]].forEach(e => {
                        // Add the wanted data to the total
                        nb += parseInt(e[wanted[1]]) // Parse int because the API returns data in strings (noobz)
                    })
                    numbersByAccount.push(nb-oldNb)
                })
        }

        //Basic quests (quests that are accessible directly from a static and unique path (e.g. wins) )
        else {
            // Iterate for each number wanted
            stats.forEach((e,i)=>{
                let oldNb = nb
                element.category.forEach(elemen => {
                    // Add the wanted data to the total
                    nb += parseInt(stats[i][element.need].data[elemen])
                })
                numbersByAccount.push(nb-oldNb)
            })
        }
        dailyActuals.push({actual:nb,actualArray:numbersByAccount})
    }
    // Do the function for each quest provided
    quests.forEach(processQuestsArray)
    // If additional quests (weeklyQuests) are provided
    if (additionalData) {
        // Store already processed data
        let dailies = JSON.parse(JSON.stringify(dailyActuals)) // Stringify then parse to make the object unique and avoid it changing when edited by the next loop
        // Reset the quest data
        dailyActuals = []
        // Process additional data
        additionalData.forEach(processQuestsArray)
        return {dailyActuals: dailies, weeklyActuals: dailyActuals}
    }
    return dailyActuals
}