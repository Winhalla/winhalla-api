const mongoose = require('mongoose');

const loginToken = mongoose.Schema({
    steamId:String,
    id: String,
    name: String,
    email: String,
    picture: String,
    pictureMini: String
})
module.exports = mongoose.model('loginToken',loginToken);