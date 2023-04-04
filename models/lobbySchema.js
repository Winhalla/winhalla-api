const mongoose = require('mongoose');
//T.ODO: index sur finished
const lobbySchema = mongoose.Schema({
    remainingSpace: Number,
    finished: {type: Boolean, default: false},
    fastFinish: {type: Boolean, default: false},
    players: [{
        hasAlreadySuccessfullyRefreshed: {type: Boolean, default: false},
        steamId: String,
        brawlhallaId: Number,
        allBrawlhallaIds:[{
            BID:String,
            name:String,
            platformId:String
        }],
        lastRefresh:Number,
        username: String,
        avatarURL: String,
        wins: {type: Number, default: 0},
        totalWins: Number, //Total number of wins, to compare with the new data from the API (newWinsDataFromAPI - totalWinsPlayed) = number of wins to add
        gamesPlayed: {type: Number, default: 0},
        totalGamesPlayed: Number,//Total number of games played this season, to compare with the new data from the API (newGamesDataFromAPI - totalGamesPlayed) = number of games to add
        totalGamesPlayedByPlatform: [Number],
        multiplier: {type: Number, default: 100},
        joinDate: Number,
        adsWatched: {type: Number, default: 0},
        rank: Number, // Rank of the player, 0 to 6
        rewards: Number,
        multiplierDetails: Object,
        updateCount: {type: Number, default: 0} //for the auto updates every 30 minutes
    }],
    Date: Number, //Date of creation as number, for more efficient queries to DB
    createdAt: Date //Date of creation as Date Object, for automatic deletion after 14 days (mongo does not support dates as Numbers)
})
//lobbySchema.set('autoIndex', false)
//lobbySchema.index({finished:1})
module.exports = mongoose.model('lobby', lobbySchema);
