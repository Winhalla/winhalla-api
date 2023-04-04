const mongoose = require('mongoose');

const link = mongoose.Schema({
    _id:String,
    parent:{
        name:String,
        id:String,
        earned:Number
    },
    childs:[{
        name:String,
        id:String,
        joined:Number
    }]
})
module.exports = mongoose.model('link', link);