const lobby = require('../models/lobbySchema');
const user = require('../models/userSchema');
const ObjectId = require('mongoose').Types.ObjectId;
const lotteryRandom = require('./lotteryRandom');
const coinsEarnedByVideo = 10;
const delayBetweenCoinsEarnedAds = 3600 //in seconds
const maxAdPerPeriod = 2
module.exports = async (state, socket, goal) => {
    if (process.advideo[state.steamId]) {
        // Only accept ads that are have been watched at least 4 seconds
        if (process.advideo[state.steamId].timestamp < Date.now() - 4000) {
            process.advideo[state.steamId].timestamp = Date.now()
        } else {
            socket.emit("advideo", {
                message: "You need to watch the ad at least 5 seconds in order to earn rewards",
                code: "error"
            });
            return delete process.advideo[state.steamId]
        }
        if(state.state === "error" ||state.state === "noAd") return delete process.advideo[state.steamId]
        if (state.state === "finished" && process.advideo[state.steamId].state === "started") {
            let player;
            let players;
            if (process.advideo[state.steamId].goal === "earnMoreFFA") {
                players = await lobby.findById(process.advideo[state.steamId].room, {players: 1})
                player = players.players.find(e => e.steamId === process.advideo[state.steamId].steamId)
                if (player.adsWatched >= 8) return socket.emit("advideo", {
                    message: "You have already watched the maximum ads per match",
                    code: "error"
                })
            }
            try {
                if (process.advideo[state.steamId].goal === "earnMoreFFA") {
                    // If player watches an ad to gain a multiplier on FFA
                    await lobby.updateOne({
                        _id: ObjectId(process.advideo[state.steamId].room),
                        "players.steamId": process.advideo[state.steamId].steamId,
                    }, {
                        $inc: {
                            //"players.$.multiplier": player.adsWatched === 0 ? 100 : 200,
                            "players.$.multiplier": 100,
                            "players.$.adsWatched": 1
                        }
                    })

                    socket.emit("advideo", {
                        message: `You will receive ${player.adsWatched + 2}x more coins for this game`,
                        code: "success"
                    })
                    return process.advideo = {state: null}
                } else if (process.advideo[state.steamId].goal === "enterLottery") {
                    //If player watcher an ad to earn one or more lottery tickets
                    const user1 = await user.findOne({steamId: process.advideo[state.steamId].steamId})
                    if (!user1) {
                        socket.emit("advideo", {
                            message: "Error has occured while processing the reward : User not found in DB",
                            code: "error"
                        })
                    }
                    // This copy a part of an express response object
                    const {
                        won,
                        coins
                    } = await lotteryRandom(user1, {
                        req: {
                            query: {
                                id: process.advideo[state.steamId].shopItemId,
                                nb: 100/*change this nb if you want to give more tickets*/
                            }, user: {id: process.advideo[state.steamId].steamId}
                        }
                    }, 4500)
                    socket.emit("advideo", {
                        code: "success",
                        message: `You have successfully received a ticket, ${won > 0 ? "You have won a battle pass! Check your mails for more information." : coins > 0 ? "You have won " + coins + " coins" : "You have won nothing, better luck next time"}`,
                        won,
                        coins
                    })
                } else if (process.advideo[state.steamId].goal === "earnCoins") {
                    function sendSuccessToSocket() {
                        socket.emit("advideo", {
                            code: "success",
                            message: `You have successfully received ${coinsEarnedByVideo} coins`,
                            goal: process.advideo[state.steamId].goal
                        })
                    }

                    //If player watcher an ad to earn coins
                    const user1 = await user.findOne({steamId: process.advideo[state.steamId].steamId})
                    if (!user1.lastVideoAd) {
                        await user.updateOne({steamId: process.advideo[state.steamId].steamId}, {
                            $inc: {coins: coinsEarnedByVideo, coinsThisWeek: coinsEarnedByVideo},
                            $set: {"lastVideoAd.earnCoins": {timestamp: Date.now(), nb: 1}}
                        })
                        sendSuccessToSocket()
                    }
                    if (user1.lastVideoAd.earnCoins.timestamp + delayBetweenCoinsEarnedAds * 1000 > Date.now()) {
                        if (user1.lastVideoAd.earnCoins.nb < maxAdPerPeriod) {
                            await user.updateOne({steamId: process.advideo[state.steamId].steamId}, {
                                $inc: {coins: coinsEarnedByVideo, "lastVideoAd.earnCoins.nb": 1},
                            })
                            sendSuccessToSocket()
                        } else {
                            let minutes = Math.floor((user1.lastVideoAd.earnCoins.timestamp + delayBetweenCoinsEarnedAds * 1000 - Date.now()) / 1000 / 60)
                            return socket.emit("advideo", {
                                code: "error",
                                message: `You have to wait ${minutes}:${Math.floor((user1.lastVideoAd.earnCoins.timestamp + delayBetweenCoinsEarnedAds * 1000 - Date.now()) / 1000) - minutes * 60} before watching an ad to earn coins again `
                            })
                        }
                    } else {
                        await user.updateOne({steamId: process.advideo[state.steamId].steamId}, {
                            $inc: {coins: coinsEarnedByVideo},
                            $set: {"lastVideoAd.earnCoins": {timestamp: Date.now(), nb: 1}}
                        })
                        sendSuccessToSocket()
                    }


                } else if (process.advideo[state.steamId].goal === "earnMoreQuests") {
                    await user.updateOne({steamId: process.advideo[state.steamId].steamId}, {"solo.earnMoreNextQuest": true})
                    socket.emit("advideo", {
                        code: "success",
                        message: `You received 1x more rewards for this quest`
                    })
                } else {
                    socket.emit("advideo", {
                        message: "Error has occured while processing the reward",
                        code: "error"
                    })
                }
                delete process.advideo[state.steamId]

            } catch (e) {
                socket.emit("advideo", {
                    message: "Error has occured while verifying video view",
                    code: "error"
                })
                console.log(e)

            }
            return delete process.advideo[state.steamId]
        }
        process.advideo[state.steamId].state = state.state;

    } else if (state.state) {
        if (state.state === "started") {
            if (!state.steamId || state.steamId < 10000) return socket.emit("advideo", {
                message: "You have to be logged in to watch ads",
                code: "account error"
            })
            process.advideo[state.steamId] = {
                state: "started",
                timestamp: Date.now() / 1000,
                room: state.room,
                shopItemId: state.shopItemId,
                steamId: state.steamId,
                goal: goal
            }
        }
    }
}