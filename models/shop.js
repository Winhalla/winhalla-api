const mongoose = require('mongoose');

const shop = mongoose.Schema({
    id:Number,
    name:String,
    description:String,
    cost:Number,
    state:Number,
    platforms:Array,
    type:String,
    nickname:String
})
module.exports = mongoose.model('Shop item',shop);