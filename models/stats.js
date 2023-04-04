const mongoose = require('mongoose');

const stat = mongoose.Schema({
    type: String,
    date: String,
    data: {type: Number, default: 0}
})
module.exports = mongoose.model('stat', stat);