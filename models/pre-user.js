const mongoose = require('mongoose');

const user = mongoose.Schema({
    _id:String,
    source:String
})
module.exports = mongoose.model('preRegisteredUser', user);