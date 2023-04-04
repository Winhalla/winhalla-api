const mongoose = require('mongoose');

const leaderboard = mongoose.Schema({
    players:Array,
    lastEdited:Date

})
module.exports = mongoose.model('leaderboard',leaderboard);