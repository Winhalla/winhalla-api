const {Router} = require('express');
const lobby = require("../models/lobbySchema");
const router = Router()
const user = require('../models/userSchema')
const inGame = require('../utils/inGame')
const {incChallengeProgress} = require("../utils/dailyChallenge");
router.get("/getReward", async (req, res) =>{
    if (req.query.custom_data === "earnMoreSoloMatch") {
        // If player watches an ad to gain a multiplier on FFA
        let currentLobby = await inGame(req.query.user_id, true, true)
        if(!currentLobby) return res.sendStatus(200)
        if(currentLobby.players.find(e => e.steamId === req.query.user_id).adsWatched >= 16) return res.sendStatus(200);
        await lobby.updateOne(
            { players: { $elemMatch: { gamesPlayed: { $lt: 7 }, steamId: req.query.user_id, joinDate: { $gte: Date.now() - 3600 * 1000 } } }, finished: false },
            {
            $inc: {
                //"players.$.multiplier": player.adsWatched === 0 ? 100 : 200,
                "players.$.multiplier": 100,
                "players.$.adsWatched": 1
            }
        })
    }
    if (req.query.custom_data === "dailyChallenge") {
        const user1 = await user.findOne({steamId:req.query.user_id})
        incChallengeProgress(user1, "ad")
    }
    res.sendStatus(200)
})

module.exports = router