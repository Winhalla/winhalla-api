const lobby = require('../models/lobbySchema.js')
    , user = require('../models/userSchema.js')
    , link = require('../models/links')
const calculateMultiplier = require('./calculateMultiplier')
const centurionWatcher = require('./centurionWatcher');
const sendRewardsToParent = require("./functions/sendRewardsToParent")
const axios = require("axios");
let goldByPlayer;
let rewards;
let rewardsData;
let linksData;
let eventData;
let time = -1
const ObjectId = require("mongoose").Types.ObjectId;
const callBrawlhallaApi = require('../utils/functions/callBrawlhallaApi')
const {incChallengeProgress} = require("./dailyChallenge");
const admin = require("firebase-admin");


async function calculateRewards(element, isForced) {
    const filteredPlayerList = element.players.filter(p => {
        if (p.updateCount <= 0 && p.joinDate + 1800 * 1000 < Date.now() && p.joinDate + 4800 * 1000 > Date.now() && p.gamesPlayed < 7) {
            return true
        } else if (p.updateCount === 1 && p.joinDate + 3600 * 1000 < Date.now() && p.joinDate + 4800 * 1000 > Date.now() && p.gamesPlayed < 7) {
            return true
        }
    });
    let updated = false
    for (const player of filteredPlayerList) {
        let stats = await callBrawlhallaApi(player.allBrawlhallaIds, "ranked", false)
        if (stats.stats === "err") return
        let wins = 0, games = 0;
        // Iterates over all duo teams to have the total number of wins and games in 2v2 stored in duoWins and duoGames
        stats.forEach((e,i)=>{
            e.ranked.data['2v2'].forEach(element => {
                wins += element.wins;
                games += element.games
            });
            wins += e.ranked.data.wins
            games += e.ranked.data.games
        })
        // Wins number
        const winsNb = wins - player.totalWins;
        // Games played number
        const gp = player.gamesPlayed + games - player.totalGamesPlayed;

        if (games !== player.totalGamesPlayed) {
            updated = true
            await lobby.updateOne({
                "_id": element._id,
                "players.steamId": player.steamId,
            }, {
                "players.$.totalWins": wins,
                "players.$.totalGamesPlayed": games,
                "players.$.wins": gp <= 7 ? player.wins + winsNb : Math.floor((player.wins + winsNb) / (gp / 7)),
                "players.$.gamesPlayed": gp <= 7 ? gp : 7,
                $inc: {
                    "players.$.updateCount": 1
                }
            });
            element.players[element.players.findIndex(e => e.steamId === player.steamId)].gamesPlayed = gp <= 7 ? gp : 7
            element.players[element.players.findIndex(e => e.steamId === player.steamId)].wins = gp <= 7 ? player.wins + winsNb : Math.floor((player.wins + winsNb) / (gp / 7))
        }
    }
    if (updated) {
        setTimeout(async () => {
            process.socketio.to("FFA" + element._id).emit('lobbyUpdate', await lobby.findOne({_id: element._id}));
        }, 4000)
    }

    if (element.players.length === 1 && element.players[0].gamesPlayed > 0) return;
    if (element.players.length === 1 && element.players[0].gamesPlayed === 0) {
        await lobby.deleteOne({_id: element._id});
        return;
    }
    rewards = JSON.parse(JSON.stringify(rewardsData.value))
    if (!isForced) {
        if (element.players[element.players.length - 1].joinDate > Date.now() - 1000 * 3600 && element.players.map(e => e.gamesPlayed).reduce((a, b) => a + b) !== element.players.length * 7) return;
    }
    let removedPlayers = element.players.filter(e => {
        return e.gamesPlayed === 0;
    })
    element.players = element.players.filter(e => {
        return e.gamesPlayed > 0;
    })
    //! if you change reward calculation here, change it in calculateRewards from routes/gamemodes/getFFA.js
    if (element.players.length === 0) return lobby.deleteOne({_id: element.id})
    if (element.players.length !== 8) {
        let length = element.players.length
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
    element.players.sort((a, b) => b.wins - a.wins)
    for (const player of element.players) {
        const i = element.players.indexOf(player);
        // Calculate if people are in an equal number of wins
        if (player.wins === lastWin) {
            player.rank = i - (1 + times)
            times++
        } else {
            player.rank = i
            times = 0
        }

        lastWin = player.wins

        // Query user
        const user1 = await user.findOne({steamId: player.steamId})
        if(user1){
            const linkFound = await link.findOne({"childs.id": player.steamId})
            let baseReward = rewards[player.rank]
            // Calculate amount earned
            let {multiplier, multiplierDetails} = calculateMultiplier(user1, linkFound, 100, player.multiplier - 100)
            player.rewards = rewards[player.rank] * multiplier
            player.rewards = Math.round(player.rewards * 100) / 100
            player.multiplier = multiplier
            player.multiplierDetails = multiplierDetails
            player.multiplierDetails.base = baseReward
            // Send modified amount to parent
            if (linkFound && multiplierDetails.link) await sendRewardsToParent(player.rewards, linkFound)

            if(player.gamesPlayed >= 7){
                await incChallengeProgress(user1, "winhallaMatch")
            }
            const updateObj = {
                $inc: {
                    coins: player.rewards,
                    coinsThisWeek: player.rewards,
                    "coinLogs.total.solo": player.rewards,
                    "stats.solo.gamesPlayed": 1,
                    "stats.solo.wins": player.rank === 0 ? 1 : 0
                },
                $push: {
                    notifications: {"$each": [{
                        id: 0,
                        message: `Your match ended`,
                        tip: `Click to view rewards`,
                        matchId: element._id.toString(),
                        _id: ObjectId()
                    }], "$slice": -20},
                    lastGames: {
                        "$each": [{
                            gm: 'FFA',
                            wins: player.wins,
                            games: player.gamesPlayed,
                            coinsEarned: player.rewards,
                            players: element.players.map(a => a.username),
                            Date: Date.now(),
                            rank: player.rank,
                            id: element._id.toString()
                        }], "$slice": -20
                    },
                    "coinLogs.history": {
                        type: "solo",
                        displayName: `Solo match`,
                        data: {
                            reward: player.rewards,
                            multiplier: player.multiplierDetails,

                            rank: player.rank,
                            id: element._id.toString()
                        },
                        timestamp: Date.now()
                    }
                },
            }
            if(user1.notificationTokens.length > 0 && user1.tutorialStep.hasFinishedTutorial === true){
                admin.messaging().sendToDevice(user1.notificationTokens,{
                    notification: {
                        title: "A match ended",
                        body: "Open the app to view rewards!",
                        android_channel_id: "match_end",
                    },
                    data: {
                        route: "/home?page=2",
                        matchId: element._id.toString()
                    }
                });
            }
            // Send rewards and notification to player
            await user.updateOne({steamId: player.steamId}, updateObj);
        }

        // Save player on global array for updating the lobby later
        element.players[i] = player

        // If the player is the last in the array, update the array
        if (i + 1 === element.players.length) {

            removedPlayers.forEach((e, i) => {
                e.rewards = 0
                e.rank = element.players.length
                e.multiplierDetails = {base: 0, event: 0, link: 0, player: 0, ad: 0}
                e.multiplier = 1
            })
            element.players.push(...removedPlayers)

            await lobby.updateOne({_id: element._id}, {
                players: element.players,
                finished: true
            })
            element.finished = true
            return element
        }
    }
}

module.exports = async (lobbies) => {
    rewardsData = process.dbConfig.find(e => e.name === "FFA REWARDS CONFIG")
    goldByPlayer = rewardsData.value.reduce((a, b) => a + b, 0) / rewardsData.value.length
    linksData = process.dbConfig.find(e => e.name === "LINKS CONFIG")
    eventData = process.dbConfig.find(e => e.name === "GOLD EVENT")
    rewards = JSON.parse(JSON.stringify(rewardsData.value))
    if (lobbies) {
        return await calculateRewards(lobbies, true)
    }
    lobbies = await lobby.find({finished: false, "players.joinDate": {$lte: Date.now() - 1000 * 3600}})
    if (lobbies == '') return
    for (const element of lobbies) {
        const status = await calculateRewards(element)
        if (status === "network error") return
    }
}

