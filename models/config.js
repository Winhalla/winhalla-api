const mongoose = require('mongoose');

const config = mongoose.Schema({
    name:String,
    value:Object
        
})
module.exports = mongoose.model('config',config);