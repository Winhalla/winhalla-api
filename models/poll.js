const mongoose = require('mongoose');

const pollSchema = mongoose.Schema({   
    name:String,
    description:String,
    options:Array,
    isMCQ:Boolean,
    participants:{type:Array,default:[]},
    answers:Object,
    totalAnswers: {type: Number,default:0},
})

module.exports = mongoose.model('poll', pollSchema);
