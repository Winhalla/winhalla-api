const express = require('express')
let router = express.Router();
const lobby = require('../../models/lobbySchema');
const user = require('../../models/userSchema');
const stat = require('../../models/stats')
const inGame = require('../../utils/inGame')
const findGamesOfPlayer = require('../../utils/functions/findGamesOfPlayer')
const callBrawlhallaApi = require('../../utils/functions/callBrawlhallaApi')

// Calculates number of wins and games in duo
function calculateDuoStats(wins) {
    let duoWins = []
    let duoGames = []
    for (let i = 0; i < wins.length; i++) {
        duoWins[i] = 0
        duoGames[i] = 0
        wins[i].ranked.data['2v2'].forEach(element => {
            duoWins[i] += element.wins;
            duoGames[i] += element.games;
        });
    }
    return {duoWins, duoGames}
}

// Eaiser and prettier way to return player object
function returnPlayerObject(req, id1, wins, duoWins, duoGames) {
    let totalGamesByAccount = []
    let totalWins
    if (wins.length > 1) {
        totalWins = wins.reduce((a, b) => {
            if (a.ranked) {
                return a.ranked.data.wins + b.ranked.data.wins
            } else {
                return a + b.ranked.data.wins
            }
        })
    } else {
        totalWins = wins[0].ranked.data.wins
    }

    let totalGp
    if (wins.length > 1) {
        totalGp = wins.reduce((a, b) => {
            if (a.ranked) {
                totalGamesByAccount.push(...[a.ranked.data.games, b.ranked.data.games])
                return a.ranked.data.games + b.ranked.data.games
            } else {
                totalGamesByAccount.push(b.ranked.data.games)
                return a.ranked.data.games + b.ranked.data.games
            }
        })
    } else {
        totalGamesByAccount.push(wins[0].ranked.data.games)
        totalGp = wins[0].ranked.data.games
    }

    duoGames.forEach((e, i) => {
        if (totalGamesByAccount[i])
            totalGamesByAccount[i] += duoGames[i]
        else totalGamesByAccount[i] = duoGames[i]
    })

    return {
        multiplier:100,
        adsWatched:0,
        steamId: req.user.id,
        brawlhallaId: id1[0].brawlhalla_id,
        allBrawlhallaIds: id1,
        username: req.user.name,
        totalWins: totalWins + duoWins.reduce((a, b) => a + b),
        totalGamesPlayed: totalGp + duoGames.reduce((a, b) => a + b),
        totalGamesPlayedByPlatform: totalGamesByAccount,
        avatarURL: req.user.picture,
        joinDate: Date.now(),
        lastRefresh: Date.now(),
    }
}

let concurrentRequests = []
setInterval(() => {
    concurrentRequests = concurrentRequests.filter(e => e.timestamp + 5000 >= Date.now())
}, 2500)
router.get('/', async function (req, res) {
    if (concurrentRequests.find(e => req.user.id === e.id))
        return res.status(409).send("Another request from your account is in progress, please wait a few seconds")
    else (concurrentRequests.push({id: req.user.id, timestamp: Date.now()}))
    try {
        if (!req.user) return res.send(null)
        // Finds a match that has room and doesn't already have the requester in it
        const lobby1 = await lobby.findOne({
            "players.steamId": {$ne: req.user.id},
            finished: false,
            remainingSpace: {$gte: 1}
        });
        // Queries user
        const user1 = await user.findOne({steamId: req.user.id, accountType:"v2"})
        const isPlayerInLobby = await findGamesOfPlayer(req.user.id, false, {_id: 1})
        // if player is already in an active lobby, redirect him to that lobby
        if (isPlayerInLobby) return res.send(isPlayerInLobby._id)
        const bids = user1.brawlhallaAccounts
        let rankedData = await callBrawlhallaApi(bids, "ranked", res)
        if (rankedData.stats === "err") return

        // If there is no available lobby, create a new one 
        if (!lobby1) {
            let {duoWins, duoGames} = calculateDuoStats(rankedData)
            // Create new empty lobby with the user in
            const savedLobby = await lobby.create({
                remainingSpace: 7,
                Date: Date.now(),
                createdAt: Date.now(),
                players: [returnPlayerObject(req, bids, rankedData, duoWins, duoGames)]
            });
            // Inc the stats for lobbies and create empty stats documents for links and users
            let dateObj = new Date()
            let stringDate = `${dateObj.getUTCDate()}/${dateObj.getUTCMonth() + 1}/${dateObj.getUTCFullYear()}`
            res.status(201).send(savedLobby._id)
            await stat.updateOne({type: "Lobbies", date: stringDate}, {$inc: {data: 1}}, {upsert: true})
            await stat.updateOne({type: "Users", date: stringDate}, {$setOnInsert: {data: 0}}, {upsert: true})
            await stat.updateOne({type: "Joined Links", date: stringDate}, {$setOnInsert: {data: 0}}, {upsert: true})


        } else {// If there an available lobby, join it

            let {duoWins, duoGames} = calculateDuoStats(rankedData)
            // add the player to lobby
            await lobby.updateOne({_id: lobby1._id}, {
                $inc: {remainingSpace: lobby1.fastFinish ? -7 : -1}, $push: {
                    players: returnPlayerObject(req, bids, rankedData, duoWins, duoGames, user1)
                }
            })
            //Redirect user to found lobby
            res.send(lobby1._id)

            // Make match object up to date and sendable
            lobby1.players.forEach((element, i) => {
                lobby1.players[i].wins = undefined;
            })
            lobby1.players.push(returnPlayerObject(req, bids, rankedData, duoWins, duoGames, user1))
            lobby1.date = lobby1.remainingSpace === 1 || lobby1.fastFinish ? Date.now() : lobby1.Date
            lobby1.remainingSpace -= lobby1.fastFinish ? 7 : 1
            //Send update to socket
            setTimeout(() => {
                process.socketio.to("FFA" + lobby1._id).emit('lobbyUpdate', lobby1);
            }, 4000)
        }
        let index = concurrentRequests.findIndex(e => e.id === req.user.id)
        if (index !== -1) concurrentRequests.splice(index, 1)
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

module.exports = router;