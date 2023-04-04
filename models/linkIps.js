const mongoose = require('mongoose');

const linkIps = new mongoose.Schema({
    ip:String,
    createdAt:Date,
    link:String
})
module.exports = mongoose.model('linkIp',linkIps);