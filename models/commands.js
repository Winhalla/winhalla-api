const mongoose = require('mongoose');

const commands = mongoose.Schema({
    steamId:String,
    product:String,
    date:Number,
    source:String,
    brawlhallaName:String,
    avatarURL:String,
    state:{type:Number,default:0},
    email:String,
    platform:String,
    type:String,
    number:Number
})
module.exports = mongoose.model('command',commands);