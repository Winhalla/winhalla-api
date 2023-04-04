const mongoose = require('mongoose');

const duelSchema = mongoose.Schema({
        remainingSpace: Number,
        finished: {type:Boolean, default:false},
        started: {type:Boolean, default:false},
        questOptions:Object,
        players:[{
            quests:Array,
            steamId:Number,
            brawlhallaId:Number,
            username: String,
            quest1:Number,
            quest2:Number,
            quest3:Number,
            avatarURL:String,
        }],
        winners:{type:Array,default:""},
        Date: Date
        
})
module.exports = mongoose.model('duelRooms',duelSchema);