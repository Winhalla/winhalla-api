const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    tutorialStep: {
        hasDoneTutorialMatch: {type: Boolean, default: false},
        hasDoneTutorialQuest: {type: Boolean, default: false},
    },
    dailyChallenge: {
        lastRefresh: {type: Number,},
        challenges: [
            {
                name: String,
                goalNb: Number,
                progress: {type: Number, default: 0},
                completed: Boolean,
                active: Boolean,
                goal: String,
                reward: Number
            }
        ],
    },
    goal: {
        cost: Number,
        name: String,
        id: Number
    },
    accountType: String,
    steamId: String,
    declaredSteamId: String,
    brawlhallaAccounts: [{
        BID: String,
        name: String,
        platformId: String,
        steamId: String,
    }],
    brawlhallaId: Number,
    brawlhallaName: String,
    avatarURL: String,
    miniAvatarURL: String,
    coins: Number,
    lastRefresh: {
        quests: Number,
    },
    lastGames: [{
        gm: String,
        wins: Number,
        games: Number,
        coinsEarned: Number,
        players: Array,
        id: String,
        rank: Number,
        Date: {type: Date, default: Date.now()}
    }],
    solo: {
        dailyQuests: [{
            id: Number,
            name: String,
            progress: {type: Number, default: 0},
            goal: Number,
            actual: Object,
            actualArray: [
                Number,
            ],
            reward: Number,
            weapon: String
        }],
        weeklyQuests: [{
            id: Number,
            name: String,
            progress: {type: Number, default: 0},
            goal: Number,
            actual: Object,
            actualArray: [
                Number,
            ],
            reward: Number,
            weapon: String
        }],
        lastQuests: {daily: [Number], weekly: [Number]},
        finished: {daily: Array, weekly: Array},
        collected: {daily: Array, weekly: Array},
        logs: Array,
        lastDaily: Number,
        lastWeekly: Number,
        earnMoreNextQuest: Boolean,
    },

    waitingNewQuestsDaily: Boolean,
    waitingNewQuestsWeekly: Boolean,
    email: String,
    notifications: {type: Array, default: null},
    boost: {type: Number, default: 0},
    boostExpiration: Number,
    stats: {
        solo: {
            wins: {type: Number, default: 0},
            gamesPlayed: {type: Number, default: 0}
        },
        "2v2": {
            wins: {type: Number, default: 0},
            gamesPlayed: {type: Number, default: 0}
        }
    },
    isSucpicious: {
        ffa: {type: Boolean, default: false},
        solo: {type: Boolean, default: false}
    },
    linkId: String,
    lastVideoAd: {
        earnCoins: {
            nb: Number,
            timestamp: Number
        },
    },
    lastLotteryRoll: {
        timestamp: Number
    },
    joinDate: Number,
    coinsThisWeek: {type: Number, default: 0},
    coinLogs: {
        total: {
            solo: {
                type: Number,
                default: 0
            },
            dailyQuests: {
                type: Number,
                default: 0
            },
            dailyChallenge: {
                type: Number,
                default: 0
            },
            weeklyQuests: {
                type: Number,
                default: 0
            },
            link: {
                type: Number,
                default: 0
            },
            redeemed: {
                type: Number,
                default: 0
            },
            beta: {
                type: Number,
                default: 0
            }
        },
        history: Array
    },
    lastPayout: Number,
    guidesOpenedList: Object
})
userSchema.index({steamId: 1})
module.exports = mongoose.model('user', userSchema)