const mongoose = require('mongoose');

const clans = mongoose.Schema({
    _id:String,
    members: [
        {
            steamId: String,
            permissions:Number, // 0:Member | 1:Invites allowed | 2:Can manage clan avatar and promote lvl 0 members to lvl 1 | 3:Owner
            name:String,
            avatarURL:String,
            weeklyScore:{type:Number, default:0},
        }
    ],
    level:{type:Number, default: 1},
    avatar:String,
    weeklyClanScore: {type:Number, default:0},
})
module.exports = mongoose.model('clan', clans);