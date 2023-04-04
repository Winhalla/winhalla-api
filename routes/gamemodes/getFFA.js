const {Router} = require('express');
const lobby = require('../../models/lobbySchema.js');
const user = require('../../models/userSchema')
const ffaEnd = require('../../utils/ffaEnd')
let router = Router();
const {incChallengeProgress} = require('../../utils/dailyChallenge')
const notLoggedIn = require('../../utils/notLoggedIn')
const callBrawlhallaApi = require('../../utils/functions/callBrawlhallaApi')
const fakeSoloMatchObjs = require("../../utils/fakeMatch.js")
// Removes the wins of each person in the lobby except for the one who made the request
function playersWithoutWinsProperty(match, player) {
    match.players = match.players.map(e => {
        if (e.steamId != player.steamId) { //If this player is not the requester
            e.wins = undefined // Delete the wins proprety
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
                if(user1.tutorialStep?.hasDoneTutorialMatch === false){
                    await user.updateOne(
                        {steamId: user1.steamId, "tutorialStep.hasDoneTutorialMatch": false,},
                        {
                            $set:{
                                "tutorialStep.hasDoneTutorialMatch": true,
                            },
                            $push: {
                                lastGames: [{
                                    gm: 'FFA',
                                    wins: 4,
                                    games: 7,
                                    coinsEarned: 10,
                                    players: fakeMatch.players.map(a => a.username),
                                    Date: Date.now(),
                                    rank: 0,
                                    id: "tutorial"
                                }],
                                "coinLogs.history": {
                                    type: "solo",
                                    displayName: `Solo match`,
                                    data: {
                                        reward: 1,
                                        multiplier: {base: 100, event: 0, link: 0, player: 0, ad: 0},
                                        rank: 0,
                                        id: "tutorial"
                                    },
                                    timestamp: Date.now()
                                }
                            },
                            $inc: {
                                coins: 10,
                                "coinLogs.total.solo": 10,
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
        // If player is not found, assume he is a spectator and sends the lobby without modification
        if (!player || lobby1.finished || player.lastRefresh + 90 * 1000 > Date.now()) return res.send(lobby1);

        // If the player has finished the match, skip the player data calculation
        if (player.gamesPlayed >= 7 || player.joinDate + 3600 * 1000 < Date.now()) {
            // Check if everyone has finished the match
            let {match, isFinished} = await isMatchFinished(lobby1, player, player.gamesPlayed, false, {})
            // If so, it sends the edited match (with rank, rewards and multiplierDetails for example)
            if (isFinished) {
                lobby1 = match
            }
            // In any case, send the match without wins property
            return res.send(playersWithoutWinsProperty(lobby1, player));
        }
        let stats = await callBrawlhallaApi(player.allBrawlhallaIds, "ranked", res)
        if (stats.stats === "err") return

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
            if(e > player.totalGamesPlayedByPlatform[i]) updatedPlatforms.push(player.allBrawlhallaIds[i].platformId)
        })

        // Games played number
        const gp = player.gamesPlayed + games - player.totalGamesPlayed;
        // If games number changed, update player's data
        if (games !== player.totalGamesPlayed) {
            // Daily challenge
            let incChallenge
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
            if (isFinished) return res.send(match)
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
            await incChallenge;
            // Sends match without wins properties and with games, wins, etc... updated
            lobby1.fastFinish = gp >= 7 && lobby1.players.length === 1;
            lobby1.players[lobby1.players.findIndex(element => element.steamId === req.user.id)] = player

            // Stringify then parse to change the object to a native one (not a mongoDB document), in order to be able to add properties to it
            const sentMatch = JSON.parse(JSON.stringify(playersWithoutWinsProperty(lobby1,player)))
            sentMatch.updatedPlatforms = updatedPlatforms
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
            res.send(playersWithoutWinsProperty(lobby1, player))
        }
    } catch (error) {
        console.log(error)
        res.send(lobby1)
    }
});
module.exports = router;