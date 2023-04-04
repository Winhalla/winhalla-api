const {Router} = require('express');
const lobby = require('../../models/lobbySchema.js');
const user = require('../../models/userSchema')
const ffaEnd = require('../../utils/ffaEnd')
let router = Router();
const {incChallengeProgress} = require('../../utils/dailyChallenge')
const notLoggedIn = require('../../utils/notLoggedIn')
const callBrawlhallaApi = require('../../utils/functions/callBrawlhallaApi')
const fakeSoloMatchObjs = require("../../utils/fakeMatch.js")

function calculateRewards(match, player1) {
    if(player1.gamesPlayed === 0 || match.players.length === 1) {
        let baseReward = 10
        let adBoost =  player1.adsWatched === 0 ? baseReward : baseReward*2;
        baseReward *= player1.multiplier / 100;
        return {"reward": baseReward, "rewardNextAd": adBoost+baseReward}
    }
    // copy array
    let players = match.players.filter(e => {
        return true;
    })

    let rewards = JSON.parse(JSON.stringify(process.dbConfig.find(e => e.name === "FFA REWARDS CONFIG")))
    let goldByPlayer = rewards.value.reduce((a, b) => a + b, 0) / rewards.value.length
    rewards = rewards.value;

    if (players.length !== 8) {
        let length = players.length
        let suppressionValue = goldByPlayer * (-(length - 10))
        const cutValue = rewards.splice(length)
        suppressionValue -= cutValue.reduce((a, b) => a + b, 0)
        let coefficient;
        rewards.forEach((e, a) => {
            coefficient = (e / (length * goldByPlayer + suppressionValue))
            rewards[a] -= Math.floor(coefficient * suppressionValue * 10) / 10
            rewards[a] = Math.round(rewards[a] * 10) / 10
        })
    }

    let lastWin
    let times = 0
    players.sort((a, b) => b.wins - a.wins)
    for (let i = 0; i < players.length; i++){
        const player = players[i];

        if (player.wins === lastWin) {
            player.rank = i - (1 + times)
            times++
        } else {
            player.rank = i
            times = 0
        }
        if (player.steamId === player1.steamId){
            let baseReward = rewards[player.rank];
            let adBoost = player.adsWatched === 0 ? baseReward : baseReward*2;
            baseReward *= player.multiplier / 100;
            return {"reward": Math.round(baseReward*10)/10, "rewardNextAd": adBoost+baseReward}
        }
    }
}

// Removes the wins of each person in the lobby except for the one who made the request
function playersWithoutWinsProperty(match, player) {
    match.players = match.players.map(e => {
        if (e.steamId != player.steamId) { //If this player is not the requester
            e.wins = undefined // Delete the wins property
        }
        return e
    })
    return match
}

// Returns match object with the new gamesPlayed and wins data
function makeMatchObjectUpToDate(match, player, req, {wins,games,gp}) {
    // Finds player index in the players array
    const playerIndex = match.players.findIndex(element => element.steamId == req.user.id);
    // Updates wins and gamesPlayed propreties as well as their total
    match.players[playerIndex].wins = gp <= 7 ? player.wins + wins - player.totalWins : Math.round((player.wins + wins - player.totalWins) / (gp / 7))
    match.players[playerIndex].gamesPlayed = gp <= 7 ? gp : 7
    match.players[playerIndex].totalWins = wins;
    match.players[playerIndex].totalGamesPlayed = games
    return match
}

// Removes players wins and send updated data for wins and gamesPlayed to user


// Returns whether the match is finshed or not (by checking if each players meats the condition of time (>1h) or games played (>=7))
// If true, returns also the match with updated propreties (like rank and coins earned) too
async function isMatchFinished(lobby1, player, gp, userPlayerNeedsUpdate, {req, wins,games}) {
    // Number of players that finished
    let finished = 0
    if (userPlayerNeedsUpdate) lobby1 = makeMatchObjectUpToDate(lobby1, player, req, {
        wins,
        games,
        gp
    })
    lobby1.players.forEach((element) => {
        // Sets the numebr of games of the requester to the updated number 
        if (element.steamId == player.steamId) {
            element.gamesPlayed = gp <= 7 ? gp : 7
        }
        // If one of the conditions (time (>1h), or gamesPlayed (>=7))
        if (element.gamesPlayed >= 7 || element.joinDate + 3600 * 1000 < Date.now()) {
            finished++
        }
    })
    // Ends match if all players have finished and there is more than 1 player in the lobby (ending a match with 1 person in is silly cuz the rewards are fixed)
    if (finished === lobby1.players.length && lobby1.players.length > 1) {
        return {match: await ffaEnd(lobby1), isFinished: true}
    }
    return {isFinished: false}
}

// Endpoint to get the data related to a certain match, queried by the ObjectID of the match (_id proprety)
router.get('/getMatch/:matchId', async function (req, res) {
    // If user is not logged in send a 403 error with basic details
    if (!req.user) return notLoggedIn(res)
    // Global var that will store the match details
    let lobby1
    try {
        ///////////////////////////////////////////////////////////////
        // For tutorial
        if(req.params.matchId === "tutorial"){
            const user1 = await user.findOne({steamId: req.user.id})
            if(req.query.isRefresh === "true"){
                const fakeMatch = fakeSoloMatchObjs["refreshed"](user1)
                if(user1.tutorialStep?.hasDoneTutorialMatch === false) {
                    await user.updateOne(
                        {steamId: user1.steamId, "tutorialStep.hasDoneTutorialMatch": {$ne:true},},
                        {
                            $set:{
                                "tutorialStep.hasDoneTutorialMatch": true,
                            },
                            $push: {
                                lastGames: [{
                                    gm: 'FFA',
                                    wins: 4,
                                    games: 7,
                                    coinsEarned: 400,
                                    players: fakeMatch.players.map(a => a.username),
                                    Date: Date.now(),
                                    rank: 0,
                                    id: "tutorial"
                                }],
                                "coinLogs.history": {
                                    type: "solo",
                                    displayName: `Solo match`,
                                    data: {
                                        reward: 400,
                                        multiplier: {base: 400, event: 0, link: 0, player: 0, ad: 0},
                                        rank: 0,
                                        id: "tutorial"
                                    },
                                    timestamp: Date.now()
                                }
                            },
                            $inc: {
                                coins: 400,
                                "coinLogs.total.solo": 400,
                            },
                        },
                    )
                    await incChallengeProgress(user1,"winhallaMatch")
                }
                res.send(fakeMatch)

            } else {
                res.send(fakeSoloMatchObjs["notRefreshed"](user1))
            }
            return;
        }
        ///////////////////////////////////////////////////////////////

        lobby1 = await lobby.findById(req.params.matchId);
        if (!lobby1) return res.status(404).send("Game not found");
        // Finds requester data in the match
        let player = lobby1.players.find(element => element.steamId == req.user.id);
        // If player is not found or has refreshed less than 2 minutes ago, send the lobby without modification
        if (!player || lobby1.finished || player.lastRefresh + 120 * 1000 > Date.now()) {
            if(player){
                const sentMatch = JSON.parse(JSON.stringify(playersWithoutWinsProperty(lobby1,player)));
                sentMatch.estimatedReward = calculateRewards(sentMatch, player);
                res.send(sentMatch);
            } else {
                const sentMatch = JSON.parse(JSON.stringify(lobby1));
                // Avoid errors client-side
                sentMatch.estimatedReward = {"reward": 50, "rewardNextAd": 75};
                res.send(sentMatch);
            }
            return;
        }
        // If the player has finished the match, skip the player data calculation
        if (player.gamesPlayed >= 7 || player.joinDate + 3600 * 1000 < Date.now()) {
            // Check if everyone has finished the match
            let {match, isFinished} = await isMatchFinished(lobby1, player, player.gamesPlayed, false, {})
            // If so, it sends the edited match (with rank, rewards and multiplierDetails for example)
            if (isFinished) {
                lobby1 = match
            }
            // In any case, send the match without wins property
            const sentMatch = JSON.parse(JSON.stringify(playersWithoutWinsProperty(lobby1,player)))
            sentMatch.estimatedReward = calculateRewards(sentMatch, player)
            return res.send(sentMatch)
        }
        let stats = await callBrawlhallaApi(player.allBrawlhallaIds, "ranked", res)
        if (stats.stats === "err") return // response handled by callBrawlhallaApi

        let wins = 0, games = 0;
        // Iterates over all duo teams to have the total number of wins and games in 2v2 stored in duoWins and duoGames
        //* could be better with array.reduce
        let gpByAccount = []
        let oldGames = 0;
        stats.forEach((e,i)=>{
            oldGames = games;
            e.ranked.data['2v2'].forEach(element => {
                wins += element.wins;
                games += element.games
            });
            wins += e.ranked.data.wins
            games += e.ranked.data.games
            gpByAccount.push(games-oldGames)
        })
        let updatedPlatforms = []
        gpByAccount.forEach((e,i)=>{
            if(e > player.totalGamesPlayedByPlatform[i]) updatedPlatforms.push(player.allBrawlhallaIds[i].platformId);
        })

        if(updatedPlatforms.length > 0){
            await lobby.updateOne({_id: lobby1._id, "players.steamId": req.user.id}, {
                "players.$.hasAlreadySuccessfullyRefreshed": true
            })
        }

        // Games played number
        const gp = player.gamesPlayed + games - player.totalGamesPlayed;
        // If games number changed, update player's data
        if (games !== player.totalGamesPlayed) {
            // Daily challenge
            if(gp >= 7){
                const user1 = await user.findOne({steamId: player.steamId})
                incChallengeProgress(user1,"winhallaMatch")
            }

            // If the player was the last one to have not finished, and now is at 7 games, calculate ranks,rewards,multipliers...
            let {match, isFinished} = await isMatchFinished(lobby1, player, gp, true, {
                req,
                wins,
                games,
            })
            // If match is finished, it has been updated by isMatchFinished, so no need to update it again
            if (isFinished) {
                // Stringify then parse to change the object to a native one (not a mongoDB document), in order to be able to add properties to it
                const sentMatch = JSON.parse(JSON.stringify(playersWithoutWinsProperty(lobby1,player)))
                sentMatch.updatedPlatforms = updatedPlatforms
                sentMatch.estimatedReward = calculateRewards(sentMatch, player)
                return res.send(sentMatch)
            }
            // Else, update the match
            await lobby.updateOne({
                "_id": lobby1._id,
                "players.steamId": req.user.id
            }, {
                "players.$.totalWins": wins,
                "players.$.totalGamesPlayed": games,
                "players.$.totalGamesPlayedByPlatform": gpByAccount,
                "players.$.wins": player.wins,
                "players.$.gamesPlayed": player.gamesPlayed,
                "fastFinish": gp >= 7 && lobby1.players.length === 1,
                "players.$.lastRefresh":Date.now()
            })

            // Sends match without wins properties and with games, wins, etc... updated
            lobby1.fastFinish = gp >= 7 && lobby1.players.length === 1;
            lobby1.players[lobby1.players.findIndex(element => element.steamId === req.user.id)] = player

            // Stringify then parse to change the object to a native one (not a mongoDB document), in order to be able to add properties to it
            const sentMatch = JSON.parse(JSON.stringify(playersWithoutWinsProperty(lobby1,player)))
            sentMatch.updatedPlatforms = updatedPlatforms
            sentMatch.estimatedReward = calculateRewards(sentMatch, player)
            res.send(sentMatch)
            // Sends the socket message after 4s to let the time to connect for people who just joined the match 
            setTimeout(() => {
                process.socketio.to("FFA" + lobby1._id).emit('lobbyUpdate', sentMatch);
            }, 4000)

        } else {
            await lobby.updateOne({
                "_id": lobby1._id,
                "players.steamId": req.user.id
            }, {
                "players.$.lastRefresh":Date.now()
            })
            // If the player has not been updated it's number of wins or games, just send the match
            const sentMatch = JSON.parse(JSON.stringify(playersWithoutWinsProperty(lobby1,player)))
            sentMatch.estimatedReward = calculateRewards(sentMatch, player)
            res.send(sentMatch)
        }
    } catch (error) {
        console.error(error)
        const sentMatch = JSON.parse(JSON.stringify(lobby1));
        // Avoid errors client-side
        sentMatch.estimatedReward = {"reward": 50, "rewardNextAd": 75};
        res.send(sentMatch);
    }
});
module.exports = router;