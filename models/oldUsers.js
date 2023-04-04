const mongoose = require('mongoose')
const userSchema = mongoose.Schema({
    steamId: String,
    brawlhallaId: Number,
    brawlhallaName: String,
    avatarURL: String,
    coins: Number,
    lastGames: [{
        gm: String,
        wins: Number,
        games: Number,
        coinsEarned: Number,
        players: Array,
        id: String,
        rank:Number,
        Date: { type: Date, default: Date.now() }
    }],
    solo: {
        dailyQuests: [{
            id: Number,
            name: String,
            progress: Number,
            goal: Number,
            actual: Object,
            reward: Number,
        }],
        weeklyQuests: [{
            id: Number,
            name: String,
            progress: { type: Number, default: 0 },
            goal: Number,
            actual: Object,
            reward: Number,
        }],
        finished: { daily: Array, weekly: Array },
        collected: { daily: Array, weekly: Array },
        logs: Array,
        lastDaily: Number,
        lastWeekly: Number,
        earnMoreNextQuest:Boolean,
    },
    waitingNewQuestsDaily: Boolean,
    waitingNewQuestsWeekly: Boolean,
    roadStatus: Number,
    email: String,
    notifications: { type: Array, default: null },
    boost: { type: Number, default: 0 },
    boostExpiration: Number,
    stats: {
        ffa: {
            wins: { type: Number, default: 0 },
            gamesPlayed: { type: Number, default: 0 }
        },
        "2v2": {
            wins: { type: Number, default: 0 },
            gamesPlayed: { type: Number, default: 0 }
        },
        solo: {
            wins: { type: Number, default: 0 },
            gamesPlayed: { type: Number, default: 0 }
        }
    },
    isSucpicious: {
        ffa: { type: Boolean, default: false },
        solo: { type: Boolean, default: false }
    },
    linkId:String,
    lastVideoAd:{
        earnCoins: {
            nb:Number,
            timestamp: Number
        },
    },
    lastLotteryRoll:{
        timestamp:Number
    },
    joinDate:Number,
    coinsThisWeek:{type:Number,default:0}
})
module.exports = mongoose.model('oldUser', userSchema)