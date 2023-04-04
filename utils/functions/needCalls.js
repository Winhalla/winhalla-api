const axios = require('axios')
const callBrawlhallaApi = require("./callBrawlhallaApi");
module.exports = async function needCalls(dailies, weeklies, accounts,res) {
    let needPlayer = false;
    let needRanked = false;
    if (dailies) {
        dailies.forEach(element => {
            if (element.need === "stats") needPlayer = true
            if (element.need === "ranked") needRanked = true
        });
    }
    if (!(needRanked === true && needPlayer === true)) {
        if (weeklies) {
            weeklies.forEach(element => {
                if (element.need === "stats") needPlayer = true
                if (element.need === "ranked") needRanked = true
            })
        }
    }
    if(needPlayer && needRanked){
        let stats = await callBrawlhallaApi(accounts, "all",false)
        if (stats.stats === "err") return "network err"
        return stats
    }
    else if (needRanked === true) {
        let stats = await callBrawlhallaApi(accounts, "ranked",false)
        if (stats.stats === "err") return "network err"
        return  stats
    }
    else {
        let stats = await callBrawlhallaApi(accounts, "stats",false)
        if (stats.stats === "err") return "network err"
        return stats
    }
}
