const mongoose = require('mongoose');

const email = mongoose.Schema({
    email:String,
    emailsSent:[String]
})
module.exports = mongoose.model('email',email);