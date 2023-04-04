const mongoose = require('mongoose');
//TODO: index sur finished
const logins = mongoose.Schema({
    password:String,
    username: String
})
//lobbySchema.set('autoIndex', false)
//lobbySchema.index({finished:1})
module.exports = mongoose.model('login', logins);
