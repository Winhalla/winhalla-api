const { Router } = require('express');
const router = Router();
const poll = require('../models/poll')
const notLoggedIn = require('../utils/notLoggedIn')
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
router.post('/pollresponse', async (req, res) => {
    if (!req.user) return notLoggedIn(res)
    const {name,answer} = req.query
    // Find all unanswered polls
    const unansweredPolls = await poll.find({ participants: { $not: { $elemMatch: { $eq: req.user.id } } } }, { name: 1, isMCQ: 1, options: 1 })
    // Try to find the poll given in the request in unanswered polls
    const foundPoll = unansweredPolls.find(e => e.name == name)
    if (foundPoll) {
        // Error handling
        if (!answer) return res.status(400).send('No answer chosen')
        // Handle MCQ polls
        if (foundPoll.isMCQ) {
            await poll.updateOne({name, "answers.id": parseInt(answer) }, { $push: { participants: req.user.id }, $inc: { "answers.$.nb": 1 , totalAnswers:1} })
        // Open question polls
        } else {
            await poll.updateOne({ name }, { $push: { participants: req.user.id, answers: answer }, $inc:{totalAnswers:1}})
        }
    } else return res.status(404).send('Poll not found or already answered')
    res.send('OK')
})
// Get a random poll from those available and unanswered
router.get('/getpoll', async (req, res) => {
    if (!req.user) return res.sendStatus(404)
    let chosenPoll;
    // Find unanswered and active polls
    const possiblePolls = await poll.find({ participants: { $not: { $elemMatch: { $eq: req.user.id } } } }, { participants: 0, answers: 0, _id: 0 })
    if (possiblePolls.length > 0) chosenPoll = possiblePolls[getRandomInt(possiblePolls.length)]
    res.send(chosenPoll)
})

module.exports = router