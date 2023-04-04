//! WIP
const {Router} = require("express");
const router = Router();
const user = require("../models/userSchema")
router.get('/', async (req, res) => {
    if (!req.user) return res.send({
        leaderboard: process.leaderboard,
        config: process.dbConfig.find(e => e.name === "LEADERBOARD")
    });
    let leaderboardSent = JSON.parse(JSON.stringify(process.leaderboard))
    let found = false
    leaderboardSent.players.forEach((leaderboard,ii) => {
        if (found) return
        for (let i = 0; i < leaderboard.length; i++) {
            let e = leaderboard[i]
            if (e.steamId === req.user.id) {
                found = {index: i,array:ii,player:e}
                break
            }
        }
    })
    if(!found){
        const user1 = await user.findOne({steamId:req.user.id})
        found = {index:null,array:null,player:{avatarURL: user1.avatarURL,coinsThisWeek:user1.coinsThisWeek,brawlhallaName:user1.brawlhallaName}}
    }
    res.send({
        leaderboard: leaderboardSent,
        config: process.dbConfig.find(e => e.name === "LEADERBOARD"),
        player: {...found}
    });
})
module.exports = router