const {Router} = require('express');
const lobby = require("../models/lobbySchema");
const router = Router()
const user = require('../models/userSchema')
const inGame = require('../utils/inGame')
const { incChallengeProgress } = require("../utils/dailyChallenge");

//! if you change multiplier per ad here, change it in routes/gamemodes/getFFA.js too
router.get("/getReward", async (req, res) =>{
    if (req.query.custom_data === "earnMoreSoloMatch") {
        // If player watches an ad to gain a multiplier on FFA
        let currentLobby = await inGame(req.query.user_id, true, true);
        if (!currentLobby) return res.sendStatus(200);
        let player = currentLobby.players.find(e => e.steamId === req.query.user_id)
        if (player.adsWatched >= 16) return res.sendStatus(200);
        await lobby.updateOne(
            { _id: currentLobby._id, "players.steamId": req.query.user_id, },
            {
                $inc: {
                    "players.$.multiplier": player.adsWatched === 0 ? 100 : 200,
                    //"players.$.multiplier": 100,
                    "players.$.adsWatched": 1
                }
            });

    } else if (req.query.custom_data === "dailyChallenge") {
        const user1 = await user.findOne({ steamId: req.query.user_id });
        if(!user1) return res.sendStatus(200)
        incChallengeProgress(user1, "ad");
    } else {
        let currentLobby = await lobby.findOne({ _id: req.query.custom_data });
        if (!currentLobby) return res.sendStatus(200);
        let player = currentLobby.players.find(e => e.steamId === req.query.user_id);
        if (player.adsWatched >= 16) return res.sendStatus(200);
        await lobby.updateOne(
            { _id: currentLobby._id, "players.steamId": req.query.user_id, },
            {
                $inc: {
                    "players.$.multiplier": player.adsWatched === 0 ? 100 : 200,
                    //"players.$.multiplier": 100,
                    "players.$.adsWatched": 1
                }
            });
    }
    res.sendStatus(200);
});

module.exports = router